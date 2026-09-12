import { z } from 'zod';

/*
 * Client-side validation mirrors the API's rules so users get instant feedback;
 * the server remains the source of truth (its field errors are mapped back onto
 * the forms via applyServerErrors).
 */

const optionalNumber = (label, { min = 0, max } = {}) =>
  z
    .union([z.literal(''), z.coerce.number({ error: `${label} must be a number` })])
    .optional()
    .refine((v) => v === '' || v === undefined || v >= min, `${label} must be at least ${min}`)
    .refine((v) => v === '' || v === undefined || max === undefined || v <= max, `${label} must be at most ${max}`);

const requiredNumber = (label, { min = 0 } = {}) =>
  z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ error: `${label} is required` }).min(min, `${label} must be at least ${min}`)
  );

const requiredDate = (label) => z.string({ error: `${label} is required` }).min(1, `${label} is required`);
const notFuture = (value) => !value || new Date(value) <= new Date(Date.now() + 86400000);

export const passwordRule = z
  .string()
  .min(8, 'At least 8 characters')
  .regex(/[a-z]/, 'Include a lowercase letter')
  .regex(/[A-Z]/, 'Include an uppercase letter')
  .regex(/\d/, 'Include a number');

export const emailRule = z.string().trim().min(1, 'Email is required').email('Enter a valid email address');

// ─── Auth ────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: emailRule,
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your full name').max(80),
    email: emailRule,
    password: passwordRule,
    confirmPassword: z.string(),
    terms: z.literal(true, { error: 'Please accept the terms to continue' }),
  })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const forgotSchema = z.object({ email: emailRule });

