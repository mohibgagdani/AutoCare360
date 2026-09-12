/**
 * Maintenance scheduling: template matching, schedule generation/sync,
 * occurrence completion and status refresh. All due-date maths is delegated to
 * the pure maintenanceEngine.
 */
import crypto from 'node:crypto';
import {
  User,
  Vehicle,
  VehicleType,
  FuelType,
  MaintenanceTemplate,
  MaintenanceTask,
  Reminder,
  Document,
} from '../models/index.js';
import { TASK_STATUS, OPEN_TASK_STATUSES } from '../constants/enums.js';
import { computeNextDue, evaluateTask, computeHealthScore, statusRank, urgencyScore } from './maintenanceEngine.js';
import { notify } from './notificationService.js';
import { ApiError } from '../utils/ApiError.js';
import { startOfDay } from '../utils/dates.js';
import { logger } from '../utils/logger.js';

const eqi = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// ────────────────────────────────────────────────────────────────────────────
// Template matching
// ────────────────────────────────────────────────────────────────────────────

/**
 * Builds the matching spec for a vehicle (or a vehicle draft from the add form).
 * @returns {{ vehicleType, group, usageUnit, fuelTypes: string[], powertrains: string[], transmission, make, model }}
 */
export async function buildVehicleSpec({ vehicleType, fuelType, secondaryFuelType, transmission, make, model }) {
  const fuelCodes = [fuelType, secondaryFuelType].filter(Boolean).map((c) => String(c).toLowerCase());
  const [type, fuels] = await Promise.all([
    VehicleType.findOne({ code: String(vehicleType || '').toLowerCase() }).lean(),
    FuelType.find({ code: { $in: fuelCodes } }).lean(),
  ]);
  if (!type) throw ApiError.badRequest('Unknown vehicle type');
  return {
    vehicleType: type.code,
    group: type.group,
    usageUnit: type.usageUnit,
    typeName: type.name,
    fuelTypes: fuelCodes,
    powertrains: [...new Set(fuels.map((f) => f.powertrain))],
    transmission: transmission || null,
    make: make || '',
    model: model || '',
  };
}

export function templateMatches(t, spec) {
  const typeOk = (t.vehicleTypes || []).includes(spec.vehicleType) || (t.vehicleGroups || []).includes(spec.group);
  if (!typeOk) return false;
  if (t.fuelTypes?.length && !t.fuelTypes.some((f) => spec.fuelTypes.includes(f))) return false;
  if (t.powertrains?.length && !t.powertrains.some((p) => spec.powertrains.includes(p))) return false;
  if (t.transmissions?.length && !t.transmissions.includes(spec.transmission)) return false;
  if (t.makes?.length && !t.makes.some((m) => eqi(m, spec.make))) return false;
  if (t.excludeMakes?.length && t.excludeMakes.some((m) => eqi(m, spec.make))) return false;
  if (t.models?.length) {
    const model = String(spec.model || '').toLowerCase();
    if (!t.models.some((m) => model.includes(String(m).toLowerCase()))) return false;
  }
  return true;
}

/**
 * Higher = more specific. Model > make > fuel > transmission > powertrain > explicit type > group.
 * Within a tier, a narrower list wins (a CNG-only template beats a petrol/CNG/LPG one).
 */
export function templateSpecificity(t) {
  const narrow = (list, weight, span) => (list?.length ? weight + span / list.length : 0);
  // Weights are chosen so no combination of lower tiers can outrank a higher tier.
  return (
    narrow(t.models, 128, 1) +
    narrow(t.makes, 32, 1) +
    narrow(t.fuelTypes, 16, 1) +
    narrow(t.transmissions, 8, 0.5) +
    narrow(t.powertrains, 4, 0.25) +
    narrow(t.vehicleTypes, 2, 0.1)
  );
}

/** Returns the winning template per code for the given spec. */
export async function resolveTemplates(spec, { populateCategory = false } = {}) {
  let query = MaintenanceTemplate.find({
    isActive: true,
    $or: [{ vehicleTypes: spec.vehicleType }, { vehicleGroups: spec.group }],
  });
  if (populateCategory) query = query.populate('category', 'name code icon color sortOrder');
  const candidates = await query.lean();

  const winners = new Map();
  for (const t of candidates) {
    if (!templateMatches(t, spec)) continue;
    const current = winners.get(t.code);
    if (
      !current ||
      templateSpecificity(t) > templateSpecificity(current) ||
      (templateSpecificity(t) === templateSpecificity(current) && t.updatedAt > current.updatedAt)
    ) {
      winners.set(t.code, t);
    }
  }
  return [...winners.values()];
}

