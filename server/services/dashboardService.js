import { Vehicle, VehicleType, MaintenanceTask, Expense, ServiceRecord, Document, Reminder } from '../models/index.js';
import { TASK_STATUS } from '../constants/enums.js';
import { evaluateTask, statusRank } from './maintenanceEngine.js';
import { APP_TIMEZONE, addDays, lastMonthKeys, startOfDay, startOfMonth } from '../utils/dates.js';
import { round, toObjectId } from '../utils/helpers.js';

const MAINTENANCE_CATEGORIES = ['maintenance', 'repairs', 'parts', 'tyres'];
const ENERGY_CATEGORIES = ['fuel', 'charging'];
const monthExpr = (field) => ({ $dateToString: { format: '%Y-%m', date: field, timezone: APP_TIMEZONE } });

const vehicleName = (v) => (v ? v.nickname || `${v.make} ${v.model}` : 'Vehicle');

/** Km driven per month for each vehicle, derived from odometer logs. */
function buildMileageTrend(vehicles, keys) {
  const series = [];
  const rows = keys.map((k) => ({ month: k }));
  for (const v of vehicles) {
    if (v.usageUnit === 'hours' || !v.odometerLogs?.length) continue;
    const logs = [...v.odometerLogs].sort((a, b) => new Date(a.date) - new Date(b.date));
    const readingAtEndOf = (key) => {
      const [y, m] = key.split('-').map(Number);
      const end = new Date(y, m, 1);
      let value = null;
      for (const l of logs) {
        if (new Date(l.date) < end) value = value === null ? l.value : Math.max(value, l.value);
      }
      return value;
    };
    const [fy, fm] = keys[0].split('-').map(Number);
    let prev = readingAtEndOf(`${fm === 1 ? fy - 1 : fy}-${String(fm === 1 ? 12 : fm - 1).padStart(2, '0')}`);
    let hasData = false;
    keys.forEach((key, i) => {
      const reading = readingAtEndOf(key);
      const km = reading !== null && prev !== null ? Math.max(0, reading - prev) : 0;
      if (km > 0) hasData = true;
      rows[i][String(v._id)] = km;
      if (reading !== null) prev = reading;
    });
    if (hasData) series.push({ key: String(v._id), name: vehicleName(v), color: v.color });
  }
  return { series: series.slice(0, 6), data: rows };
}