export const resetSchema = z
  .object({ password: passwordRule, confirmPassword: z.string() })
  .refine((d) => d.password === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  email: emailRule,
  phone: z.string().trim().max(20).optional(),
});

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, 'Current password is required'), newPassword: passwordRule, confirmPassword: z.string() })
  .refine((d) => d.newPassword === d.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

// ─── Vehicle ─────────────────────────────────────────────────────────────────
export const vehicleSchema = z
  .object({
    vehicleType: z.string().min(1, 'Choose a vehicle type'),
    make: z.string().trim().min(1, 'Make is required').max(60),
    model: z.string().trim().min(1, 'Model is required').max(60),
    variant: z.string().trim().max(80).optional(),
    nickname: z.string().trim().max(60).optional(),
    year: optionalNumber('Year', { min: 1900, max: new Date().getFullYear() + 1 }),
    registrationNumber: z
      .string()
      .trim()
      .min(1, 'Registration number is required')
      .max(20)
      .regex(/^[A-Za-z0-9][A-Za-z0-9 -]*$/, 'Use letters, numbers, spaces or dashes'),
    vin: z.string().trim().max(30).optional(),
    engineNumber: z.string().trim().max(30).optional(),
    fuelType: z.string().min(1, 'Choose a fuel type'),
    secondaryFuelType: z.string().optional(),
    transmission: z.string().optional(),
    purchaseDate: z.string().optional().refine(notFuture, 'Purchase date cannot be in the future'),
    purchasePrice: optionalNumber('Purchase price'),
    purchaseOdometer: optionalNumber('Odometer at purchase'),
    odometer: requiredNumber('Current reading'),
    color: z.string().optional(),
    notes: z.string().max(2000).optional(),
    lastServiceDate: z.string().optional().refine(notFuture, 'Cannot be in the future'),
    lastServiceOdometer: optionalNumber('Last service reading'),
  })
  .superRefine((d, ctx) => {
    if (d.lastServiceOdometer !== '' && d.lastServiceOdometer !== undefined && d.lastServiceOdometer > d.odometer) {
      ctx.addIssue({ code: 'custom', path: ['lastServiceOdometer'], message: 'Cannot exceed the current reading' });
    }
    if (d.purchaseOdometer !== '' && d.purchaseOdometer !== undefined && d.purchaseOdometer > d.odometer) {
      ctx.addIssue({ code: 'custom', path: ['purchaseOdometer'], message: 'Cannot exceed the current reading' });
    }
  });

export const odometerSchema = (current = 0) =>
  z.object({
    odometer: requiredNumber('Reading').refine((v) => v >= current, `Must be at least the current reading (${current.toLocaleString('en-IN')})`),
    date: z.string().optional(),
  });

// ─── Maintenance ─────────────────────────────────────────────────────────────
export const completeTaskSchema = z.object({
  date: requiredDate('Completion date').refine(notFuture, 'Cannot be in the future'),
  odometer: optionalNumber('Odometer'),
  cost: optionalNumber('Cost'),
  notes: z.string().max(1000).optional(),
  logExpense: z.boolean().optional(),
});

export const rescheduleSchema = z
  .object({ nextDueDate: z.string().optional(), nextDueOdometer: optionalNumber('Due reading'), reason: z.string().max(300).optional() })
  .refine((d) => d.nextDueDate || (d.nextDueOdometer !== '' && d.nextDueOdometer !== undefined), {
    path: ['nextDueDate'],
    message: 'Set a new due date, a due reading, or both',
  });

export const taskSchema = z
  .object({
    vehicle: z.string().min(1, 'Choose a vehicle'),
    name: z.string().trim().min(1, 'Name is required').max(120),
    category: z.string().min(1, 'Choose a category'),
    description: z.string().max(600).optional(),
    priority: z.string(),
    serviceMode: z.string(),
    intervalKm: optionalNumber('Distance interval', { min: 1 }),
    intervalMonths: optionalNumber('Time interval', { min: 1, max: 240 }),
    nextDueDate: z.string().optional(),
    nextDueOdometer: optionalNumber('Due reading'),
    estimatedCost: optionalNumber('Estimated cost'),
    notes: z.string().max(1000).optional(),
  })
  .refine((d) => d.intervalKm || d.intervalMonths || d.nextDueDate || d.nextDueOdometer, {
    path: ['nextDueDate'],
    message: 'Set a due date, a due reading, or a recurring interval',
  });

// ─── Records ─────────────────────────────────────────────────────────────────
export const serviceRecordSchema = z.object({
  vehicle: z.string().min(1, 'Choose a vehicle'),
  serviceDate: requiredDate('Service date').refine(notFuture, 'Cannot be in the future'),
  odometer: requiredNumber('Odometer'),
  serviceType: z.string(),
  serviceCenter: z.string().trim().max(120).optional(),
  serviceCenterLocation: z.string().trim().max(160).optional(),
  mechanic: z.string().trim().max(80).optional(),
  laborCost: optionalNumber('Labour cost'),
  partsCost: optionalNumber('Parts cost'),
  taxes: optionalNumber('Taxes'),
  discount: optionalNumber('Discount'),
  paymentMethod: z.string().optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  notes: z.string().max(2000).optional(),
  customItems: z.array(z.object({ name: z.string().trim().max(120) })).optional(),
  partsReplaced: z
    .array(
      z.object({
        name: z.string().trim().min(1, 'Part name is required').max(120),
        partNumber: z.string().trim().max(60).optional(),
        quantity: optionalNumber('Qty'),
        unitPrice: optionalNumber('Price'),
      })
    )
    .optional(),
});

export const expenseSchema = z
  .object({
    vehicle: z.string().min(1, 'Choose a vehicle'),
    category: z.string().min(1, 'Choose a category'),
    amount: optionalNumber('Amount'),
    date: requiredDate('Date').refine(notFuture, 'Cannot be in the future'),
    odometer: optionalNumber('Odometer'),
    description: z.string().trim().max(200).optional(),
    vendor: z.string().trim().max(120).optional(),
    paymentMethod: z.string().optional(),
    quantity: optionalNumber('Quantity'),
    pricePerUnit: optionalNumber('Price per unit'),
    fullTank: z.boolean().optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine((d) => (d.amount !== '' && d.amount !== undefined) || (d.quantity && d.pricePerUnit), {
    path: ['amount'],
    message: 'Enter an amount (or quantity × price)',
  });

export const reminderSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(140),
  description: z.string().max(600).optional(),
  type: z.string(),
  vehicle: z.string().optional(),
  dueDate: requiredDate('Due date'),
  timing: z.string(),
  customDays: optionalNumber('Days', { min: 0, max: 365 }),
  repeat: z.string(),
  notifyByEmail: z.boolean(),
});

export const documentSchema = z
  .object({
    name: z.string().trim().min(1, 'Document name is required').max(120),
    type: z.string().min(1, 'Choose a document type'),
    vehicle: z.string().optional(),
    documentNumber: z.string().trim().max(60).optional(),
    issuer: z.string().trim().max(120).optional(),
    issueDate: z.string().optional(),
    expiryDate: z.string().optional(),
    timing: z.string(),
    customDays: optionalNumber('Days', { min: 1, max: 365 }),
    notes: z.string().max(1000).optional(),
  })
  .refine((d) => !d.issueDate || !d.expiryDate || d.expiryDate >= d.issueDate, {
    path: ['expiryDate'],
    message: 'Expiry must be after the issue date',
  });

/** Strips '' to undefined/null for API payloads. `nullable` keys become null so they can be cleared. */
export function toPayload(values, { nullable = [] } = {}) {
  const out = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === '' || v === undefined) {
      if (nullable.includes(k)) out[k] = null;
      continue;
    }
    out[k] = v;
  }
  return out;
}
