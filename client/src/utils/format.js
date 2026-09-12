import { format, formatDistanceToNowStrict, isValid, differenceInCalendarDays } from 'date-fns';

let currentCurrency = 'INR';
export const setCurrency = (code) => {
  currentCurrency = code || 'INR';
};
export const getCurrency = () => currentCurrency;

const LOCALE = 'en-IN';
const cache = new Map();
const nf = (key, options) => {
  if (!cache.has(key)) cache.set(key, new Intl.NumberFormat(LOCALE, options));
  return cache.get(key);
};

/** ₹1,23,456 — pass { compact: true } for ₹1.2L / ₹12K */
export function formatCurrency(value, { compact = false, decimals, currency = currentCurrency } = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  const key = `cur-${currency}-${compact}-${decimals}`;
  return nf(key, {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: decimals ?? (compact ? 1 : Math.abs(n) < 100 && n % 1 !== 0 ? 2 : 0),
    minimumFractionDigits: 0,
  }).format(n);
}

export function formatNumber(value, { compact = false, decimals = 0 } = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return nf(`num-${compact}-${decimals}`, {
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: decimals,
  }).format(Number(value));
}

export const formatPercent = (value, decimals = 0) =>
  value === null || value === undefined ? '—' : `${Number(value).toFixed(decimals)}%`;

const toDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isValid(d) ? d : null;
};

export function formatDate(value, pattern = 'd MMM yyyy') {
  const d = toDate(value);
  return d ? format(d, pattern) : '—';
}

export const formatDateTime = (value) => formatDate(value, 'd MMM yyyy, h:mm a');
export const formatMonth = (key) => {
  // "2026-03" → "Mar 26"
  if (!key) return '';
  const [y, m] = key.split('-').map(Number);
  return format(new Date(y, m - 1, 1), 'MMM yy');
};
export const formatMonthLong = (key) => {
  if (!key) return '';
  const [y, m] = key.split('-').map(Number);
  return format(new Date(y, m - 1, 1), 'MMMM yyyy');
};

export function formatRelative(value) {
  const d = toDate(value);
  if (!d) return '—';
  const days = differenceInCalendarDays(new Date(), d);
  if (days === 0) {
    const mins = Math.round((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    return `${Math.round(mins / 60)}h ago`;
  }
  if (days === 1) return 'yesterday';
  if (days === -1) return 'tomorrow';
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

/** Days until a date (negative = past). */
export const daysUntil = (value) => {
  const d = toDate(value);
  return d ? differenceInCalendarDays(d, new Date()) : null;
};

export function describeDays(days) {
  if (days === null || days === undefined) return '';
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `in ${days} days`;
}

/** "12,345 km" · "3,185 hrs" */
export function formatUsage(value, unit = 'km') {
  if (value === null || value === undefined) return '—';
  return `${formatNumber(value)} ${unit === 'hours' || unit === 'hrs' ? 'hrs' : 'km'}`;
}

export const toInputDate = (value) => {
  const d = toDate(value);
  return d ? format(d, 'yyyy-MM-dd') : '';
};

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

export const titleCase = (s = '') => String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const pluralize = (count, word, plural = `${word}s`) => `${formatNumber(count)} ${count === 1 ? word : plural}`;

export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
