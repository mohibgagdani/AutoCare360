import { cn } from '@/utils/cn';
import { TASK_STATUS, PRIORITY, HEALTH, EXPIRY_STATUS, healthKey } from '@/utils/constants';

const TONES = {
  gray: 'bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:ring-slate-500/25',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/30',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/30',
  yellow: 'bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/30',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/30',
  red: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/30',
  teal: 'bg-teal-50 text-teal-700 ring-teal-200 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-500/30',
  brand: 'bg-brand-50 text-brand-700 ring-brand-200 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/30',
};

const DOTS = {
  gray: 'bg-slate-400',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  violet: 'bg-violet-500',
  teal: 'bg-teal-500',
  brand: 'bg-brand-500',
};

export function Badge({ tone = 'gray', icon: Icon, dot = false, size = 'sm', className, children, pulse = false, ...props }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full font-medium whitespace-nowrap ring-1 ring-inset',
        size === 'xs' ? 'px-1.5 py-px text-[10.5px]' : size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11.5px]',
        TONES[tone] || TONES.gray,
        className
      )}
      {...props}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', DOTS[tone], pulse && 'animate-pulse')} aria-hidden />}
      {Icon && <Icon size={size === 'xs' ? 10 : 12} strokeWidth={2.4} aria-hidden />}
      {children}
    </span>
  );
}

/** Maintenance status badge — colour + icon + label (never colour alone). */
export function StatusBadge({ status, size, className, showIcon = true }) {
  const meta = TASK_STATUS[status] || { label: status, tone: 'gray' };
  return (
    <Badge tone={meta.tone} icon={showIcon ? meta.icon : undefined} size={size} className={className}>
      {meta.label}
    </Badge>
  );
}

export function PriorityBadge({ priority, size, className }) {
  const meta = PRIORITY[priority] || PRIORITY.medium;
  return (
    <Badge tone={meta.tone} dot size={size} className={cn('ring-0 bg-transparent px-0 dark:bg-transparent', className)}>
      {meta.label}
    </Badge>
  );
}

export function HealthBadge({ score, size, className }) {
  const key = healthKey(score ?? 100);
  return (
    <Badge tone={HEALTH[key].tone} dot size={size} className={className}>
      {HEALTH[key].label}
    </Badge>
  );
}

export function ExpiryBadge({ status, daysLeft, size }) {
  const meta = EXPIRY_STATUS[status] || EXPIRY_STATUS.no_expiry;
  let label = meta.label;
  if (status === 'expired' && daysLeft !== null) label = `Expired ${Math.abs(daysLeft)}d ago`;
  if (status === 'expiring_soon' && daysLeft !== null) label = daysLeft === 0 ? 'Expires today' : `Expires in ${daysLeft}d`;
  return (
    <Badge tone={meta.tone} dot size={size} pulse={status === 'expired'}>
      {label}
    </Badge>
  );
}

export function CountPill({ count, tone = 'gray', className }) {
  if (count === undefined || count === null) return null;
  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular',
        tone === 'red' ? 'bg-red-500 text-white' : tone === 'brand' ? 'bg-brand-600 text-white' : 'bg-surface-3 text-ink-2',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