// ────────────────────────────────────────────────────────────────────────────
// Task construction helpers
// ────────────────────────────────────────────────────────────────────────────

const NEW_VEHICLE_WINDOW_MS = 183 * 24 * 60 * 60 * 1000;

/**
 * Where a task's schedule starts when the vehicle has no history for it:
 *  1. the last general service the owner told us about;
 *  2. the purchase date, for vehicles bought in the last ~6 months (first services pending);
 *  3. otherwise today — we don't know the history, so tracking starts now rather
 *     than flagging years of "overdue" work on a well-kept older vehicle.
 */
export function vehicleBaseline(vehicle, now = new Date()) {
  if (vehicle.lastServiceDate) {
    return {
      date: vehicle.lastServiceDate,
      odometer: vehicle.lastServiceOdometer ?? vehicle.odometer ?? 0,
      estimated: true,
    };
  }
  if (vehicle.purchaseDate && now - new Date(vehicle.purchaseDate) <= NEW_VEHICLE_WINDOW_MS) {
    return { date: vehicle.purchaseDate, odometer: vehicle.purchaseOdometer ?? 0, estimated: true };
  }
  return { date: now, odometer: vehicle.odometer || 0, estimated: true };
}

function templateFields(t) {
  return {
    template: t._id,
    code: t.code,
    name: t.name,
    description: t.description,
    category: t.category?._id || t.category,
    priority: t.priority,
    serviceMode: t.serviceMode,
    isRecurring: t.isRecurring !== false,
    isCustom: false,
    intervalKm: t.intervalKm || null,
    intervalMonths: t.intervalMonths || null,
    estimatedCost: t.estimatedCost || 0,
    estimatedDurationMinutes: t.estimatedDurationMinutes || 0,
  };
}

/** Builds a plain task document with due dates and status already computed. */
export function buildOccurrence(fields, { vehicle, lastDate, lastOdometer, estimated = false, now = new Date() }) {
  const due = computeNextDue({
    lastPerformedDate: lastDate,
    lastPerformedOdometer: lastOdometer,
    intervalKm: fields.intervalKm,
    intervalMonths: fields.intervalMonths,
  });
  const draft = {
    ...fields,
    owner: vehicle.owner,
    vehicle: vehicle._id,
    lastPerformedDate: lastDate,
    lastPerformedOdometer: lastOdometer,
    baselineEstimated: estimated,
    ...due,
  };
  const { status, dueBy } = evaluateTask(draft, { currentOdometer: vehicle.odometer, now });
  return { ...draft, status, dueBy, isOpen: true };
}

async function latestCompletions(vehicleId) {
  const rows = await MaintenanceTask.aggregate([
    { $match: { vehicle: vehicleId, status: TASK_STATUS.COMPLETED } },
    { $sort: { completedAt: -1 } },
    { $group: { _id: '$code', completedAt: { $first: '$completedAt' }, completedOdometer: { $first: '$completedOdometer' } } },
  ]);
  return new Map(rows.map((r) => [r._id, r]));
}

// ────────────────────────────────────────────────────────────────────────────
// Schedule generation / sync
// ────────────────────────────────────────────────────────────────────────────

/**
 * Makes a vehicle's open tasks match the applicable templates:
 *  • creates missing occurrences (baseline = history for that code, else vehicle baseline)
 *  • re-applies the winning template when intervals/overrides changed
 *  • removes open template tasks that no longer apply (e.g. petrol → electric)
 * Custom tasks are never touched.
 */
