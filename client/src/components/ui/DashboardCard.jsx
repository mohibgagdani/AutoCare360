import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, animate, useInView } from 'framer-motion';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useEntrance, useReducedMotionPref } from '@/hooks/useMotion';

const ICON_TONES = {
  blue: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300',
  green: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  yellow: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  orange: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300',
  red: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
  teal: 'bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300',
  gray: 'bg-surface-3 text-ink-2',
};

/** Animates a number from 0 to its value the first time it scrolls into view. */
export function CountUp({ value, format = (v) => Math.round(v).toLocaleString('en-IN'), duration = 0.9 }) {
  const ref = useRef(null);
  const reduced = useReducedMotionPref();
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(reduced ? value : 0);
  useEffect(() => {
    if (typeof value !== 'number') return undefined;
    if (reduced) {
      setDisplay(value);
      return undefined;
    }
    if (!inView) return undefined;
    const controls = animate(0, value, { duration, ease: 'easeOut', onUpdate: setDisplay });
    return () => controls.stop();
  }, [inView, value, duration, reduced]);
  return <span ref={ref}>{typeof value === 'number' ? format(display) : value}</span>;
}

/**
 * KPI stat tile: label · value · optional delta vs a named period · sub-text.
 * `delta.goodWhenUp` decides whether an increase is shown as good or bad.
 */
export function DashboardCard({ label, value, format, icon: Icon, tone = 'blue', sub, delta, to, index = 0, className, children }) {
  const entrance = useEntrance({ opacity: 0, y: 12 });
  const deltaUp = delta && delta.value > 0;
  const deltaGood = delta && (delta.goodWhenUp ? deltaUp : !deltaUp);
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-medium text-ink-2">{label}</p>
        {Icon && (
          <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', ICON_TONES[tone])}>
            <Icon size={18} aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-tight tracking-tight text-ink">
        <CountUp value={value} format={format} />
      </p>
      <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        {delta && delta.value !== null && delta.value !== undefined && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-semibold',
              deltaGood ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
            )}
          >
            {deltaUp ? <ArrowUpRight size={12} aria-hidden /> : <ArrowDownRight size={12} aria-hidden />}
            {Math.abs(delta.value)}%
          </span>
        )}
        {sub && <span className="text-ink-3">{sub}</span>}
      </div>
      {children}
    </>
  );

  const classes = cn(
    'group relative block overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-card transition-all duration-200',
    to && 'hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card-hover',
    className
  );

  return (
    <motion.div initial={entrance} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.35 }}>
      {to ? (
        <Link to={to} className={classes}>
          {body}
        </Link>
      ) : (
        <div className={classes}>{body}</div>
      )}
    </motion.div>
  );
}
