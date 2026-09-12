import { Calendar, Gauge, Wrench } from 'lucide-react';
import { CATEGORY_ICONS } from '@/utils/constants';
import { formatDate, formatNumber } from '@/utils/format';
import { unitLabel } from '@/utils/vehicle';
import { cn } from '@/utils/cn';

/** Coloured icon tile for a maintenance category. */
export function CategoryIcon({ category, size = 32, className }) {
  const Icon = CATEGORY_ICONS[category?.icon] || Wrench;
  const color = category?.color || '#3b6af5';
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-xl', className)}
      style={{ width: size, height: size, background: `${color}1a`, color }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.5)} />
    </span>
  );
}

/**
 * Human-readable due text: "Due in 12 days · 1,200 km left", "Overdue by 2,140 km".
 * Uses daysLeft/kmLeft computed by the API.
 */
export function describeDue(task, unit = 'km') {
  const u = unitLabel(unit);
  const parts = [];
  const { daysLeft, kmLeft } = task;
  if (task.status === 'completed') return `Completed ${formatDate(task.completedAt)}`;
  if (task.status === 'skipped') return `Skipped ${formatDate(task.skippedAt)}`;
  if (daysLeft !== null && daysLeft !== undefined) {
    if (daysLeft < 0) parts.push(`${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`);
    else if (daysLeft === 0) parts.push('due today');
    else parts.push(`in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`);
  }
  if (kmLeft !== null && kmLeft !== undefined) {
    if (kmLeft < 0) parts.push(`${formatNumber(Math.abs(kmLeft))} ${u} over`);
    else parts.push(`${formatNumber(kmLeft)} ${u} left`);
  }
  return parts.join(' · ') || 'No due point';
}

/** Two-line due point: date + odometer, whichever comes first is highlighted. */
export function DuePoint({ task, unit = 'km', compact = false }) {
  const u = unitLabel(unit);
  const dateFirst = task.dueBy === 'date';
  const kmFirst = task.dueBy === 'odometer';
  const urgent = ['overdue', 'due'].includes(task.status);
  const hl = (on) => (on && urgent ? 'font-semibold text-ink' : 'text-ink-2');
  return (
    <div className={cn('flex flex-col text-[13px] leading-5', compact && 'text-xs')}>
      {task.nextDueDate && (
        <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap', hl(dateFirst))}>
          <Calendar size={12} className="text-ink-3" aria-hidden />
          {formatDate(task.nextDueDate)}
        </span>
      )}
      {task.nextDueOdometer !== null && task.nextDueOdometer !== undefined && (
        <span className={cn('inline-flex items-center gap-1.5 whitespace-nowrap tabular', hl(kmFirst))}>
          <Gauge size={12} className="text-ink-3" aria-hidden />
          {formatNumber(task.nextDueOdometer)} {u}
        </span>
      )}
      {!task.nextDueDate && (task.nextDueOdometer === null || task.nextDueOdometer === undefined) && <span className="text-ink-3">—</span>}
    </div>
  );
}

export function intervalText(task, unit = 'km') {
  const u = unitLabel(unit);
  const parts = [];
  if (task.intervalKm) parts.push(`${formatNumber(task.intervalKm)} ${u}`);
  if (task.intervalMonths) parts.push(`${task.intervalMonths} mo`);
  return parts.length ? `Every ${parts.join(' or ')}` : 'One-off';
}