export async function syncSchedule(vehicleOrId, { now = new Date(), baseline, notifyAlerts = true } = {}) {
  const vehicle = vehicleOrId?._id ? vehicleOrId : await Vehicle.findById(vehicleOrId);
  if (!vehicle) throw ApiError.notFound('Vehicle');

  const spec = await buildVehicleSpec(vehicle);
  const excluded = new Set(vehicle.excludedMaintenanceCodes || []);
  const templates = (await resolveTemplates(spec)).filter((t) => !excluded.has(t.code));
  const byCode = new Map(templates.map((t) => [t.code, t]));

  const [openTasks, history] = await Promise.all([
    MaintenanceTask.find({ vehicle: vehicle._id, isOpen: true }),
    latestCompletions(vehicle._id),
  ]);
  const openByCode = new Map(openTasks.map((t) => [t.code, t]));
  const fallback = baseline || vehicleBaseline(vehicle, now);

  // 1. Create missing occurrences.
  const toCreate = [];
  for (const t of templates) {
    if (openByCode.has(t.code)) continue;
    const last = history.get(t.code);
    toCreate.push(
      buildOccurrence(templateFields(t), {
        vehicle,
        lastDate: last?.completedAt || fallback.date,
        lastOdometer: last?.completedOdometer ?? fallback.odometer,
        estimated: !last && fallback.estimated,
        now,
      })
    );
  }
  let created = 0;
  if (toCreate.length) {
    try {
      const result = await MaintenanceTask.insertMany(toCreate, { ordered: false });
      created = result.length;
    } catch (error) {
      // Concurrent syncs can race on the partial unique index; duplicates are harmless.
      if (error.code !== 11000 && !error.writeErrors) throw error;
      created = error.insertedDocs?.length || 0;
    }
  }

  // 2. Update open tasks whose winning template changed, 3. remove inapplicable ones.
  const removeIds = [];
  const updates = [];
  for (const task of openTasks) {
    if (task.isCustom) continue;
    const t = byCode.get(task.code);
    if (!t) {
      removeIds.push(task._id);
      continue;
    }
    const intervalChanged = task.intervalKm !== (t.intervalKm || null) || task.intervalMonths !== (t.intervalMonths || null);
    if (String(task.template) !== String(t._id) || intervalChanged) {
      Object.assign(task, templateFields(t));
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
      updates.push(task.save());
    }
  }
  await Promise.all(updates);
  if (removeIds.length) {
    await Promise.all([
      MaintenanceTask.deleteMany({ _id: { $in: removeIds } }),
      Reminder.deleteMany({ task: { $in: removeIds } }),
    ]);
  }

  await refreshVehicle(vehicle._id, { now, notifyAlerts });
  return { created, updated: updates.length, removed: removeIds.length, applicable: templates.length };
}

