import {
  User,
  Vehicle,
  VehicleType,
  FuelType,
  MaintenanceCategory,
  MaintenanceTemplate,
  MaintenanceTask,
  ServiceRecord,
  Expense,
  Document,
  Reminder,
  Notification,
} from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { getPagination, parseSort, paginate } from '../utils/pagination.js';
import { searchRegex, toList, isObjectId, toObjectId } from '../utils/helpers.js';
import { getPlatformAnalytics } from '../services/analyticsService.js';
import { revokeAllSessions } from '../services/tokenService.js';
import { deleteVehicleCascade } from '../services/vehicleService.js';
import { refreshVehicle } from '../services/scheduleService.js';
import { computeNextDue, evaluateTask } from '../services/maintenanceEngine.js';
import { notify } from '../services/notificationService.js';

// ─── Analytics ───────────────────────────────────────────────────────────────
export const analytics = asyncHandler(async (_req, res) => {
  const data = await getPlatformAnalytics();
  return sendSuccess(res, { data });
});

// ─── Users ───────────────────────────────────────────────────────────────────
export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 10 });
  const filter = {};
  if (req.query.role) filter.role = req.query.role;
  if (req.query.status === 'active') filter.isActive = true;
  if (req.query.status === 'blocked') filter.isActive = false;
  if (req.query.search) {
    const rx = searchRegex(req.query.search);
    filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
  }
  const { items, meta } = await paginate(User, filter, {
    page,
    limit,
    skip,
    sort: parseSort(req.query.sort, ['createdAt', 'name', 'email', 'lastLoginAt', 'role'], '-createdAt'),
    select: 'name email role isActive phone avatar lastLoginAt createdAt blockedReason',
  });

  const ids = items.map((u) => u._id);
  const vehicleCounts = await Vehicle.aggregate([
    { $match: { owner: { $in: ids } } },
    { $group: { _id: '$owner', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(vehicleCounts.map((v) => [String(v._id), v.count]));
  return sendSuccess(res, { data: items.map((u) => ({ ...u, vehicleCount: countMap.get(String(u._id)) || 0 })), meta });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).lean();
  if (!user) throw ApiError.notFound('User');
  delete user.password;
  const [vehicles, stats] = await Promise.all([
    Vehicle.find({ owner: user._id }).select('make model nickname registrationNumber vehicleType fuelType healthScore odometer createdAt color').lean(),
    Promise.all([
      ServiceRecord.countDocuments({ owner: user._id }),
      Expense.aggregate([{ $match: { owner: user._id } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      MaintenanceTask.countDocuments({ owner: user._id, status: 'overdue' }),
    ]),
  ]);
  return sendSuccess(res, {
    data: {
      ...user,
      vehicles,
      stats: { serviceRecords: stats[0], totalSpend: stats[1][0]?.total || 0, overdueTasks: stats[2] },
    },
  });
});

export const createUser = asyncHandler(async (req, res) => {
  if (await User.exists({ email: req.body.email })) {
    throw ApiError.conflict('An account with this email already exists', [{ field: 'email', message: 'Email already registered' }]);
  }
  const user = await User.create(req.body);
  return sendSuccess(res, { status: 201, message: 'User created', data: user.toSafeJSON() });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User');
  if (String(user._id) === String(req.user._id) && req.body.role && req.body.role !== 'admin') {
    throw ApiError.badRequest('You cannot remove your own admin role');
  }
  if (req.body.email && req.body.email !== user.email && (await User.exists({ email: req.body.email }))) {
    throw ApiError.conflict('An account with this email already exists', [{ field: 'email', message: 'Email already registered' }]);
  }
  Object.assign(user, req.body);
  await user.save();
  if (req.body.password) await revokeAllSessions(user._id);
  return sendSuccess(res, { message: 'User updated', data: user.toSafeJSON() });
});

export const setUserStatus = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw ApiError.badRequest('You cannot block your own account');
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User');
  user.isActive = req.body.isActive;
  user.blockedReason = req.body.isActive ? undefined : req.body.reason;
  await user.save();
  if (!user.isActive) await revokeAllSessions(user._id);
  return sendSuccess(res, {
    message: user.isActive ? `${user.name} has been unblocked` : `${user.name} has been blocked`,
    data: user.toSafeJSON(),
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === String(req.user._id)) throw ApiError.badRequest('You cannot delete your own account');
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User');
  const vehicles = await Vehicle.find({ owner: user._id });
  for (const v of vehicles) await deleteVehicleCascade(v);
  await Promise.all([
    Document.deleteMany({ owner: user._id }),
    Reminder.deleteMany({ owner: user._id }),
    Notification.deleteMany({ user: user._id }),
  ]);
  await user.deleteOne();
  return sendSuccess(res, { message: 'User and all related data deleted' });
});

// ─── Platform data (read-only views) ─────────────────────────────────────────
export const listAllVehicles = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 12 });
  const filter = {};
  const types = toList(req.query.vehicleType);
  if (types.length) filter.vehicleType = { $in: types };
  const fuels = toList(req.query.fuelType);
  if (fuels.length) filter.fuelType = { $in: fuels };
  if (req.query.owner && isObjectId(req.query.owner)) filter.owner = toObjectId(req.query.owner);
  if (req.query.search) {
    const rx = searchRegex(req.query.search);
    filter.$or = [{ make: rx }, { model: rx }, { registrationNumber: rx }, { nickname: rx }];
  }
  const { items, meta } = await paginate(Vehicle, filter, {
    page,
    limit,
    skip,
    sort: parseSort(req.query.sort, ['createdAt', 'make', 'healthScore', 'odometer', 'year'], '-createdAt'),
    select: '-odometerLogs -noteEntries',
    populate: [{ path: 'owner', select: 'name email' }],
  });
  return sendSuccess(res, { data: items, meta });
});

