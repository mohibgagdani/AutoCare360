import crypto from 'node:crypto';
import { MaintenanceTask, MaintenanceCategory, Vehicle, Expense, Reminder } from '../models/index.js';
import { TASK_STATUS } from '../constants/enums.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { getPagination, buildPageMeta, parseSort } from '../utils/pagination.js';
import { toObjectId, isObjectId } from '../utils/helpers.js';
import { buildTaskFilter, TASK_SORTS } from '../services/queryFilters.js';
import { evaluateTask } from '../services/maintenanceEngine.js';
import {
  buildOccurrence,
  completeTask as completeTaskService,
  skipTask as skipTaskService,
  rescheduleTask as rescheduleTaskService,
  recalculateDue,
  refreshVehicle,
  refreshUserIfStale,
} from '../services/scheduleService.js';

const VEHICLE_FIELDS = { make: 1, model: 1, nickname: 1, registrationNumber: 1, odometer: 1, color: 1, vehicleType: 1, fuelType: 1 };

const findOwnedTask = async (req) => {
  if (!isObjectId(req.params.id)) throw ApiError.notFound('Maintenance item');
  const task = await MaintenanceTask.findOne({ _id: req.params.id, owner: req.user._id });
  if (!task) throw ApiError.notFound('Maintenance item');
  return task;
};

const withEvaluation = (task, now = new Date()) => {
  if (!task.isOpen || !task.vehicle) return task;
  const e = evaluateTask(task, { currentOdometer: task.vehicle.odometer, now });
  return { ...task, daysLeft: e.daysLeft, kmLeft: e.kmLeft, progress: e.progress };
};

export const listTasks = asyncHandler(async (req, res) => {
  await refreshUserIfStale(req.user);
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 15, maxLimit: 100 });
  const filter = buildTaskFilter(req.user._id, req.query);
  const sortKey = req.query.sort || (filter.isOpen === false ? '-completedAt' : 'urgency');

  const lookups = [
    { $lookup: { from: 'vehicles', localField: 'vehicle', foreignField: '_id', as: 'vehicle', pipeline: [{ $project: VEHICLE_FIELDS }] } },
    { $unwind: '$vehicle' },
    {
      $lookup: {
        from: 'maintenancecategories',
        localField: 'category',
        foreignField: '_id',
        as: 'category',
        pipeline: [{ $project: { name: 1, code: 1, icon: 1, color: 1 } }],
      },
    },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
  ];

  let sortStage;
  if (sortKey === 'urgency') {
    sortStage = [
      {
        $addFields: {
          _rank: {
            $switch: {
              branches: [
                { case: { $eq: ['$status', TASK_STATUS.OVERDUE] }, then: 0 },
                { case: { $eq: ['$status', TASK_STATUS.DUE] }, then: 1 },
                { case: { $eq: ['$status', TASK_STATUS.DUE_SOON] }, then: 2 },
                { case: { $eq: ['$status', TASK_STATUS.UP_TO_DATE] }, then: 3 },
              ],
              default: 4,
            },
          },
          _priority: {
            $switch: {
              branches: [
                { case: { $eq: ['$priority', 'critical'] }, then: 0 },
                { case: { $eq: ['$priority', 'high'] }, then: 1 },
                { case: { $eq: ['$priority', 'medium'] }, then: 2 },
              ],
              default: 3,
            },
          },
          _due: { $ifNull: ['$nextDueDate', new Date('9999-12-31')] },
        },
      },
      { $sort: { _rank: 1, _due: 1, _priority: 1, _id: 1 } },
    ];
  } else {
    sortStage = [{ $sort: parseSort(sortKey, TASK_SORTS, 'nextDueDate') }];
  }

  const [items, total] = await Promise.all([
    MaintenanceTask.aggregate([
      { $match: filter },
      ...sortStage,
      { $skip: skip },
      { $limit: limit },
      ...lookups,
      { $project: { _rank: 0, _due: 0, _priority: 0, __v: 0 } },
    ]),
    MaintenanceTask.countDocuments(filter),
  ]);

  const now = new Date();
  return sendSuccess(res, { data: items.map((t) => withEvaluation(t, now)), meta: buildPageMeta(total, page, limit) });
});