/** Preview the checklist a vehicle spec would receive (used by the add-vehicle wizard). */
export async function previewSchedule(input) {
  const spec = await buildVehicleSpec(input);
  const templates = await resolveTemplates(spec, { populateCategory: true });
  return {
    spec,
    total: templates.length,
    items: templates
      .sort(
        (a, b) =>
          (a.category?.sortOrder ?? 0) - (b.category?.sortOrder ?? 0) || a.name.localeCompare(b.name)
      )
      .map((t) => ({
        code: t.code,
        name: t.name,
        description: t.description,
        category: t.category,
        priority: t.priority,
        intervalKm: t.intervalKm,
        intervalMonths: t.intervalMonths,
        estimatedCost: t.estimatedCost,
        serviceMode: t.serviceMode,
        manufacturerSpecific: Boolean(t.makes?.length || t.models?.length),
      })),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Status refresh, health score, alerts
// ────────────────────────────────────────────────────────────────────────────

const STATUS_COPY = {
  [TASK_STATUS.DUE_SOON]: { verb: 'due soon', severity: 'info' },
  [TASK_STATUS.DUE]: { verb: 'due now', severity: 'warning' },
  [TASK_STATUS.OVERDUE]: { verb: 'overdue', severity: 'critical' },
};
const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

const vehicleLabel = (v) => v.nickname || `${v.make} ${v.model}`;
const shortHash = (value) => crypto.createHash('sha1').update(value).digest('hex').slice(0, 12);

/** "Engine oil change, Oil filter replacement and 3 more" */
function summariseNames(tasks, max = 3) {
  const sorted = [...tasks].sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  const names = sorted.slice(0, max).map((t) => t.name);
  const rest = sorted.length - names.length;
  return rest > 0 ? `${names.join(', ')} and ${rest} more` : names.join(', ').replace(/, ([^,]*)$/, ' and $1');
}

/**
 * Keeps maintenance reminders and notifications in sync with task statuses.
 * Items that need attention together are grouped per vehicle so one missed
 * service produces one reminder and one notification — not twenty.
 */
async function syncMaintenanceAlerts(vehicle, tasks, now) {
  const unit = vehicle.usageUnit === 'hours' ? 'hrs' : 'km';

  // 1. One active reminder per vehicle for "due" and one for "overdue".
  for (const [status, type] of [
    [TASK_STATUS.OVERDUE, 'maintenance_overdue'],
    [TASK_STATUS.DUE, 'maintenance_due'],
  ]) {
    const group = tasks.filter((t) => t.status === status);
    const filter = { owner: vehicle.owner, vehicle: vehicle._id, source: 'maintenance', type };
    if (!group.length) {
      await Reminder.deleteMany({ ...filter, status: 'active' });
      continue;
    }
    const earliest = group
      .map((t) => t.nextDueDate)
      .filter(Boolean)
      .sort((a, b) => a - b)[0];
    // Items triggered by the odometer are due now, even if their date threshold is later.
    const dueByDistance = group.some((t) => t.dueBy === 'odometer');
    await Reminder.updateOne(
      filter,
      {
        $set: {
          title: `${group.length} maintenance item${group.length > 1 ? 's' : ''} ${STATUS_COPY[status].verb} · ${vehicleLabel(vehicle)}`,
          description: summariseNames(group),
          // Overdue groups can't be "upcoming": odometer-overdue items with a future date count from today.
          dueDate:
            status === TASK_STATUS.OVERDUE
              ? earliest && earliest < now
                ? earliest
                : now
              : dueByDistance || !earliest
                ? now
                : earliest,
          status: 'active',
          remindBeforeDays: 0,
          task: null,
        },
        $setOnInsert: { notifiedStages: [], notifyByEmail: true },
      },
      { upsert: true }
    );
  }

  // 2. Notify about items that newly crossed into due soon / due / overdue.
  const escalated = new Map();
  const taskOps = [];
  for (const task of tasks) {
    const rank = statusRank(task.status);
    const lastRank = task.lastNotifiedStatus ? statusRank(task.lastNotifiedStatus) : 0;
    if (rank > lastRank && STATUS_COPY[task.status]) {
      if (!escalated.has(task.status)) escalated.set(task.status, []);
      escalated.get(task.status).push(task);
    }
    if (rank !== lastRank) {
      taskOps.push({
        updateOne: { filter: { _id: task._id }, update: { $set: { lastNotifiedStatus: rank > 0 ? task.status : null } } },
      });
    }
  }
  if (taskOps.length) await MaintenanceTask.bulkWrite(taskOps, { ordered: false });

  for (const [status, group] of escalated) {
    const copy = STATUS_COPY[status];
    const single = group.length === 1 ? group[0] : null;
    const duePoint = single
      ? [
          single.nextDueOdometer ? `due at ${single.nextDueOdometer.toLocaleString('en-IN')} ${unit}` : null,
          single.nextDueDate
            ? `by ${single.nextDueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
            : null,
        ]
          .filter(Boolean)
          .join(' or ')
      : '';
    await notify(
      {
        user: vehicle.owner,
        type: 'maintenance',
        severity: copy.severity,
        title: single
          ? `${single.name} is ${copy.verb}`
          : `${group.length} maintenance items are ${copy.verb}`,
        message: `${vehicleLabel(vehicle)} (${vehicle.registrationNumber}) — ${single ? duePoint : summariseNames(group)}.`,
        link: `/app/vehicles/${vehicle._id}?tab=maintenance`,
        vehicle: vehicle._id,
        dedupeKey: `maint:${vehicle._id}:${status}:${shortHash(group.map((t) => String(t._id)).sort().join(','))}`,
      },
      // Only overdue alerts are mirrored to email to keep inboxes quiet.
      { email: status === TASK_STATUS.OVERDUE }
    );
  }
}

/**
 * Recomputes status for every open task of a vehicle, updates the vehicle's
 * health score / next-service snapshot, and raises alerts for newly due items.
 */
export async function refreshVehicle(vehicleId, { now = new Date(), notifyAlerts = true } = {}) {
  const vehicle = await Vehicle.findById(vehicleId)
    .select('owner make model nickname registrationNumber odometer vehicleType status')
    .lean();
  if (!vehicle) return null;
  const type = await VehicleType.findOne({ code: vehicle.vehicleType }).select('usageUnit').lean();
  vehicle.usageUnit = type?.usageUnit || 'km';

  const tasks = await MaintenanceTask.find({ vehicle: vehicle._id, isOpen: true });
  const ops = [];
  for (const task of tasks) {
    const result = evaluateTask(task, { currentOdometer: vehicle.odometer, now });
    if (result.status !== task.status || result.dueBy !== task.dueBy) {
      ops.push({
        updateOne: {
          filter: { _id: task._id },
          update: { $set: { status: result.status, dueBy: result.dueBy, isOpen: true } },
        },
      });
      task.status = result.status;
      task.dueBy = result.dueBy;
    }
  }
  if (ops.length) await MaintenanceTask.bulkWrite(ops, { ordered: false });

  const expiredDocuments = await Document.countDocuments({
    vehicle: vehicle._id,
    expiryDate: { $lt: startOfDay(now) },
    type: { $in: ['insurance', 'registration_certificate', 'pollution_certificate', 'fitness_certificate', 'permit'] },
  });
  const health = computeHealthScore(tasks, { expiredDocuments });

  const ranked = [...tasks].sort(
    (a, b) =>
      statusRank(b.status) - statusRank(a.status) ||
      urgencyScore(a, vehicle.odometer, now) - urgencyScore(b, vehicle.odometer, now)
  );
  const next = ranked[0];
  const counts = { overdue: 0, due: 0, dueSoon: 0, total: tasks.length };
  for (const t of tasks) {
    if (t.status === TASK_STATUS.OVERDUE) counts.overdue += 1;
    else if (t.status === TASK_STATUS.DUE) counts.due += 1;
    else if (t.status === TASK_STATUS.DUE_SOON) counts.dueSoon += 1;
  }

  await Vehicle.updateOne(
    { _id: vehicle._id },
    {
      $set: {
        healthScore: health.score,
        healthLabel: health.label,
        openTaskCounts: counts,
        nextService: next
          ? { task: next._id, name: next.name, date: next.nextDueDate, odometer: next.nextDueOdometer, status: next.status }
          : null,
      },
    }
  );

  if (notifyAlerts && vehicle.status === 'active') {
    try {
      await syncMaintenanceAlerts(vehicle, tasks, now);
    } catch (error) {
      logger.error(`Alert sync failed for vehicle ${vehicle._id}: ${error.message}`);
    }
  }
  return { health, counts };
}

/** Refreshes all of a user's vehicles, throttled so reads stay fast. */
export async function refreshUserIfStale(user, { maxAgeMs = 5 * 60 * 1000, now = new Date() } = {}) {
  if (user.lastStatusSyncAt && now - new Date(user.lastStatusSyncAt) < maxAgeMs) return false;
  const vehicles = await Vehicle.find({ owner: user._id, status: 'active' }).select('_id').lean();
  for (const v of vehicles) await refreshVehicle(v._id, { now });
  await User.updateOne({ _id: user._id }, { $set: { lastStatusSyncAt: now } });
  user.lastStatusSyncAt = now;
  return true;
}

/** Background job: refresh every active vehicle. */
export async function refreshAllVehicles({ now = new Date() } = {}) {
  let count = 0;
  const cursor = Vehicle.find({ status: 'active' }).select('_id').lean().cursor();
  for await (const v of cursor) {
    await refreshVehicle(v._id, { now });
    count += 1;
  }
  return count;
}

// ────────────────────────────────────────────────────────────────────────────
// Odometer
// ────────────────────────────────────────────────────────────────────────────

/** Raises the odometer (never lowers it) and appends a usage log entry. */
export async function recordOdometer(vehicle, value, { date = new Date(), source = 'manual' } = {}) {
  const reading = Number(value);
  if (!Number.isFinite(reading) || reading < 0) return false;
  const log = { value: reading, date, source };
  if (reading > (vehicle.odometer || 0)) {
    await Vehicle.updateOne(
      { _id: vehicle._id },
      {
        $set: { odometer: reading, odometerUpdatedAt: date > new Date() ? new Date() : date },
        $push: { odometerLogs: { $each: [log], $sort: { date: 1 }, $slice: -400 } },
      }
    );
    vehicle.odometer = reading;
    return true;
  }
  // Historic readings still enrich the usage chart.
  await Vehicle.updateOne(
    { _id: vehicle._id },
    { $push: { odometerLogs: { $each: [log], $sort: { date: 1 }, $slice: -400 } } }
  );
  return false;
}

// ────────────────────────────────────────────────────────────────────────────
// Occurrence lifecycle
// ────────────────────────────────────────────────────────────────────────────

async function openNextOccurrence(closedTask, vehicle, { lastDate, lastOdometer, now }) {
  if (!closedTask.isRecurring || (!closedTask.intervalKm && !closedTask.intervalMonths)) return null;

  let fields = {
    template: closedTask.template,
    code: closedTask.code,
    name: closedTask.name,
    description: closedTask.description,
    category: closedTask.category,
    priority: closedTask.priority,
    serviceMode: closedTask.serviceMode,
    isRecurring: closedTask.isRecurring,
    isCustom: closedTask.isCustom,
    intervalKm: closedTask.intervalKm,
    intervalMonths: closedTask.intervalMonths,
    estimatedCost: closedTask.estimatedCost,
    estimatedDurationMinutes: closedTask.estimatedDurationMinutes,
    notes: closedTask.isCustom ? closedTask.notes : undefined,
  };
  // Pick up admin changes to the template since the last occurrence.
  if (closedTask.template) {
    const t = await MaintenanceTemplate.findById(closedTask.template).lean();
    if (t?.isActive) fields = { ...fields, ...templateFields(t) };
  }

  const draft = buildOccurrence(fields, { vehicle, lastDate, lastOdometer, now });
  try {
    return await MaintenanceTask.create(draft);
  } catch (error) {
    if (error.code === 11000) return MaintenanceTask.findOne({ vehicle: vehicle._id, code: draft.code, isOpen: true });
    throw error;
  }
}

/**
 * Marks an occurrence completed and opens the next one.
 * @param {object} opts { date, odometer, cost, notes, serviceRecord, refresh }
 */
export async function completeTask(task, { date, odometer, cost, notes, serviceRecord = null, refresh = true, now = new Date() } = {}) {
  if (!task.isOpen) throw ApiError.badRequest('This maintenance item is already closed');
  const vehicle = await Vehicle.findById(task.vehicle);
  if (!vehicle) throw ApiError.notFound('Vehicle');

  const completedAt = date ? new Date(date) : now;
  const completedOdometer = odometer !== undefined && odometer !== null ? Number(odometer) : vehicle.odometer;

  task.status = TASK_STATUS.COMPLETED;
  task.isOpen = false;
  task.dueBy = null;
  task.completedAt = completedAt;
  task.completedOdometer = completedOdometer;
  if (cost !== undefined && cost !== null) task.actualCost = Number(cost);
  if (notes) task.notes = notes;
  if (serviceRecord) task.serviceRecord = serviceRecord;
  await task.save();

  await Reminder.updateMany({ task: task._id, status: 'active' }, { $set: { status: 'completed', completedAt: now } });

  if (completedOdometer > vehicle.odometer) {
    await recordOdometer(vehicle, completedOdometer, { date: completedAt, source: 'maintenance' });
  }

  const next = await openNextOccurrence(task, vehicle, { lastDate: completedAt, lastOdometer: completedOdometer, now });
  if (refresh) await refreshVehicle(vehicle._id, { now });
  return { completed: task, next };
}

/** Skips this occurrence; the schedule restarts from today's date and odometer. */
export async function skipTask(task, { reason, now = new Date() } = {}) {
  if (!task.isOpen) throw ApiError.badRequest('This maintenance item is already closed');
  const vehicle = await Vehicle.findById(task.vehicle);
  if (!vehicle) throw ApiError.notFound('Vehicle');

  task.status = TASK_STATUS.SKIPPED;
  task.isOpen = false;
  task.dueBy = null;
  task.skippedAt = now;
  task.skipReason = reason;
  await task.save();
  await Reminder.updateMany({ task: task._id, status: 'active' }, { $set: { status: 'dismissed' } });

  const next = await openNextOccurrence(task, vehicle, { lastDate: now, lastOdometer: vehicle.odometer, now });
  await refreshVehicle(vehicle._id, { now });
  return { skipped: task, next };
}

/** Manually moves the due point of an open occurrence. */
export async function rescheduleTask(task, { nextDueDate, nextDueOdometer, reason, now = new Date() } = {}) {
  if (!task.isOpen) throw ApiError.badRequest('Only open maintenance items can be rescheduled');
  const vehicle = await Vehicle.findById(task.vehicle).select('odometer');
  if (nextDueDate !== undefined) task.nextDueDate = nextDueDate;
  if (nextDueOdometer !== undefined) task.nextDueOdometer = nextDueOdometer;
  task.isRescheduled = true;
  task.rescheduleReason = reason;
  task.lastNotifiedStatus = null;
  const result = evaluateTask(task, { currentOdometer: vehicle?.odometer, now });
  task.status = result.status;
  task.dueBy = result.dueBy;
  await task.save();
  await refreshVehicle(task.vehicle, { now });
  return task;
}

/** Recalculates the due point of an open task after its interval/baseline was edited. */
export function recalculateDue(task) {
  if (task.isRescheduled) return task;
  Object.assign(
    task,
    computeNextDue({
      lastPerformedDate: task.lastPerformedDate,
      lastPerformedOdometer: task.lastPerformedOdometer,
      intervalKm: task.intervalKm,
      intervalMonths: task.intervalMonths,
    })
  );
  return task;
}

export { OPEN_TASK_STATUSES };
