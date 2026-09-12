/**
 * Pure maintenance maths — no database access, fully deterministic, easy to test.
 *
 * Example (spec §32):
 *   last service 01 Jan 2026 @ 40,000 km, interval 10,000 km OR 12 months
 *   → next due at 50,000 km OR 01 Jan 2027, whichever comes first.
 */
import { addMonths, diffInDays } from '../utils/dates.js';
import { TASK_STATUS, HEALTH_LABELS } from '../constants/enums.js';

const AVG_DAYS_PER_MONTH = 30.44;

const STATUS_RANK = Object.freeze({
  [TASK_STATUS.UP_TO_DATE]: 0,
  [TASK_STATUS.DUE_SOON]: 1,
  [TASK_STATUS.DUE]: 2,
  [TASK_STATUS.OVERDUE]: 3,
});

export const statusRank = (status) => STATUS_RANK[status] ?? -1;

/** Next due date and odometer from the last time the item was performed. */
export function computeNextDue({ lastPerformedDate, lastPerformedOdometer, intervalKm, intervalMonths }) {
  const nextDueDate = intervalMonths && lastPerformedDate ? addMonths(lastPerformedDate, intervalMonths) : null;
  const nextDueOdometer =
    intervalKm && lastPerformedOdometer !== null && lastPerformedOdometer !== undefined
      ? Number(lastPerformedOdometer) + Number(intervalKm)
      : null;
  return { nextDueDate, nextDueOdometer };
}

/**
 * Warning windows scale with the interval so a monthly check doesn't sit in
 * "due soon" forever and a 5-year item still gets a month's notice.
 */
export function thresholds({ intervalKm, intervalMonths }) {
  const intervalDays = intervalMonths ? intervalMonths * AVG_DAYS_PER_MONTH : null;
  return {
    dueDays: intervalDays ? Math.max(1, Math.min(7, Math.round(intervalDays * 0.15))) : 7,
    soonDays: intervalDays ? Math.max(3, Math.min(30, Math.round(intervalDays * 0.3))) : 30,
    dueKm: intervalKm ? Math.min(500, Math.round(intervalKm * 0.05)) : 300,
    soonKm: intervalKm ? Math.min(1500, Math.round(intervalKm * 0.15)) : 1000,
  };
}

function classify(left, dueWindow, soonWindow) {
  if (left === null || left === undefined) return null;
  if (left < 0) return TASK_STATUS.OVERDUE;
  if (left <= dueWindow) return TASK_STATUS.DUE;
  if (left <= soonWindow) return TASK_STATUS.DUE_SOON;
  return TASK_STATUS.UP_TO_DATE;
}

/**
 * Evaluates an open task against the vehicle's current odometer and today's date.
 * The status is the worse of the time-based and distance-based results.
 */
