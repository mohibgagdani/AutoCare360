const DAY_MS = 24 * 60 * 60 * 1000;

export const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const startOfMonth = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), 1);

export const startOfYear = (date = new Date()) => new Date(date.getFullYear(), 0, 1);

/** Adds calendar months, clamping to the last day of the target month (Jan 31 + 1m → Feb 28/29). */
export function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, lastDay));
  return d;
}

export const addDays = (date, days) => new Date(new Date(date).getTime() + days * DAY_MS);

/** Whole days from `from` to `to` (negative when `to` is in the past). */
export const diffInDays = (to, from = new Date()) =>
  Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);

/** Timezone used for calendar-month bucketing in reports (matches Mongo $dateToString). */
export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';
const ymFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE, year: 'numeric', month: '2-digit' });

/** "YYYY-MM" in the application timezone. */
export const monthKey = (date) => {
  const parts = ymFormatter.formatToParts(new Date(date));
  const year = parts.find((p) => p.type === 'year').value;
  const month = parts.find((p) => p.type === 'month').value;
  return `${year}-${month}`;
};

/** Returns the last `count` month keys ending with the current month, oldest first. */
export function lastMonthKeys(count, now = new Date()) {
  const [year, month] = monthKey(now).split('-').map(Number);
  const keys = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    keys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

export const isValidDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

export const DAY_IN_MS = DAY_MS;
