import {
  Vehicle,
  VehicleType,
  FuelType,
  MaintenanceTask,
  ServiceRecord,
  Expense,
  Document,
  Reminder,
  Notification,
} from '../models/index.js';
import { TASK_STATUS } from '../constants/enums.js';
import { evaluateTask, statusRank } from './maintenanceEngine.js';
import { deleteFiles } from './storageService.js';
import { ApiError } from '../utils/ApiError.js';
import { addDays, startOfDay, diffInDays } from '../utils/dates.js';
import { round } from '../utils/helpers.js';

/** Validates the catalog references of a vehicle payload. */
export async function assertValidCatalog({ vehicleType, fuelType, secondaryFuelType }) {
  const errors = [];
  const [type, fuel, secondary] = await Promise.all([
    vehicleType ? VehicleType.findOne({ code: vehicleType, isActive: true }).lean() : null,
    fuelType ? FuelType.findOne({ code: fuelType, isActive: true }).lean() : null,
    secondaryFuelType ? FuelType.findOne({ code: secondaryFuelType, isActive: true }).lean() : null,
  ]);
  if (vehicleType && !type) errors.push({ field: 'vehicleType', message: 'Select a valid vehicle type' });
  if (fuelType && !fuel) errors.push({ field: 'fuelType', message: 'Select a valid fuel type' });
  if (secondaryFuelType && !secondary) errors.push({ field: 'secondaryFuelType', message: 'Select a valid secondary fuel' });
  if (type?.allowedFuelTypes?.length && fuelType && !type.allowedFuelTypes.includes(fuelType)) {
    errors.push({ field: 'fuelType', message: `${type.name} supports: ${type.allowedFuelTypes.join(', ')}` });
  }
  if (errors.length) throw ApiError.validation(errors, 'Invalid vehicle data');
  return { type, fuel };
}