export const listAllTasks = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 15 });
  const filter = {};
  const statuses = toList(req.query.status);
  if (statuses.length) filter.status = { $in: statuses };
  if (req.query.priority) filter.priority = { $in: toList(req.query.priority) };
  if (req.query.search) filter.name = searchRegex(req.query.search);
  const { items, meta } = await paginate(MaintenanceTask, filter, {
    page,
    limit,
    skip,
    sort: parseSort(req.query.sort, ['nextDueDate', 'createdAt', 'completedAt', 'name', 'status'], '-updatedAt'),
    populate: [
      { path: 'vehicle', select: 'make model nickname registrationNumber' },
      { path: 'owner', select: 'name email' },
      { path: 'category', select: 'name color' },
    ],
  });
  return sendSuccess(res, { data: items, meta });
});

export const listAllServiceRecords = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 15 });
  const filter = {};
  if (req.query.search) {
    const rx = searchRegex(req.query.search);
    filter.$or = [{ serviceCenter: rx }, { mechanic: rx }, { 'maintenanceItems.name': rx }];
  }
  const { items, meta } = await paginate(ServiceRecord, filter, {
    page,
    limit,
    skip,
    sort: parseSort(req.query.sort, ['serviceDate', 'totalCost', 'createdAt'], '-serviceDate'),
    populate: [
      { path: 'vehicle', select: 'make model nickname registrationNumber' },
      { path: 'owner', select: 'name email' },
    ],
  });
  return sendSuccess(res, { data: items, meta });
});

