import { useState } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import { Card, SegmentedControl, ChartSkeleton, EmptyState } from '@/components/ui';
import { cn } from '@/utils/cn';

/** Legend: swatch + label in text ink (never coloured text). */
export function ChartLegend({ items, className }) {
  if (!items?.length || items.length < 2) return null;
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5', className)}>
      {items.map((item) => (
        <li key={item.label} className="inline-flex items-center gap-1.5 text-xs text-ink-2">
          <span
            className={cn('shrink-0', item.type === 'line' ? 'h-0.5 w-3.5 rounded-full' : 'h-2.5 w-2.5 rounded-[3px]')}
            style={{ background: item.color }}
            aria-hidden
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/**
 * Card wrapper for every chart:
 *  • title / description / legend
 *  • chart ⇄ table toggle (the accessible twin of the chart)
 *  • skeleton on first load, dimmed content on refresh, empty state.
 *
 * table: { columns: [{ key, label, format?, align? }], rows: [] }
 */
export function ChartCard({ title, description, action, legend, table, height = 260, fluid = false, loading, refreshing, isEmpty, emptyText = 'No data for this period yet', emptyIcon, className, children }) {
  const [view, setView] = useState('chart');
  return (
    <Card className={cn('flex flex-col', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {action}
          {table && !isEmpty && (
            <SegmentedControl
              ariaLabel={`${title} view`}
              value={view}
              onChange={setView}
              options={[
                { value: 'chart', label: 'Chart view', icon: BarChart3, iconOnly: true },
                { value: 'table', label: 'Table view', icon: Table2, iconOnly: true },
              ]}
            />
          )}
        </div>
      </div>
      {legend && view === 'chart' && !isEmpty && <ChartLegend items={legend} className="px-5 pt-3" />}
      <div className={cn('flex-1 px-3 pb-4 pt-3 transition-opacity', refreshing && 'opacity-60')}>
        {loading ? (
          <ChartSkeleton height={height} />
        ) : isEmpty ? (
          <div style={{ minHeight: height }} className="flex items-center justify-center">
            <EmptyState compact icon={emptyIcon || BarChart3} title="Nothing to chart yet" description={emptyText} />
          </div>
        ) : view === 'table' && table ? (
          <div className="scrollbar-thin overflow-auto px-2" style={{ maxHeight: height + 20 }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface">
                <tr className="border-b border-line">
                  {table.columns.map((c) => (
                    <th key={c.key} scope="col" className={cn('py-2 pr-3 text-left text-xs font-semibold text-ink-3', c.align === 'right' && 'text-right')}>
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {table.rows.map((row, i) => (
                  <tr key={i}>
                    {table.columns.map((c) => (
                      <td key={c.key} className={cn('py-2 pr-3 text-ink-2 tabular', c.align === 'right' && 'text-right')}>
                        {c.format ? c.format(row[c.key], row) : row[c.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={fluid ? { minHeight: height } : { height }}>{children}</div>
        )}
      </div>
    </Card>
  );
}
