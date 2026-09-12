import { Reminder } from '../models/index.js';
import { DOCUMENT_REMINDER_TYPE } from '../constants/enums.js';
import { notify } from './notificationService.js';
import { addDays, addMonths, diffInDays } from '../utils/dates.js';
import { logger } from '../utils/logger.js';

const DOCUMENT_LABEL = {
  insurance: 'Insurance policy',
  registration_certificate: 'Registration certificate',
  pollution_certificate: 'Pollution (PUC) certificate',
  warranty: 'Warranty',
  driving_license: 'Driving licence',
  fitness_certificate: 'Fitness certificate',
  permit: 'Permit',
};

/** upcoming (inside the reminder window) → due (today) → overdue (past). */
export function reminderStage(reminder, now = new Date()) {
  const days = diffInDays(reminder.dueDate, now);
  if (days < 0) return 'overdue';
  if (days === 0) return 'due';
  if (days <= (reminder.remindBeforeDays ?? 0)) return 'upcoming';
  return null;
}

export function describeReminderTiming(reminder, now = new Date()) {
  const days = diffInDays(reminder.dueDate, now);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'due today';
  return `due in ${days} day${days === 1 ? '' : 's'}`;
}

/** Keeps the auto-generated reminder of a document in sync with its expiry date. */
export async function syncDocumentReminder(doc) {
  if (!doc.expiryDate) {
    if (doc.reminder || doc._id) await Reminder.deleteMany({ document: doc._id });
    doc.reminder = null;
    return null;
  }

  const existing = await Reminder.findOne({ document: doc._id });
  const expiryChanged = existing && new Date(existing.dueDate).getTime() !== new Date(doc.expiryDate).getTime();
  const label = DOCUMENT_LABEL[doc.type] || 'Document';

  const reminder = await Reminder.findOneAndUpdate(
    { document: doc._id },
    {
      $set: {
        owner: doc.owner,
        vehicle: doc.vehicle || null,
        type: DOCUMENT_REMINDER_TYPE[doc.type] || 'document_expiry',
        title: `${doc.name} expiry`,
        description: `${label}${doc.documentNumber ? ` · ${doc.documentNumber}` : ''} expires on ${new Date(doc.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`,
        dueDate: doc.expiryDate,
        remindBeforeDays: doc.reminderDaysBefore ?? 30,
        source: 'document',
        ...(expiryChanged || !existing ? { status: 'active', notifiedStages: [] } : {}),
      },
      $setOnInsert: { notifyByEmail: true },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  doc.reminder = reminder._id;
  return reminder;
}

/** Completes a reminder; repeating reminders roll forward instead. */
export async function completeReminder(reminder, now = new Date()) {
  if (reminder.repeat && reminder.repeat !== 'none') {
    let next = new Date(reminder.dueDate);
    do {
      next = reminder.repeat === 'monthly' ? addMonths(next, 1) : addMonths(next, 12);
    } while (next <= now);
    reminder.dueDate = next;
    reminder.notifiedStages = [];
    reminder.status = 'active';
  } else {
    reminder.status = 'completed';
    reminder.completedAt = now;
  }
  await reminder.save();
  return reminder;
}

const STAGE_SEVERITY = { upcoming: 'info', due: 'warning', overdue: 'critical' };

/**
 * Background job: raises a notification once per stage (upcoming/due/overdue)
 * for every active document/custom reminder. Maintenance reminders are alerted
 * by the schedule service when task statuses change.
 */
export async function processDueReminders({ now = new Date() } = {}) {
  const reminders = await Reminder.find({
    status: 'active',
    source: { $ne: 'maintenance' },
    dueDate: { $lte: addDays(now, 366) },
  }).populate('vehicle', 'make model nickname registrationNumber');

  let raised = 0;
  for (const reminder of reminders) {
    const stage = reminderStage(reminder, now);
    if (!stage || reminder.notifiedStages.includes(stage)) continue;
    // Skip the "upcoming" stage if we're already past it.
    const vehicleName = reminder.vehicle
      ? `${reminder.vehicle.nickname || `${reminder.vehicle.make} ${reminder.vehicle.model}`} · `
      : '';
    const created = await notify(
      {
        user: reminder.owner,
        type: reminder.source === 'document' ? 'document' : 'reminder',
        severity: STAGE_SEVERITY[stage],
        title: `${reminder.title} — ${describeReminderTiming(reminder, now)}`,
        message: `${vehicleName}${reminder.description || 'Reminder'}`,
        link: reminder.source === 'document' ? '/app/documents' : '/app/reminders',
        vehicle: reminder.vehicle?._id || null,
        dedupeKey: `reminder:${reminder._id}:${stage}:${new Date(reminder.dueDate).toISOString().slice(0, 10)}`,
      },
      { email: reminder.notifyByEmail && stage !== 'upcoming' }
    );
    reminder.notifiedStages.push(stage);
    reminder.lastNotifiedAt = now;
    await reminder.save();
    if (created) raised += 1;
  }
  if (raised) logger.info(`Reminder job raised ${raised} notification(s)`);
  return raised;
}