// ─── Catalog: generic CRUD factory ───────────────────────────────────────────
function catalogCrud(Model, { label, searchFields, sortFields, defaultSort, populate, inUse, filterKeys = [], extraConditions }) {
  return {
    list: asyncHandler(async (req, res) => {
      const { page, limit, skip } = getPagination(req.query, { defaultLimit: 50, maxLimit: 500 });
      const conditions = [];
      if (req.query.search) {
        const rx = searchRegex(req.query.search);
        conditions.push({ $or: searchFields.map((f) => ({ [f]: rx })) });
      }
      if (req.query.isActive === 'true') conditions.push({ isActive: true });
      if (req.query.isActive === 'false') conditions.push({ isActive: false });
      for (const key of filterKeys) {
        const value = req.query[key];
        if (!value) continue;
        conditions.push({ [key]: key === 'category' && isObjectId(value) ? toObjectId(value) : String(value) });
      }
      if (extraConditions) conditions.push(...(await extraConditions(req.query)));
      const filter = conditions.length ? { $and: conditions } : {};
      const { items, meta } = await paginate(Model, filter, {
        page,
        limit,
        skip,
        sort: parseSort(req.query.sort, sortFields, defaultSort),
        populate,
      });
      return sendSuccess(res, { data: items, meta });
    }),
    get: asyncHandler(async (req, res) => {
      const item = await Model.findById(req.params.id).populate(populate || []);
      if (!item) throw ApiError.notFound(label);
      return sendSuccess(res, { data: item });
    }),
    create: asyncHandler(async (req, res) => {
      const item = await Model.create(req.body);
      return sendSuccess(res, { status: 201, message: `${label} created`, data: item });
    }),
    update: asyncHandler(async (req, res) => {
      const item = await Model.findById(req.params.id);
      if (!item) throw ApiError.notFound(label);
      if (req.body.code && req.body.code !== item.code && inUse && (await inUse(item))) {
        throw ApiError.badRequest(`The code of a ${label.toLowerCase()} that is in use cannot be changed`);
      }
      Object.assign(item, req.body);
      await item.save();
      return sendSuccess(res, { message: `${label} updated`, data: item });
    }),
    remove: asyncHandler(async (req, res) => {
      const item = await Model.findById(req.params.id);
      if (!item) throw ApiError.notFound(label);
      const usage = inUse ? await inUse(item) : 0;
      if (usage) {
        throw ApiError.badRequest(`This ${label.toLowerCase()} is used by ${usage} record(s). Deactivate it instead of deleting.`);
      }
      await item.deleteOne();
      return sendSuccess(res, { message: `${label} deleted` });
    }),
  };
}

export const categories = catalogCrud(MaintenanceCategory, {
  label: 'Category',
  searchFields: ['name', 'code', 'description'],
  sortFields: ['sortOrder', 'name', 'createdAt'],
  defaultSort: 'sortOrder',
  inUse: async (c) =>
    (await MaintenanceTemplate.countDocuments({ category: c._id })) + (await MaintenanceTask.countDocuments({ category: c._id })),
});

export const templates = catalogCrud(MaintenanceTemplate, {
  label: 'Template',
  searchFields: ['name', 'code', 'description', 'makes', 'models'],
  sortFields: ['name', 'code', 'intervalKm', 'intervalMonths', 'priority', 'estimatedCost', 'createdAt', 'updatedAt'],
  defaultSort: 'name',
  populate: [{ path: 'category', select: 'name code color icon' }],
  filterKeys: ['category', 'priority'],
  // Filter by a vehicle type (including templates inherited through its group), group, fuel or powertrain.
  extraConditions: async (q) => {
    const conditions = [];
    if (q.vehicleType) {
      const type = await VehicleType.findOne({ code: String(q.vehicleType) }).select('group').lean();
      conditions.push({ $or: [{ vehicleTypes: String(q.vehicleType) }, ...(type ? [{ vehicleGroups: type.group }] : [])] });
    }
    if (q.vehicleGroup) conditions.push({ vehicleGroups: String(q.vehicleGroup) });
    if (q.fuelType) conditions.push({ $or: [{ fuelTypes: String(q.fuelType) }, { fuelTypes: { $size: 0 } }] });
    if (q.powertrain) conditions.push({ $or: [{ powertrains: String(q.powertrain) }, { powertrains: { $size: 0 } }] });
    if (q.scope === 'manufacturer') conditions.push({ $or: [{ 'makes.0': { $exists: true } }, { 'models.0': { $exists: true } }] });
    return conditions;
  },
  inUse: async (t) => MaintenanceTask.countDocuments({ template: t._id, isOpen: true }),
});