export async function getDashboard(ownerId, now = new Date()) {
  const owner = toObjectId(ownerId);
  const monthStart = startOfMonth(now);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const keys12 = lastMonthKeys(12, now);
  const keys6 = lastMonthKeys(6, now);

  const [
    vehicles,
    taskCounts,
    expenseTotals,
    monthlyExpenses,
    expensesByVehicle,
    expensesByCategory,
    serviceStats,
    serviceMonthly,
    completionTrend,
    attentionTasks,
    recentServices,
    recentExpenses,
    recentCompletions,
    documents,
    overdueReminders,
  ] = await Promise.all([
    Vehicle.find({ owner, status: 'active' })
      .select('make model nickname registrationNumber vehicleType fuelType odometer healthScore healthLabel nextService openTaskCounts color image year odometerLogs')
      .lean(),
    MaintenanceTask.aggregate([{ $match: { owner, isOpen: true } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Expense.aggregate([
      { $match: { owner } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 },
          currentMonth: { $sum: { $cond: [{ $gte: ['$date', monthStart] }, '$amount', 0] } },
          previousMonth: {
            $sum: { $cond: [{ $and: [{ $gte: ['$date', prevMonthStart] }, { $lt: ['$date', monthStart] }] }, '$amount', 0] },
          },
        },
      },
    ]),
    Expense.aggregate([
      { $match: { owner, date: { $gte: yearAgo } } },
      { $group: { _id: { month: monthExpr('$date'), category: '$category' }, total: { $sum: '$amount' } } },
    ]),
    Expense.aggregate([
      { $match: { owner, date: { $gte: yearAgo } } },
      { $group: { _id: '$vehicle', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),
    Expense.aggregate([
      { $match: { owner, date: { $gte: yearAgo } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } },
    ]),
    ServiceRecord.aggregate([
      { $match: { owner } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$totalCost' }, avg: { $avg: '$totalCost' } } },
    ]),
    ServiceRecord.aggregate([
      { $match: { owner, serviceDate: { $gte: yearAgo } } },
      { $group: { _id: monthExpr('$serviceDate'), total: { $sum: '$totalCost' }, count: { $sum: 1 } } },
    ]),
    MaintenanceTask.aggregate([
      {
        $match: {
          owner,
          $or: [
            { status: TASK_STATUS.COMPLETED, completedAt: { $gte: sixMonthsAgo } },
            { status: TASK_STATUS.SKIPPED, skippedAt: { $gte: sixMonthsAgo } },
          ],
        },
      },
      {
        $project: {
          status: 1,
          month: monthExpr({ $ifNull: ['$completedAt', '$skippedAt'] }),
          // On time = within the "due" window: up to 7 days or 5% of the distance interval late.
          onTime: {
            $and: [
              { $eq: ['$status', TASK_STATUS.COMPLETED] },
              {
                $or: [
                  { $eq: [{ $ifNull: ['$nextDueDate', null] }, null] },
                  { $lte: ['$completedAt', { $add: ['$nextDueDate', 7 * 86400000] }] },
                ],
              },
              {
                $or: [
                  { $eq: [{ $ifNull: ['$nextDueOdometer', null] }, null] },
                  {
                    $lte: [
                      '$completedOdometer',
                      { $add: ['$nextDueOdometer', { $max: [100, { $multiply: [{ $ifNull: ['$intervalKm', 0] }, 0.05] }] }] },
                    ],
                  },
                ],
              },
            ],
          },
        },
      },
      {
        $group: {
          _id: '$month',
          completed: { $sum: { $cond: [{ $eq: ['$status', TASK_STATUS.COMPLETED] }, 1, 0] } },
          skipped: { $sum: { $cond: [{ $eq: ['$status', TASK_STATUS.SKIPPED] }, 1, 0] } },
          onTime: { $sum: { $cond: ['$onTime', 1, 0] } },
        },
      },
    ]),
    MaintenanceTask.find({ owner, isOpen: true, status: { $in: [TASK_STATUS.OVERDUE, TASK_STATUS.DUE, TASK_STATUS.DUE_SOON] } })
      .populate('vehicle', 'make model nickname registrationNumber odometer color vehicleType status')
      .populate('category', 'name code icon color')
      .lean(),
    ServiceRecord.find({ owner })
      .sort({ serviceDate: -1 })
      .limit(6)
      .populate('vehicle', 'make model nickname registrationNumber color')
      .select('serviceDate serviceType serviceCenter totalCost vehicle maintenanceItems')
      .lean(),
    Expense.find({ owner, serviceRecord: null })
      .sort({ date: -1 })
      .limit(6)
      .populate('vehicle', 'make model nickname registrationNumber color')
      .select('date category amount description vendor vehicle')
      .lean(),
    MaintenanceTask.find({ owner, status: TASK_STATUS.COMPLETED, serviceRecord: null })
      .sort({ completedAt: -1 })
      .limit(6)
      .populate('vehicle', 'make model nickname registrationNumber color')
      .select('name completedAt actualCost vehicle')
      .lean(),
    Document.find({ owner, expiryDate: { $ne: null, $lte: addDays(now, 45) } })
      .sort({ expiryDate: 1 })
      .limit(10)
      .populate('vehicle', 'make model nickname registrationNumber')
      .select('name type expiryDate vehicle reminderDaysBefore')
      .lean(),
    Reminder.countDocuments({ owner, status: 'active', dueDate: { $lt: startOfDay(now) } }),
  ]);

  const hourMeterTypes = new Set(
    (await VehicleType.find({ usageUnit: 'hours' }).select('code').lean()).map((t) => t.code)
  );
  const vehicleMap = new Map(vehicles.map((v) => [String(v._id), v]));
  const counts = Object.fromEntries(taskCounts.map((c) => [c._id, c.count]));
  const totals = expenseTotals[0] || { total: 0, count: 0, currentMonth: 0, previousMonth: 0 };

  // Monthly expenses (12 months) split into energy / maintenance / other.
  const monthly = new Map(keys12.map((k) => [k, { month: k, total: 0, energy: 0, maintenance: 0, other: 0 }]));
  for (const row of monthlyExpenses) {
    const entry = monthly.get(row._id.month);
    if (!entry) continue;
    const bucket = ENERGY_CATEGORIES.includes(row._id.category)
      ? 'energy'
      : MAINTENANCE_CATEGORIES.includes(row._id.category)
        ? 'maintenance'
        : 'other';
    entry[bucket] = round(entry[bucket] + row.total);
    entry.total = round(entry.total + row.total);
  }

  // Cost trend: service spend per month + cumulative ownership cost over the window.
  const serviceByMonth = new Map(serviceMonthly.map((r) => [r._id, r]));
  let cumulative = 0;
  const costTrend = [...monthly.values()].map((m) => {
    cumulative += m.total;
    const s = serviceByMonth.get(m.month);
    return {
      month: m.month,
      serviceCost: round(s?.total || 0),
      services: s?.count || 0,
      cumulative: round(cumulative),
    };
  });

  const completionByMonth = new Map(completionTrend.map((r) => [r._id, r]));
  const completion = keys6.map((k) => {
    const r = completionByMonth.get(k);
    return {
      month: k,
      completed: r?.completed || 0,
      onTime: r?.onTime || 0,
      late: Math.max(0, (r?.completed || 0) - (r?.onTime || 0)),
      skipped: r?.skipped || 0,
    };
  });

  // Upcoming timeline: most urgent first, interleaved across vehicles so one
  // neglected vehicle doesn't crowd out everything else.
  const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };
  const ranked = attentionTasks
    .filter((t) => t.vehicle && t.vehicle.status === 'active')
    .map((t) => {
      const e = evaluateTask(t, { currentOdometer: t.vehicle.odometer, now });
      return { ...t, daysLeft: e.daysLeft, kmLeft: e.kmLeft, progress: e.progress };
    })
    .sort(
      (a, b) =>
        statusRank(b.status) - statusRank(a.status) ||
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        (a.daysLeft ?? 9999) - (b.daysLeft ?? 9999) ||
        (a.kmLeft ?? 99999) - (b.kmLeft ?? 99999)
    );
  const queues = new Map();
  for (const t of ranked) {
    const key = String(t.vehicle._id);
    if (!queues.has(key)) queues.set(key, []);
    queues.get(key).push(t);
  }
  const upcoming = [];
  while (upcoming.length < 8 && [...queues.values()].some((q) => q.length)) {
    for (const q of queues.values()) {
      if (q.length && upcoming.length < 8) upcoming.push(q.shift());
    }
  }
  upcoming.sort((a, b) => statusRank(b.status) - statusRank(a.status));

  const recentActivity = [
    ...recentServices.map((s) => ({
      type: 'service',
      id: s._id,
      title: `${s.serviceCenter ? `Serviced at ${s.serviceCenter}` : 'Service recorded'}`,
      subtitle: `${s.maintenanceItems?.length || 0} item${s.maintenanceItems?.length === 1 ? '' : 's'}`,
      date: s.serviceDate,
      amount: s.totalCost,
      vehicle: s.vehicle,
    })),
    ...recentExpenses.map((e) => ({
      type: 'expense',
      id: e._id,
      title: e.description || e.category,
      subtitle: e.vendor || e.category,
      category: e.category,
      date: e.date,
      amount: e.amount,
      vehicle: e.vehicle,
    })),
    ...recentCompletions.map((t) => ({
      type: 'maintenance',
      id: t._id,
      title: `${t.name} completed`,
      subtitle: 'Maintenance',
      date: t.completedAt,
      amount: t.actualCost,
      vehicle: t.vehicle,
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  const today = startOfDay(now);
  const alerts = [];
  const overdueByVehicle = vehicles.filter((v) => v.openTaskCounts?.overdue > 0);
  for (const v of overdueByVehicle.slice(0, 4)) {
    alerts.push({
      type: 'maintenance',
      severity: 'critical',
      title: `${v.openTaskCounts.overdue} overdue item${v.openTaskCounts.overdue > 1 ? 's' : ''} on ${vehicleName(v)}`,
      message: v.nextService?.name ? `Most urgent: ${v.nextService.name}` : 'Service required',
      link: `/app/vehicles/${v._id}?tab=maintenance`,
    });
  }
  for (const d of documents) {
    const expired = new Date(d.expiryDate) < today;
    const days = Math.round((startOfDay(d.expiryDate) - today) / 86400000);
    if (!expired && days > (d.reminderDaysBefore || 30)) continue;
    alerts.push({
      type: 'document',
      severity: expired ? 'critical' : days <= 7 ? 'warning' : 'info',
      title: expired ? `${d.name} has expired` : `${d.name} expires in ${days} day${days === 1 ? '' : 's'}`,
      message: d.vehicle ? `${vehicleName(d.vehicle)} · ${d.vehicle.registrationNumber}` : 'Personal document',
      link: '/app/documents',
    });
  }
  if (overdueReminders > 0) {
    alerts.push({
      type: 'reminder',
      severity: 'warning',
      title: `${overdueReminders} reminder${overdueReminders > 1 ? 's' : ''} past due`,
      message: 'Review and complete or reschedule them',
      link: '/app/reminders?status=overdue',
    });
  }
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const avgHealth = vehicles.length ? Math.round(vehicles.reduce((s, v) => s + (v.healthScore ?? 100), 0) / vehicles.length) : null;
  const monthChange = totals.previousMonth
    ? round(((totals.currentMonth - totals.previousMonth) / totals.previousMonth) * 100, 1)
    : null;

  return {
    stats: {
      totalVehicles: vehicles.length,
      vehiclesNeedingMaintenance: vehicles.filter((v) => (v.openTaskCounts?.overdue || 0) + (v.openTaskCounts?.due || 0) > 0).length,
      overdueMaintenance: counts[TASK_STATUS.OVERDUE] || 0,
      dueMaintenance: counts[TASK_STATUS.DUE] || 0,
      upcomingMaintenance: (counts[TASK_STATUS.DUE_SOON] || 0) + (counts[TASK_STATUS.DUE] || 0),
      upToDate: counts[TASK_STATUS.UP_TO_DATE] || 0,
      totalSpending: round(totals.total),
      currentMonthSpending: round(totals.currentMonth),
      previousMonthSpending: round(totals.previousMonth),
      monthOverMonthChange: monthChange,
      totalServiceRecords: serviceStats[0]?.count || 0,
      averageMaintenanceCost: round(serviceStats[0]?.avg || 0),
      totalServiceSpend: round(serviceStats[0]?.total || 0),
      averageHealthScore: avgHealth,
    },
    charts: {
      monthlyExpenses: [...monthly.values()],
      expensesByVehicle: expensesByVehicle.map((r) => {
        const v = vehicleMap.get(String(r._id));
        return { vehicleId: r._id, name: v ? vehicleName(v) : 'Archived vehicle', color: v?.color, total: round(r.total) };
      }),
      expensesByCategory: expensesByCategory.map((r) => ({ category: r._id, total: round(r.total) })),
      completionTrend: completion,
      costTrend,
      mileageTrend: buildMileageTrend(
        vehicles.map((v) => ({ ...v, usageUnit: hourMeterTypes.has(v.vehicleType) ? 'hours' : 'km' })),
        keys6
      ),
    },
    upcoming,
    alerts: alerts.slice(0, 8),
    recentActivity,
    vehicles: vehicles
      .map(({ odometerLogs, ...v }) => v)
      .sort((a, b) => (a.healthScore ?? 100) - (b.healthScore ?? 100)),
  };
}