/** Average usage per day from the odometer log (km/day or hours/day). */
export function averageDailyUsage(vehicle) {
  const logs = [...(vehicle.odometerLogs || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
  if (logs.length < 2) return null;
  const first = logs[0];
  const last = logs[logs.length - 1];
  const days = Math.max(1, diffInDays(last.date, first.date));
  const usage = (last.value - first.value) / days;
  return usage > 0 ? round(usage, 1) : null;
}

/** Aggregated data for the vehicle detail "Overview" tab. */
export async function getVehicleOverview(vehicle, now = new Date()) {
  const [openTasks, serviceAgg, expenseAgg, expenseByCategory, recentServices, recentExpenses, recentTasks, documents, reminders, type, fuel] =
    await Promise.all([
      MaintenanceTask.find({ vehicle: vehicle._id, isOpen: true }).populate('category', 'name code icon color').lean(),
      ServiceRecord.aggregate([
        { $match: { vehicle: vehicle._id } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totalCost' }, avg: { $avg: '$totalCost' } } },
      ]),
      Expense.aggregate([
        { $match: { vehicle: vehicle._id } },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Expense.aggregate([
        { $match: { vehicle: vehicle._id } },
        { $group: { _id: '$category', total: { $sum: '$amount' } } },
        { $sort: { total: -1 } },
      ]),
      ServiceRecord.find({ vehicle: vehicle._id }).sort({ serviceDate: -1 }).limit(5).select('serviceDate serviceCenter totalCost serviceType maintenanceItems odometer').lean(),
      Expense.find({ vehicle: vehicle._id, serviceRecord: null }).sort({ date: -1 }).limit(5).select('date category amount description vendor').lean(),
      MaintenanceTask.find({ vehicle: vehicle._id, status: { $in: [TASK_STATUS.COMPLETED, TASK_STATUS.SKIPPED] } })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('name status completedAt skippedAt actualCost')
        .lean(),
      Document.find({ vehicle: vehicle._id }).select('name type expiryDate reminderDaysBefore').lean(),
      Reminder.find({ vehicle: vehicle._id, status: 'active' }).sort({ dueDate: 1 }).limit(5).lean(),
      VehicleType.findOne({ code: vehicle.vehicleType }).lean(),
      FuelType.findOne({ code: vehicle.fuelType }).lean(),
    ]);

  const avgUsage = averageDailyUsage(vehicle);
  const evaluated = openTasks
    .map((t) => ({ ...t, ...evaluateTask(t, { currentOdometer: vehicle.odometer, now }) }))
    .sort((a, b) => statusRank(b.status) - statusRank(a.status) || (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999));

  const statusCounts = evaluated.reduce((acc, t) => ({ ...acc, [t.status]: (acc[t.status] || 0) + 1 }), {});
  const today = startOfDay(now);

  const alerts = [];
  for (const t of evaluated.filter((x) => x.status === TASK_STATUS.OVERDUE).slice(0, 3)) {
    alerts.push({ severity: 'critical', title: `${t.name} is overdue`, taskId: t._id });
  }
  for (const t of evaluated.filter((x) => x.status === TASK_STATUS.DUE).slice(0, 2)) {
    alerts.push({ severity: 'warning', title: `${t.name} is due now`, taskId: t._id });
  }
  for (const d of documents) {
    if (!d.expiryDate) continue;
    if (d.expiryDate < today) alerts.push({ severity: 'critical', title: `${d.name} expired`, documentId: d._id });
    else if (d.expiryDate <= addDays(now, d.reminderDaysBefore || 30)) {
      alerts.push({ severity: 'warning', title: `${d.name} expires in ${diffInDays(d.expiryDate, now)} days`, documentId: d._id });
    }
  }

  const activity = [
    ...recentServices.map((s) => ({ type: 'service', id: s._id, title: s.serviceCenter ? `Serviced at ${s.serviceCenter}` : 'Service recorded', date: s.serviceDate, amount: s.totalCost })),
    ...recentExpenses.map((e) => ({ type: 'expense', id: e._id, title: e.description || e.category, category: e.category, date: e.date, amount: e.amount })),
    ...recentTasks.map((t) => ({
      type: t.status === TASK_STATUS.SKIPPED ? 'skipped' : 'maintenance',
      id: t._id,
      title: `${t.name} ${t.status === TASK_STATUS.SKIPPED ? 'skipped' : 'completed'}`,
      date: t.completedAt || t.skippedAt,
      amount: t.actualCost,
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);

  const totalExpenses = expenseAgg[0]?.total || 0;
  const distance = Math.max(0, (vehicle.odometer || 0) - (vehicle.purchaseOdometer || 0));
  const ownershipCost = totalExpenses + (vehicle.purchasePrice || 0);

  return {
    type,
    fuel,
    health: { score: vehicle.healthScore, label: vehicle.healthLabel },
    statusCounts,
    nextMaintenance: evaluated.slice(0, 5),
    totals: {
      services: serviceAgg[0]?.count || 0,
      serviceSpend: round(serviceAgg[0]?.total || 0),
      averageServiceCost: round(serviceAgg[0]?.avg || 0),
      expenses: round(totalExpenses),
      expenseCount: expenseAgg[0]?.count || 0,
      ownershipCost: round(ownershipCost),
      runningCostPerKm: distance > 0 ? round(totalExpenses / distance) : null,
      averageDailyUsage: avgUsage,
    },
    expenseByCategory: expenseByCategory.map((c) => ({ category: c._id, total: round(c.total) })),
    alerts,
    activity,
    reminders,
  };
}

/** Removes a vehicle and everything that belongs to it. */
export async function deleteVehicleCascade(vehicle) {
  const [services, expenses, documents] = await Promise.all([
    ServiceRecord.find({ vehicle: vehicle._id }).select('invoice photos').lean(),
    Expense.find({ vehicle: vehicle._id, receipt: { $exists: true } }).select('receipt').lean(),
    Document.find({ vehicle: vehicle._id }).select('file').lean(),
  ]);
  const files = [
    vehicle.image,
    ...services.flatMap((s) => [s.invoice, ...(s.photos || [])]),
    ...expenses.map((e) => e.receipt),
    ...documents.map((d) => d.file),
  ];

  await Promise.all([
    MaintenanceTask.deleteMany({ vehicle: vehicle._id }),
    ServiceRecord.deleteMany({ vehicle: vehicle._id }),
    Expense.deleteMany({ vehicle: vehicle._id }),
    Document.deleteMany({ vehicle: vehicle._id }),
    Reminder.deleteMany({ vehicle: vehicle._id }),
    Notification.deleteMany({ vehicle: vehicle._id }),
  ]);
  await vehicle.deleteOne();
  await deleteFiles(files);
}