export const vehicleTypes = catalogCrud(VehicleType, {
  label: 'Vehicle type',
  searchFields: ['name', 'code', 'description'],
  sortFields: ['sortOrder', 'name', 'group', 'createdAt'],
  defaultSort: 'sortOrder',
  filterKeys: ['group'],
  inUse: async (t) => Vehicle.countDocuments({ vehicleType: t.code }),
});

export const fuelTypes = catalogCrud(FuelType, {
  label: 'Fuel type',
  searchFields: ['name', 'code'],
  sortFields: ['sortOrder', 'name', 'createdAt'],
  defaultSort: 'sortOrder',
  filterKeys: ['powertrain'],
  inUse: async (f) => Vehicle.countDocuments({ $or: [{ fuelType: f.code }, { secondaryFuelType: f.code }] }),
});

/** Duplicates a template (e.g. to create a manufacturer-specific override). */
export const duplicateTemplate = asyncHandler(async (req, res) => {
  const source = await MaintenanceTemplate.findById(req.params.id).lean();
  if (!source) throw ApiError.notFound('Template');
  const { _id, createdAt, updatedAt, __v, ...rest } = source;
  const copy = await MaintenanceTemplate.create({ ...rest, name: `${rest.name} (copy)`, isActive: false });
  return sendSuccess(res, { status: 201, message: 'Template duplicated (inactive until you enable it)', data: copy });
});

/**
 * Pushes a template's current interval/cost/priority to every open task created
 * from it and recalculates their due points.
 */
export const applyTemplate = asyncHandler(async (req, res) => {
  const template = await MaintenanceTemplate.findById(req.params.id).lean();
  if (!template) throw ApiError.notFound('Template');
  const tasks = await MaintenanceTask.find({ template: template._id, isOpen: true }).populate('vehicle', 'odometer');
  const vehicleIds = new Set();
  for (const task of tasks) {
    Object.assign(task, {
      name: template.name,
      description: template.description,
      category: template.category,
      priority: template.priority,
      serviceMode: template.serviceMode,
      intervalKm: template.intervalKm || null,
      intervalMonths: template.intervalMonths || null,
      estimatedCost: template.estimatedCost,
      estimatedDurationMinutes: template.estimatedDurationMinutes,
    });
    if (!task.isRescheduled) {
      Object.assign(
        task,
        computeNextDue({
          lastPerformedDate: task.lastPerformedDate,
          lastPerformedOdometer: task.lastPerformedOdometer,
          intervalKm: task.intervalKm,
          intervalMonths: task.intervalMonths,
        })
      );
    }
    const e = evaluateTask(task, { currentOdometer: task.vehicle?.odometer });
    task.status = e.status;
    task.dueBy = e.dueBy;
    vehicleIds.add(String(task.vehicle?._id || task.vehicle));
    task.vehicle = task.vehicle?._id || task.vehicle;
    await task.save();
  }
  for (const id of vehicleIds) await refreshVehicle(id);

  if (tasks.length) {
    const owners = await MaintenanceTask.distinct('owner', { template: template._id, isOpen: true });
    await Promise.all(
      owners.map((owner) =>
        notify({
          user: owner,
          type: 'maintenance',
          severity: 'info',
          title: 'Maintenance schedule updated',
          message: `Recommended interval for "${template.name}" was updated by the AutoCare360 team.`,
          link: '/app/maintenance',
        })
      )
    );
  }
  return sendSuccess(res, { message: `Applied to ${tasks.length} open maintenance item(s)`, data: { updated: tasks.length } });
});
