import { motion } from 'framer-motion';
import { HEALTH, healthKey } from '@/utils/constants';
import { cn } from '@/utils/cn';
import { useEntrance } from '@/hooks/useMotion';

/**
 * Circular vehicle health score (0–100). The ring carries the status colour;
 * the label is always printed so colour never carries meaning alone.
 */
export function HealthRing({ score = 100, size = 96, stroke = 9, showLabel = true, className }) {
  const key = healthKey(score);
  const meta = HEALTH[key];
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = Math.max(0, Math.min(100, score));
  const initial = useEntrance({ strokeDashoffset: circumference });

  return (
    <div className={cn('relative inline-flex shrink-0 items-center justify-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" role="img" aria-label={`Health score ${value} of 100, ${meta.label}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-surface-3" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={meta.color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={initial}
          animate={{ strokeDashoffset: circumference * (1 - value / 100) }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-semibold leading-none text-ink" style={{ fontSize: size * 0.27 }}>
          {value}
        </span>
        {showLabel && size >= 80 && <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-ink-3">Health</span>}
      </div>
    </div>
  );
}

/** Compact inline health meter used in lists. */
export function HealthMeter({ score = 100, className }) {
  const meta = HEALTH[healthKey(score)];
  return (
    <div className={cn('flex items-center gap-2', className)} title={`${meta.label} · ${score}/100`}>
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full" style={{ width: `${score}%`, background: meta.color }} />
      </div>
      <span className="text-xs font-semibold tabular text-ink">{score}</span>
    </div>
  );
}
