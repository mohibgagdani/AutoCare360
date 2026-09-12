import { z } from 'zod';
import {
  SERVICE_TYPES,
  EXPENSE_CATEGORIES,
  PAYMENT_METHODS,
  FUEL_UNITS,
  REMINDER_TYPES,
  REMINDER_REPEAT,
  DOCUMENT_TYPES,
} from '../constants/enums.js';
import {
  reqString,
  optString,
  optNumber,
  reqNumber,
  optDate,
  reqDate,
  optBool,
  optEnum,
  reqEnum,
  objectId,
  optObjectId,
} from './common.js';

// ─── Service records ─────────────────────────────────────────────────────────
const serviceFields = {
  vehicle: objectId,
  serviceDate: reqDate('Service date'),
  odometer: reqNumber('Odometer', { min: 0 }),
  serviceCenter: optString(120),
  serviceCenterLocation: optString(160),
  mechanic: optString(80),
  serviceType: optEnum(SERVICE_TYPES, 'Service type'),
  maintenanceItems: z
    .array(
      z.object({
        task: optObjectId,
        code: optString(60),
        name: reqString('Item name', 120),
        category: optObjectId,
      })
    )
    .max(80)
    .optional(),
  partsReplaced: z
    .array(
      z.object({
        name: reqString('Part name', 120),
        partNumber: optString(60),
        quantity: optNumber({ label: 'Quantity' }),
        unitPrice: optNumber({ label: 'Unit price' }),
      })
    )
    .max(80)
    .optional(),
  laborCost: optNumber({ label: 'Labour cost' }),
  partsCost: optNumber({ label: 'Parts cost' }),
  taxes: optNumber({ label: 'Taxes' }),
  discount: optNumber({ label: 'Discount' }),
  rating: optNumber({ min: 1, max: 5, int: true, label: 'Rating' }),
  notes: optString(2000),
  paymentMethod: optEnum(PAYMENT_METHODS, 'Payment method'),
};

const notFuture = (field, label) => (d, ctx) => {
  if (d[field] && d[field] > new Date(Date.now() + 86400000)) {
    ctx.addIssue({ code: 'custom', path: [field], message: `${label} cannot be in the future` });
  }
};

export const createServiceRecordSchema = z.object(serviceFields).superRefine(notFuture('serviceDate', 'Service date'));
export const updateServiceRecordSchema = z
  .object(serviceFields)
  .partial()
  .superRefine(notFuture('serviceDate', 'Service date'));

// ─── Expenses ────────────────────────────────────────────────────────────────
const expenseFields = {
  vehicle: objectId,
  category: reqEnum(EXPENSE_CATEGORIES, 'Category'),
  // Optional for fuel/charging when quantity × price per unit is provided.
  amount: optNumber({ label: 'Amount' }),
  date: reqDate('Date'),
  odometer: optNumber({ label: 'Odometer' }),
  description: optString(200),
  vendor: optString(120),
  paymentMethod: optEnum(PAYMENT_METHODS, 'Payment method'),
  fuelDetails: z
    .object({
      quantity: optNumber({ label: 'Quantity' }),
      unit: optEnum(FUEL_UNITS, 'Unit'),
      pricePerUnit: optNumber({ label: 'Price per unit' }),
      fullTank: optBool,
    })
    .optional(),
  notes: optString(1000),
};

export const createExpenseSchema = z
  .object(expenseFields)
  .superRefine(notFuture('date', 'Expense date'))
  .superRefine((d, ctx) => {
    const derivable = d.fuelDetails?.quantity && d.fuelDetails?.pricePerUnit;
    if ((d.amount === undefined || d.amount === null) && !derivable) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: 'Amount is required' });
    }
  });
export const updateExpenseSchema = z.object(expenseFields).partial().superRefine(notFuture('date', 'Expense date'));

// ─── Reminders ───────────────────────────────────────────────────────────────
const reminderFields = {
  title: reqString('Title', 140),
  description: optString(600),
  type: optEnum(REMINDER_TYPES, 'Reminder type'),
  vehicle: optObjectId,
  dueDate: reqDate('Due date'),
  remindBeforeDays: optNumber({ min: 0, max: 365, int: true, label: 'Reminder timing' }),
  repeat: optEnum(REMINDER_REPEAT, 'Repeat'),
  notifyByEmail: optBool,
};
export const createReminderSchema = z.object(reminderFields);
export const updateReminderSchema = z.object(reminderFields).partial();

// ─── Documents ───────────────────────────────────────────────────────────────
const documentFields = {
  name: reqString('Document name', 120),
  type: reqEnum(DOCUMENT_TYPES, 'Document type'),
  vehicle: optObjectId,
  documentNumber: optString(60),
  issuer: optString(120),
  issueDate: optDate('Issue date'),
  expiryDate: optDate('Expiry date'),
  notes: optString(1000),
  reminderDaysBefore: optNumber({ min: 1, max: 365, int: true, label: 'Reminder timing' }),
};
const expiryAfterIssue = (d, ctx) => {
  if (d.issueDate && d.expiryDate && d.expiryDate < d.issueDate) {
    ctx.addIssue({ code: 'custom', path: ['expiryDate'], message: 'Expiry date must be after the issue date' });
  }
};
export const createDocumentSchema = z.object(documentFields).superRefine(expiryAfterIssue);
export const updateDocumentSchema = z.object(documentFields).partial().superRefine(expiryAfterIssue);
