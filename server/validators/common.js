import { z } from 'zod';

const blankToNull = (v) => (v === '' ? null : v);
const blankToUndefined = (v) => (v === '' || v === null ? undefined : v);
const toBool = (v) => (v === 'true' ? true : v === 'false' ? false : v);

export const objectId = z.string({ error: 'Invalid id' }).regex(/^[a-f\d]{24}$/i, 'Invalid id');
export const idParams = z.object({ id: objectId });

/** Required trimmed string. */
export const reqString = (label, max = 200) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

/** Optional trimmed string ('' allowed so users can clear a field). */
export const optString = (max = 200) => z.string().trim().max(max, `Must be at most ${max} characters`).optional();

export const optNumber = ({ min = 0, max, int = false, label = 'Value' } = {}) => {
  let schema = z.coerce.number({ error: `${label} must be a number` });
  if (int) schema = schema.int(`${label} must be a whole number`);
  schema = schema.min(min, `${label} must be at least ${min}`);
  if (max !== undefined) schema = schema.max(max, `${label} must be at most ${max}`);
  return z.preprocess(blankToNull, schema.nullable().optional());
};

export const reqNumber = (label, { min = 0, max, int = false } = {}) => {
  let schema = z.coerce.number({ error: `${label} is required` });
  if (int) schema = schema.int(`${label} must be a whole number`);
  schema = schema.min(min, `${label} must be at least ${min}`);
  if (max !== undefined) schema = schema.max(max, `${label} must be at most ${max}`);
  return z.preprocess(blankToUndefined, schema);
};

export const optDate = (label = 'Date') =>
  z.preprocess(blankToNull, z.coerce.date({ error: `${label} is not a valid date` }).nullable().optional());

export const reqDate = (label = 'Date') =>
  z.preprocess(blankToUndefined, z.coerce.date({ error: `${label} is required` }));

export const optBool = z.preprocess(toBool, z.boolean().optional());

export const optObjectId = z.preprocess(blankToNull, objectId.nullable().optional());

export const optEnum = (values, label = 'Value') =>
  z.enum(values, { error: `${label} must be one of: ${values.join(', ')}` }).optional();

export const reqEnum = (values, label = 'Value') => z.enum(values, { error: `Select a valid ${label.toLowerCase()}` });

export const stringArray = (max = 50) => z.array(z.string().trim().min(1).max(80)).max(max).default([]);

export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #2563eb');

/** Standard list query: pagination, sort and free-text search. */
export const listQuery = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    sort: z.string().max(40).optional(),
    search: z.string().trim().max(100).optional(),
  })
  .passthrough();

export const password = z
  .string({ error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/[a-z]/, 'Include at least one lowercase letter')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/\d/, 'Include at least one number');

export const email = z.string({ error: 'Email is required' }).trim().toLowerCase().email('Enter a valid email address').max(160);
