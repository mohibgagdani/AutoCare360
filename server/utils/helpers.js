import mongoose from 'mongoose';

/** Escapes user input for safe use inside a RegExp. */
export const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const searchRegex = (value) => new RegExp(escapeRegex(String(value).trim()), 'i');

export const isObjectId = (value) => mongoose.isValidObjectId(value) && String(value).length === 24;

export const toObjectId = (value) => new mongoose.Types.ObjectId(String(value));

/** Splits "a,b,c" (or an array) into a clean array of strings. */
export const toList = (value) => {
  if (value === undefined || value === null || value === '') return [];
  const arr = Array.isArray(value) ? value : String(value).split(',');
  return arr.map((v) => String(v).trim()).filter(Boolean);
};

export const pick = (obj, keys) =>
  keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});

export const round = (value, digits = 2) => {
  const f = 10 ** digits;
  return Math.round((Number(value) || 0) * f) / f;
};

export const sum = (items, fn = (x) => x) => items.reduce((acc, item) => acc + (Number(fn(item)) || 0), 0);

export const slugCode = (value) =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

/** Builds a {$gte,$lte} date range from optional from/to strings. */
export function dateRange(from, to) {
  const range = {};
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) range.$gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      range.$lte = d;
    }
  }
  return Object.keys(range).length ? range : undefined;
}
