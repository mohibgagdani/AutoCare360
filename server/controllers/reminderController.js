import { Reminder, Vehicle } from '../models/index.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { getPagination, parseSort, paginate } from '../utils/pagination.js';
import { toObjectId } from '../utils/helpers.js';
import { startOfDay } from '../utils/dates.js';
import { buildReminderFilter } from '../services/queryFilters.js';
import { completeReminder, reminderStage } from '../services/reminderService.js';
import { refreshUserIfStale } from '../services/scheduleService.js';

const findOwned = async (req) => {
  const reminder = await Reminder.findOne({ _id: req.params.id, owner: req.user._id });
  if (!reminder) throw ApiError.notFound('Reminder');
  return reminder;
};

const assertVehicle = async (owner, vehicleId) => {
  if (!vehicleId) return;
  const exists = await Vehicle.exists({ _id: vehicleId, owner });
  if (!exists) throw ApiError.validation([{ field: 'vehicle', message: 'Select one of your vehicles' }]);
};

export const listReminders = asyncHandler(async (req, res) => {
  await refreshUserIfStale(req.user);
  const { page, limit, skip } = getPagination(req.query, { defaultLimit: 20 });
  const filter = buildReminderFilter(req.user._id, req.query);
  const { items, meta } = await paginate(Reminder, filter, {
    page,
    limit,
    skip,
    sort: parseSort(req.query.sort, ['dueDate', 'createdAt', 'title'], req.query.status === 'completed' ? '-updatedAt' : 'dueDate'),
    populate: [
      { path: 'vehicle', select: 'make model nickname registrationNumber color vehicleType' },
      { path: 'document', select: 'name type file' },
      { path: 'task', select: 'name status nextDueDate nextDueOdometer' },
    ],
  });
  const now = new Date();
  const data = items.map((r) => ({ ...r, stage: r.status === 'active' ? reminderStage(r, now) : null }));

  const owner = toObjectId(req.user._id);
  const today = startOfDay(now);
  const [overdue, upcoming, completed] = await Promise.all([
    Reminder.countDocuments({ owner, status: 'active', dueDate: { $lt: today } }),
    Reminder.countDocuments({ owner, status: 'active', dueDate: { $gte: today } }),
    Reminder.countDocuments({ owner, status: { $in: ['completed', 'dismissed'] } }),
  ]);
  meta.counts = { overdue, upcoming, completed, active: overdue + upcoming };
  return sendSuccess(res, { data, meta });
});

export const createReminder = asyncHandler(async (req, res) => {
  await assertVehicle(req.user._id, req.body.vehicle);
  const reminder = await Reminder.create({
    remindBeforeDays: req.user.preferences?.reminderDaysBefore ?? 15,
    ...req.body,
    owner: req.user._id,
    source: 'manual',
  });
  await reminder.populate('vehicle', 'make model nickname registrationNumber color vehicleType');
  return sendSuccess(res, { status: 201, message: 'Reminder created', data: reminder });
});

export const updateReminder = asyncHandler(async (req, res) => {
  const reminder = await findOwned(req);
  if (reminder.source !== 'manual' && ('dueDate' in req.body || 'type' in req.body)) {
    throw ApiError.badRequest(
      reminder.source === 'document'
        ? 'This reminder follows its document. Update the document expiry date instead.'
        : 'Maintenance reminders follow the schedule. Reschedule the maintenance item instead.'
    );
  }
  await assertVehicle(req.user._id, req.body.vehicle);
  const dueChanged = req.body.dueDate && new Date(req.body.dueDate).getTime() !== reminder.dueDate.getTime();
  Object.assign(reminder, req.body);
  if (dueChanged || 'remindBeforeDays' in req.body) reminder.notifiedStages = [];
  await reminder.save();
  await reminder.populate('vehicle', 'make model nickname registrationNumber color vehicleType');
  return sendSuccess(res, { message: 'Reminder updated', data: reminder });
});

export const completeReminderHandler = asyncHandler(async (req, res) => {
  const reminder = await findOwned(req);
  if (reminder.source === 'maintenance') {
    throw ApiError.badRequest('Complete the maintenance item to clear this reminder.');
  }
  const updated = await completeReminder(reminder);
  return sendSuccess(res, {
    message: updated.status === 'active' ? 'Done! Next occurrence scheduled.' : 'Reminder completed',
    data: updated,
  });
});

export const dismissReminder = asyncHandler(async (req, res) => {
  const reminder = await findOwned(req);
  reminder.status = 'dismissed';
  await reminder.save();
  return sendSuccess(res, { message: 'Reminder dismissed', data: reminder });
});

export const reactivateReminder = asyncHandler(async (req, res) => {
  const reminder = await findOwned(req);
  reminder.status = 'active';
  reminder.completedAt = undefined;
  reminder.notifiedStages = [];
  await reminder.save();
  return sendSuccess(res, { message: 'Reminder reactivated', data: reminder });
});

export const deleteReminder = asyncHandler(async (req, res) => {
  const reminder = await findOwned(req);
  if (reminder.source === 'document') {
    throw ApiError.badRequest('This reminder is managed by a document. Remove the expiry date or delete the document instead.');
  }
  await reminder.deleteOne();
  return sendSuccess(res, { message: 'Reminder deleted' });
});
