import { ArrowDown, ArrowUp, ArrowUpDown, SearchX } from 'lucide-react';
import { cn } from '@/utils/cn';
import { TableSkeleton } from './LoadingSkeleton';
import { EmptyState } from './Feedback';

/**
 * Responsive data table.
 *  • Desktop: sortable table with sticky header.
 *  • Mobile: each row becomes a card (`renderMobile(row)` or auto label/value pairs).
 *
 * columns: [{ key, header, render(row), sortKey, align, className, hideBelow: 'md'|'lg'|'xl', mobile: false }]
 * sort: "-field" | "field"
 */
export function DataTable({
  columns,
  data = [],
  loading = false,
  refreshing = false,
  sort,
  onSortChange,
  onRowClick,
  rowKey = (row) => row._id,
  empty,
  renderMobile,
  className,
  rowClassName,
  caption,
}) {
  const sortField = sort?.replace(/^-/, '');
  const sortDir = sort?.startsWith('-') ? 'desc' : 'asc';

  const toggleSort = (key) => {
    if (!onSortChange) return;
    if (sortField === key) onSortChange(sortDir === 'asc' ? `-${key}` : key);
    else onSortChange(`-${key}`);
  };

  if (loading && !data.length) return <TableSkeleton columns={Math.min(columns.length, 6)} />;
  if (!loading && !data.length) {
    return empty === undefined ? <EmptyState compact icon={SearchX} title="No results" description="Nothing matches the current search or filters." /> : empty;
  }

  const hideClass = { sm: 'hidden sm:table-cell', md: 'hidden md:table-cell', lg: 'hidden lg:table-cell', xl: 'hidden xl:table-cell', '2xl': 'hidden 2xl:table-cell' };

  return (
    <div className={cn('relative transition-opacity', refreshing && 'pointer-events-none opacity-60', className)}>
      {/* Desktop table */}
      <div className="scrollbar-thin hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-line bg-surface-2/70">
              {columns.map((col) => {
                const sortable = Boolean(col.sortKey && onSortChange);
                const active = sortable && sortField === col.sortKey;
                const SortIcon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn(
                      'whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-3 first:pl-5 last:pr-5',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.hideBelow && hideClass[col.hideBelow],
                      col.headerClassName
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.sortKey)}
                        className={cn('inline-flex items-center gap-1 uppercase transition hover:text-ink', active && 'text-ink', col.align === 'right' && 'flex-row-reverse')}
                      >
                        {col.header}
                        <SortIcon size={12} className={active ? 'opacity-100' : 'opacity-40'} aria-hidden />
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => e.key === 'Enter' && e.target === e.currentTarget && onRowClick(row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn('group transition-colors', onRowClick && 'cursor-pointer hover:bg-surface-2 focus-visible:bg-surface-2', rowClassName?.(row))}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3.5 align-middle first:pl-5 last:pr-5',
                      col.align === 'right' && 'text-right',
                      col.align === 'center' && 'text-center',
                      col.hideBelow && hideClass[col.hideBelow],
                      col.className
                    )}
                  >
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-line md:hidden">
        {data.map((row) => (
          <li key={rowKey(row)}>
            <div
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (e) => e.key === 'Enter' && onRowClick(row) : undefined}
              className={cn('px-4 py-3.5', onRowClick && 'active:bg-surface-2')}
            >
              {renderMobile ? (
                renderMobile(row)
              ) : (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {columns
                    .filter((c) => c.mobile !== false)
                    .map((col) => (
                      <div key={col.key} className={cn('min-w-0', col.mobileFull && 'col-span-2')}>
                        <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-3">{col.header}</dt>
                        <dd className="mt-0.5 text-sm text-ink">{col.render ? col.render(row) : row[col.key]}</dd>
                      </div>
                    ))}
                </dl>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
