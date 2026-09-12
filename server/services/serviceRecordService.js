import { ServiceRecord, Expense, MaintenanceTask, Vehicle } from '../models/index.js';
import { completeTask, refreshVehicle, recordOdometer } from './scheduleService.js';
import { uploadFile, uploadFiles, deleteFile, deleteFiles } from './storageService.js';
import { ApiError } from '../utils/ApiError.js';

const SERVICE_TYPE_LABEL = {
  periodic_service: 'Periodic service',
  repair: 'Repair',
  inspection: 'Inspection',
  breakdown: 'Breakdown repair',
  accident_repair: 'Accident repair',
  warranty: 'Warranty service',
  recall: 'Recall service',
  tyre_service: 'Tyre service',
  other: 'Service',
};

const expenseCategoryFor = (serviceType) => {
  if (['repair', 'breakdown', 'accident_repair'].includes(serviceType)) return 'repairs';
  if (serviceType === 'tyre_service') return 'tyres';
  return 'maintenance';
};

export async function findOwnedVehicle(owner, vehicleId, select) {
  const query = Vehicle.findOne({ _id: vehicleId, owner });
  if (select) query.select(select);
  const vehicle = await query;
  if (!vehicle) throw ApiError.notFound('Vehicle');
  return vehicle;
}

async function recomputeLastService(vehicleId) {
  const latest = await ServiceRecord.findOne({ vehicle: vehicleId }).sort({ serviceDate: -1 }).select('serviceDate odometer').lean();
  await Vehicle.updateOne(
    { _id: vehicleId },
    latest
      ? { $set: { lastServiceDate: latest.serviceDate, lastServiceOdometer: latest.odometer } }
      : { $unset: { lastServiceDate: 1, lastServiceOdometer: 1 } }
  );
}

/** Creates, updates or removes the expense mirrored from a service record. */
async function syncExpense(record, { paymentMethod } = {}) {
  const description = `${SERVICE_TYPE_LABEL[record.serviceType] || 'Service'}${record.serviceCenter ? ` · ${record.serviceCenter}` : ''}`;
  if (record.totalCost > 0) {
    const payload = {
      owner: record.owner,
      vehicle: record.vehicle,
      category: expenseCategoryFor(record.serviceType),
      amount: record.totalCost,
      date: record.serviceDate,
      odometer: record.odometer,
      description,
      vendor: record.serviceCenter,
      serviceRecord: record._id,
    };
    if (paymentMethod) payload.paymentMethod = paymentMethod;
    if (record.expense) {
      const updated = await Expense.findOneAndUpdate({ _id: record.expense }, { $set: payload }, { returnDocument: 'after' });
      if (updated) return updated._id;
    }
    const expense = await Expense.create(payload);
    return expense._id;
  }
  if (record.expense) await Expense.deleteOne({ _id: record.expense });
  return null;
}

/** Resolves selected open tasks and free-text items into service line items. */
async function resolveItems(vehicleId, items = []) {
  const taskIds = items.filter((i) => i.task).map((i) => i.task);
  const tasks = taskIds.length
    ? await MaintenanceTask.find({ _id: { $in: taskIds }, vehicle: vehicleId })
    : [];
  const taskMap = new Map(tasks.map((t) => [String(t._id), t]));
  const resolved = items.map((item) => {
    const task = item.task ? taskMap.get(String(item.task)) : null;
    return task
      ? { task: task._id, code: task.code, name: task.name, category: task.category }
      : { task: null, code: item.code || undefined, name: item.name, category: item.category || null };
  });
  return { resolved, openTasks: tasks.filter((t) => t.isOpen) };
}

