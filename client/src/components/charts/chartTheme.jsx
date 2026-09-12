import { cn } from '@/utils/cn';

/** Categorical slots — assigned in fixed order, never cycled (validated palette). */
export const SERIES = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];
export const series = (i) => SERIES[i] || SERIES[SERIES.length - 1];

export const axisProps = {
  axisLine: false,
  tickLine: false,
  tick: { fill: 'var(--chart-text)', fontSize: 11 },
  tickMargin: 8,
};

export const gridProps = { vertical: false, stroke: 'var(--chart-grid)', strokeDasharray: undefined };

/** Surface gap between touching marks (stacked segments / adjacent bars). */
export const surfaceGap = { stroke: 'var(--c-surface)', strokeWidth: 2 };

export const BAR_MAX = 24;
export const BAR_RADIUS = [4, 4, 0, 0];

export const activeDot = { r: 4, strokeWidth: 2, stroke: 'var(--c-surface)' };

/** Themed tooltip content for Recharts. */
export function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter = (v) => v, hideZero = false, total = false }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => !(hideZero && !p.value));
  const sum = rows.reduce((s, p) => s + (Number(p.value) || 0), 0);
  return (
    <div className="min-w-44 rounded-xl border border-line bg-surface/95 px-3 py-2.5 text-xs shadow-pop backdrop-blur">
      {label !== undefined && <p className="mb-1.5 font-semibold text-ink">{labelFormatter ? labelFormatter(label) : label}</p>}
      <ul className="space-y-1">
        {rows.map((p) => (
          <li key={p.dataKey || p.name} className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 text-ink-2">
              <span className="h-2 w-2 rounded-[3px]" style={{ background: p.color || p.payload?.fill }} aria-hidden />
              {p.name}
            </span>
            <span className="font-semibold text-ink tabular">{valueFormatter(p.value, p)}</span>
          </li>
        ))}
      </ul>
      {total && rows.length > 1 && (
        <div className={cn('mt-1.5 flex justify-between border-t border-line pt-1.5 font-semibold text-ink')}>
          <span>Total</span>
          <span className="tabular">{valueFormatter(sum)}</span>
        </div>
      )}
    </div>
  );
}

export const cursorFill = { fill: 'var(--c-surface-3)', opacity: 0.6 };
