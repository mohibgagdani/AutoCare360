import { motion } from 'framer-motion';
import { AlertOctagon, RefreshCw, WifiOff } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from './Button';
import { getErrorMessage } from '@/utils/errors';
import { useEntrance } from '@/hooks/useMotion';

export function Spinner({ size = 18, className }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn('inline-block animate-spin rounded-full border-2 border-current border-t-transparent opacity-70', className)}
      style={{ width: size, height: size }}
    />
  );
}

/** Friendly empty state with an illustration-style icon and optional action. */
export function EmptyState({ icon: Icon, title, description, action, className, compact = false }) {
  const initial = useEntrance({ opacity: 0, y: 6 });
  return (
    <motion.div
      initial={initial}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-14', className)}
    >
      {Icon && (
        <div className="relative mb-5">
          <div className="absolute inset-0 scale-150 rounded-full bg-brand-500/10 blur-2xl" aria-hidden />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-gradient-to-b from-surface to-surface-2 text-brand-600 shadow-card dark:text-brand-300">
            <Icon size={24} aria-hidden />
          </div>
        </div>
      )}
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-3">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </motion.div>
  );
}

export function ErrorState({ error, onRetry, title, className, compact }) {
  const offline = error?.isNetworkError;
  return (
    <EmptyState
      compact={compact}
      className={className}
      icon={offline ? WifiOff : AlertOctagon}
      title={title || (offline ? 'You appear to be offline' : "We couldn't load this")}
      description={getErrorMessage(error)}
      action={
        onRetry && (
          <Button variant="secondary" size="sm" leftIcon={RefreshCw} onClick={() => onRetry()}>
            Try again
          </Button>
        )
      }
    />
  );
}

const BAR_TONES = {
  green: 'bg-emerald-500',
  blue: 'bg-brand-500',
  yellow: 'bg-amber-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
};
const TRACK_TONES = {
  green: 'bg-emerald-500/15',
  blue: 'bg-brand-500/15',
  yellow: 'bg-amber-500/15',
  orange: 'bg-orange-500/15',
  red: 'bg-red-500/15',
};

/** Meter — the track is a lighter step of the fill's own hue. */
export function ProgressBar({ value = 0, tone, className, height = 'h-1.5', label }) {
  const pct = Math.max(0, Math.min(100, value));
  const initial = useEntrance({ width: 0 });
  const resolved = tone || (value >= 100 ? 'red' : value >= 85 ? 'orange' : value >= 70 ? 'yellow' : 'green');
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full', height, TRACK_TONES[resolved], className)}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <motion.div
        className={cn('h-full rounded-full', BAR_TONES[resolved])}
        initial={initial}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
    </div>
  );
}

export function Kbd({ children, className }) {
  return (
    <kbd className={cn('rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[10.5px] font-medium text-ink-3', className)}>
      {children}
    </kbd>
  );
}

/** Callout banner for inline alerts. */
export function Callout({ tone = 'info', icon: Icon, title, children, action, className }) {
  const tones = {
    info: 'border-blue-200 bg-blue-50/70 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-200',
    warning: 'border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200',
    danger: 'border-red-200 bg-red-50/70 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200',
    success: 'border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200',
  };
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3 text-sm', tones[tone], className)} role={tone === 'danger' ? 'alert' : undefined}>
      {Icon && <Icon size={18} className="mt-0.5 shrink-0" aria-hidden />}
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
      {action}
    </div>
  );
}
