import { z } from 'zod';
import { PRIORITIES, SERVICE_MODES } from '../constants/enums.js';
import { reqString, optString, optNumber, optDate, optBool, optEnum, objectId } from './common.js';

const taskFields = {
  name: reqString('Name', 120),
  description: optString(600),
  category: objectId,
  priority: optEnum(PRIORITIES, 'Priority'),
  serviceMode: optEnum(SERVICE_MODES, 'Service mode'),
  isRecurring: optBool,
  intervalKm: optNumber({ min: 1, label: 'Distance interval' }),
  intervalMonths: optNumber({ min: 1, max: 240, int: true, label: 'Time interval' }),
  estimatedCost: optNumber({ label: 'Estimated cost' }),
  estimatedDurationMinutes: optNumber({ int: true, label: 'Duration' }),
  lastPerformedDate: optDate('Last performed date'),
  lastPerformedOdometer: optNumber({ label: 'Last performed odometer' }),
  nextDueDate: optDate('Due date'),
  nextDueOdometer: optNumber({ label: 'Due odometer' }),
  notes: optString(1000),
};

export const createTaskSchema = z
  .object({ vehicle: objectId, ...taskFields })
  .superRefine((d, ctx) => {
    if (!d.intervalKm && !d.intervalMonths && !d.nextDueDate && !d.nextDueOdometer) {
      ctx.addIssue({
        code: 'custom',
        path: ['nextDueDate'],
        message: 'Set a due date, a due odometer, or a recurring interval',
      });
    }
  });

export const updateTaskSchema = z.object(taskFields).partial();

export const completeTaskSchema = z.object({
  date: optDate('Completion date'),
  odometer: optNumber({ label: 'Odometer' }),
  cost: optNumber({ label: 'Cost' }),
  notes: optString(1000),
  logExpense: optBool,
});

export const rescheduleTaskSchema = z
  .object({
    nextDueDate: optDate('Due date'),
    nextDueOdometer: optNumber({ label: 'Due odometer' }),
    reason: optString(300),
  })
  .refine((d) => d.nextDueDate || d.nextDueOdometer, {
    message: 'Provide a new due date or odometer',
    path: ['nextDueDate'],
  });

export const skipTaskSchema = z.object({ reason: optString(300) });