export const getSummary = asyncHandler(async (req, res) => {
  await refreshUserIfStale(req.user);
  const match = { owner: toObjectId(req.user._id), isOpen: true };
  if (req.query.vehicle && isObjectId(req.query.vehicle)) match.vehicle = toObjectId(req.query.vehicle);

  const [byStatus, byCategory, attentionCost] = await Promise.all([
    MaintenanceTask.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    MaintenanceTask.aggregate([
      { $match: { ...match, status: { $in: [TASK_STATUS.OVERDUE, TASK_STATUS.DUE, TASK_STATUS.DUE_SOON] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $lookup: { from: 'maintenancecategories', localField: '_id', foreignField: '_id', as: 'category' } },
      { $unwind: '$category' },
      { $project: { _id: 0, category: { _id: '$category._id', name: '$category.name', color: '$category.color', icon: '$category.icon' }, count: 1 } },
      { $sort: { count: -1 } },
    ]),
    MaintenanceTask.aggregate([
      { $match: { ...match, status: { $in: [TASK_STATUS.OVERDUE, TASK_STATUS.DUE] } } },
      { $group: { _id: null, total: { $sum: '$estimatedCost' } } },
    ]),
  ]);

  const counts = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
  return sendSuccess(res, {
    data: {
      overdue: counts.overdue || 0,
      due: counts.due || 0,
      dueSoon: counts.due_soon || 0,
      upToDate: counts.up_to_date || 0,
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      estimatedCostDue: attentionCost[0]?.total || 0,
      byCategory,
    },
  });
});

export const getTask = asyncHandler(async (req, res) => {
  const task = await findOwnedTask(req);
  await task.populate([
    { path: 'vehicle', select: Object.keys(VEHICLE_FIELDS).join(' ') },
    { path: 'category', select: 'name code icon color' },
    { path: 'serviceRecord', select: 'serviceDate serviceCenter totalCost' },
    { path: 'template', select: 'name intervalKm intervalMonths makes models' },
  ]);
  const history = await MaintenanceTask.find({
    vehicle: task.vehicle._id,
    code: task.code,
    _id: { $ne: task._id },
    status: { $in: [TASK_STATUS.COMPLETED, TASK_STATUS.SKIPPED] },
  })
    .sort({ completedAt: -1, skippedAt: -1 })
    .limit(20)
    .select('status completedAt completedOdometer skippedAt skipReason actualCost notes serviceRecord')
    .populate('serviceRecord', 'serviceCenter')
    .lean();
  return sendSuccess(res, { data: { ...withEvaluation(task.toObject()), history } });
});

export const createTask = asyncHandler(async (req, res) => {
  const { vehicle: vehicleId, nextDueDate, nextDueOdometer, lastPerformedDate, lastPerformedOdometer, ...fields } = req.body;
  const vehicle = await Vehicle.findOne({ _id: vehicleId, owner: req.user._id });
  if (!vehicle) throw ApiError.notFound('Vehicle');
  const category = await MaintenanceCategory.exists({ _id: fields.category });
  if (!category) throw ApiError.validation([{ field: 'category', message: 'Select a valid category' }]);

  const now = new Date();
  const hasInterval = Boolean(fields.intervalKm || fields.intervalMonths);
  const draft = buildOccurrence(
    {
      ...fields,
      code: `CUSTOM_${crypto.randomBytes(5).toString('hex').toUpperCase()}`,
      isCustom: true,
      isRecurring: fields.isRecurring ?? hasInterval,
      template: null,
    },
    {
      vehicle,
      lastDate: lastPerformedDate || (hasInterval ? now : null),
      lastOdometer: lastPerformedOdometer ?? (hasInterval ? vehicle.odometer : null),
      now,
    }
  );
  if (nextDueDate) draft.nextDueDate = nextDueDate;
  if (nextDueOdometer) draft.nextDueOdometer = nextDueOdometer;
  const evaluation = evaluateTask(draft, { currentOdometer: vehicle.odometer, now });
  const task = await MaintenanceTask.create({ ...draft, status: evaluation.status, dueBy: evaluation.dueBy });
  await refreshVehicle(vehicle._id);
  return sendSuccess(res, { status: 201, message: 'Maintenance item added', data: task });
});

export const updateTask = asyncHandler(async (req, res) => {
  const task = await findOwnedTask(req);
  const { nextDueDate, nextDueOdometer, ...fields } = req.body;
  if (fields.category) {
    const exists = await MaintenanceCategory.exists({ _id: fields.category });
    if (!exists) throw ApiError.validation([{ field: 'category', message: 'Select a valid category' }]);
  }

  const scheduleFields = ['intervalKm', 'intervalMonths', 'lastPerformedDate', 'lastPerformedOdometer'];
  const scheduleChanged = scheduleFields.some((f) => f in fields && String(fields[f]) !== String(task[f]));
  Object.assign(task, fields);

  if (task.isOpen) {
    if (nextDueDate !== undefined || nextDueOdometer !== undefined) {
      if (nextDueDate !== undefined) task.nextDueDate = nextDueDate;
      if (nextDueOdometer !== undefined) task.nextDueOdometer = nextDueOdometer;
      task.isRescheduled = true;
    } else if (scheduleChanged) {
      task.isRescheduled = false;
      recalculateDue(task);
    }
    const vehicle = await Vehicle.findById(task.vehicle).select('odometer');
    const e = evaluateTask(task, { currentOdometer: vehicle.odometer });
    task.status = e.status;
    task.dueBy = e.dueBy;
  }
  await task.save();
  await refreshVehicle(task.vehicle);
  return sendSuccess(res, { message: 'Maintenance item updated', data: task });
});

export const completeTask = asyncHandler(async (req, res) => {
  const task = await findOwnedTask(req);
  const { date, odometer, cost, notes, logExpense } = req.body;
  const result = await completeTaskService(task, { date, odometer, cost, notes });

  if (logExpense && cost > 0) {
    await Expense.create({
      owner: req.user._id,
      vehicle: task.vehicle,
      category: 'maintenance',
      amount: cost,
      date: date || new Date(),
      odometer: result.completed.completedOdometer,
      description: task.name,
      notes,
    });
  }
  return sendSuccess(res, {
    message: `${task.name} marked as completed${result.next ? ' · next occurrence scheduled' : ''}`,
    data: result,
  });
});

export const skipTask = asyncHandler(async (req, res) => {
  const task = await findOwnedTask(req);
  const result = await skipTaskService(task, { reason: req.body.reason });
  return sendSuccess(res, { message: `${task.name} skipped`, data: result });
});

export const rescheduleTask = asyncHandler(async (req, res) => {
  const task = await findOwnedTask(req);
  const updated = await rescheduleTaskService(task, req.body);
  return sendSuccess(res, { message: `${task.name} rescheduled`, data: updated });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const task = await findOwnedTask(req);
  // Removing a scheduled (template) item excludes it from future syncs for this vehicle.
  if (task.isOpen && !task.isCustom) {
    await Vehicle.updateOne({ _id: task.vehicle }, { $addToSet: { excludedMaintenanceCodes: task.code } });
  }
  await Promise.all([task.deleteOne(), Reminder.deleteMany({ task: task._id })]);
  await refreshVehicle(task.vehicle, { notifyAlerts: false });
  return sendSuccess(res, { message: 'Maintenance item deleted' });
});