export function evaluateTask(task, { currentOdometer, now = new Date() } = {}) {
  const { nextDueDate, nextDueOdometer, intervalKm, intervalMonths, lastPerformedDate, lastPerformedOdometer } =
    task;
  const t = thresholds({ intervalKm, intervalMonths });

  const daysLeft = nextDueDate ? diffInDays(nextDueDate, now) : null;
  const kmLeft =
    nextDueOdometer !== null && nextDueOdometer !== undefined && currentOdometer !== null && currentOdometer !== undefined
      ? Math.round(Number(nextDueOdometer) - Number(currentOdometer))
      : null;

  const byDate = classify(daysLeft, t.dueDays, t.soonDays);
  const byKm = classify(kmLeft, t.dueKm, t.soonKm);

  let status = TASK_STATUS.UP_TO_DATE;
  let dueBy = null;
  if (byDate || byKm) {
    const dateRank = statusRank(byDate);
    const kmRank = statusRank(byKm);
    if (kmRank > dateRank) {
      status = byKm;
      dueBy = 'odometer';
    } else if (dateRank > kmRank) {
      status = byDate;
      dueBy = 'date';
    } else {
      status = byDate || byKm;
      // Same severity: attribute it to whichever threshold is relatively closer.
      const dateFraction = intervalMonths && daysLeft !== null ? daysLeft / (intervalMonths * AVG_DAYS_PER_MONTH) : Infinity;
      const kmFraction = intervalKm && kmLeft !== null ? kmLeft / intervalKm : Infinity;
      dueBy = kmFraction < dateFraction ? 'odometer' : 'date';
    }
  }

  // 0 → just serviced, 1 → due now, >1 → overdue. Used for progress bars.
  let progress = 0;
  if (intervalMonths && lastPerformedDate) {
    const elapsed = -diffInDays(lastPerformedDate, now);
    progress = Math.max(progress, elapsed / (intervalMonths * AVG_DAYS_PER_MONTH));
  }
  if (intervalKm && lastPerformedOdometer !== null && lastPerformedOdometer !== undefined && currentOdometer !== undefined) {
    progress = Math.max(progress, (Number(currentOdometer) - Number(lastPerformedOdometer)) / intervalKm);
  }
  if (!lastPerformedDate && (daysLeft !== null || kmLeft !== null)) {
    // Rescheduled/custom tasks without history: derive progress from the remaining window.
    if (status === TASK_STATUS.OVERDUE) progress = Math.max(progress, 1.05);
  }

  return {
    status,
    dueBy: status === TASK_STATUS.UP_TO_DATE ? null : dueBy,
    daysLeft,
    kmLeft,
    progress: Math.max(0, Math.round(progress * 1000) / 1000),
  };
}

const PRIORITY_WEIGHT = Object.freeze({ critical: 36, high: 28, medium: 16, low: 8 });

export function healthLabel(score) {
  return HEALTH_LABELS.find((h) => score >= h.min)?.label || 'critical';
}

/** Penalty for a group of tasks: worst item counts fully, extra items add log-scaled weight. */
function groupPenalty(tasks, { factor, perExtra }) {
  if (!tasks.length) return 0;
  const worst = Math.max(...tasks.map((t) => PRIORITY_WEIGHT[t.priority] || PRIORITY_WEIGHT.medium));
  return worst * factor + perExtra * Math.log2(tasks.length);
}

/**
 * Vehicle health score 0–100.
 *  90–100 Excellent · 75–89 Good · 50–74 Needs attention · 0–49 Critical
 *
 * Items missed at the same visit tend to be overdue together, so the score is
 * driven by the most severe item per status with diminishing (log₂) weight for
 * the rest — one missed service reads "needs attention", sustained neglect of
 * critical items reads "critical".
 *   • single high-priority item overdue → 72 · single critical overdue → 64
 *   • expired statutory documents cost 10 points each (max 20)
 */
export function computeHealthScore(openTasks = [], { expiredDocuments = 0 } = {}) {
  const byStatus = (s) => openTasks.filter((t) => t.status === s);
  const overdue = byStatus(TASK_STATUS.OVERDUE);
  const due = byStatus(TASK_STATUS.DUE);
  const dueSoon = byStatus(TASK_STATUS.DUE_SOON);

  const penalty =
    groupPenalty(overdue, { factor: 1, perExtra: 4 }) +
    groupPenalty(due, { factor: 0.45, perExtra: 2 }) +
    Math.min(8, dueSoon.length) +
    Math.min(20, expiredDocuments * 10);

  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  return { score, label: healthLabel(score) };
}

/** Lower = more urgent. Used to order upcoming timelines. */
export function urgencyScore(task, currentOdometer, now = new Date()) {
  const { daysLeft, kmLeft } = evaluateTask(task, { currentOdometer, now });
  const byDate = daysLeft === null ? Infinity : daysLeft;
  // Convert km to an approximate day equivalent assuming ~40 km/day average use.
  const byKm = kmLeft === null ? Infinity : kmLeft / 40;
  return Math.min(byDate, byKm);
}

/** Rough ETA for an odometer-based due point given an average daily usage. */
export function estimateDateForOdometer(targetOdometer, currentOdometer, avgPerDay, now = new Date()) {
  if (!targetOdometer || !avgPerDay || avgPerDay <= 0) return null;
  const days = Math.max(0, (targetOdometer - currentOdometer) / avgPerDay);
  return new Date(now.getTime() + days * 86400000);
}
