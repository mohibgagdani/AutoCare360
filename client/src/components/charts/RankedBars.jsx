import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useEntrance } from '@/hooks/useMotion';

/**
 * Horizontal ranking bars in HTML (one series → one colour). Values are printed
 * beside every bar, so nothing depends on hover.
 * items: [{ key, label, value, icon?, sub? }]
 */
export function RankedBars({ items, format = (v) => v, max: maxOverride, limit = 7, color = 'var(--chart-1)', className }) {
  const shown = items.slice(0, limit);
  const rest = items.slice(limit);
  const rows = rest.length ? [...shown, { key: '__other', label: `Other (${rest.length})`, value: rest.reduce((s, i) => s + i.value, 0) }] : shown;
  const max = maxOverride || Math.max(...rows.map((r) => r.value), 1);
  const initial = useEntrance({ width: 0 });

  return (
    <ul className={cn('space-y-3', className)}>
      {rows.map((row, i) => {
        const Icon = row.icon;
        return (
          <li key={row.key}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
              <span className="flex min-w-0 items-center gap-2 text-ink-2">
                {Icon && <Icon size={14} className="shrink-0 text-ink-3" aria-hidden />}
                <span className="truncate">{row.label}</span>
                {row.sub && <span className="shrink-0 text-xs text-ink-3">{row.sub}</span>}
              </span>
              <span className="shrink-0 font-semibold text-ink tabular">{format(row.value)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-3">
              <motion.div
                className="h-full rounded-full"
                style={{ background: row.key === '__other' ? 'var(--c-line-strong)' : color }}
                initial={initial}
                animate={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
                transition={{ duration: 0.6, delay: i * 0.04, ease: 'easeOut' }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