export async function createServiceRecord(owner, data, files = {}) {
  const vehicle = await findOwnedVehicle(owner, data.vehicle);
  const { paymentMethod, maintenanceItems = [], ...fields } = data;
  const { resolved, openTasks } = await resolveItems(vehicle._id, maintenanceItems);

  const [invoice, photos] = await Promise.all([
    files.invoice?.[0] ? uploadFile(files.invoice[0], 'invoices') : null,
    files.photos?.length ? uploadFiles(files.photos, 'service-photos') : [],
  ]);

  const record = new ServiceRecord({
    ...fields,
    owner,
    vehicle: vehicle._id,
    maintenanceItems: resolved,
    ...(invoice ? { invoice } : {}),
    photos,
  });
  await record.save();

  // Distribute labour + parts across completed items for per-item cost history.
  const perItemCost = openTasks.length ? Math.round((record.totalCost / openTasks.length) * 100) / 100 : undefined;
  for (const task of openTasks) {
    await completeTask(task, {
      date: record.serviceDate,
      odometer: record.odometer,
      cost: perItemCost,
      serviceRecord: record._id,
      refresh: false,
    });
  }

  record.expense = await syncExpense(record, { paymentMethod });
  await record.save();

  await recordOdometer(vehicle, record.odometer, { date: record.serviceDate, source: 'service' });
  await recomputeLastService(vehicle._id);
  await refreshVehicle(vehicle._id);
  return record;
}

export async function updateServiceRecord(owner, id, data, files = {}) {
  const record = await ServiceRecord.findOne({ _id: id, owner });
  if (!record) throw ApiError.notFound('Service record');
  const { paymentMethod, maintenanceItems, vehicle: _ignoredVehicle, ...fields } = data;

  Object.assign(record, fields);

  let newlyCompleted = [];
  if (maintenanceItems) {
    const { resolved, openTasks } = await resolveItems(record.vehicle, maintenanceItems);
    record.maintenanceItems = resolved;
    newlyCompleted = openTasks;
  }

  if (files.invoice?.[0]) {
    const previous = record.invoice;
    record.invoice = await uploadFile(files.invoice[0], 'invoices');
    if (previous) await deleteFile(previous);
  }
  if (files.photos?.length) {
    const added = await uploadFiles(files.photos, 'service-photos');
    record.photos.push(...added);
  }
  await record.save();

  for (const task of newlyCompleted) {
    await completeTask(task, { date: record.serviceDate, odometer: record.odometer, serviceRecord: record._id, refresh: false });
  }
  // Keep completion history aligned with the edited service date/odometer.
  await MaintenanceTask.updateMany(
    { serviceRecord: record._id, status: 'completed' },
    { $set: { completedAt: record.serviceDate, completedOdometer: record.odometer } }
  );

  record.expense = await syncExpense(record, { paymentMethod });
  await record.save();

  const vehicle = await Vehicle.findById(record.vehicle);
  await recordOdometer(vehicle, record.odometer, { date: record.serviceDate, source: 'service' });
  await recomputeLastService(record.vehicle);
  await refreshVehicle(record.vehicle);
  return record;
}

export async function deleteServiceRecord(owner, id) {
  const record = await ServiceRecord.findOne({ _id: id, owner });
  if (!record) throw ApiError.notFound('Service record');

  await Promise.all([
    record.expense ? Expense.deleteOne({ _id: record.expense }) : null,
    // Completed items remain part of the maintenance history, just unlinked.
    MaintenanceTask.updateMany({ serviceRecord: record._id }, { $set: { serviceRecord: null } }),
    deleteFiles([record.invoice, ...record.photos]),
  ]);
  await record.deleteOne();
  await recomputeLastService(record.vehicle);
  await refreshVehicle(record.vehicle, { notifyAlerts: false });
  return record;
}

export async function removeServicePhoto(owner, id, photoId) {
  const record = await ServiceRecord.findOne({ _id: id, owner });
  if (!record) throw ApiError.notFound('Service record');
  const photo = record.photos.id(photoId);
  if (!photo) throw ApiError.notFound('Photo');
  await deleteFile(photo);
  photo.deleteOne();
  await record.save();
  return record;
}

export { SERVICE_TYPE_LABEL };
