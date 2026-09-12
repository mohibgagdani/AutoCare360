import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatNumber } from '@/utils/format';

function pageList(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, page, page - 1, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push('…');
    out.push(p);
  });
  return out;
}

/** "Showing 11–20 of 132" + page buttons. Accepts the API's meta.pagination. */
export function Pagination({ pagination, onPageChange, className, label = 'results' }) {
  // Deleting the last row of the last page (or a stale URL) leaves `page` past the end — snap back.
  const outOfRange = Boolean(pagination?.total) && pagination.page > pagination.totalPages;
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;
  const lastPage = pagination?.totalPages;
  useEffect(() => {
    if (outOfRange) onPageChangeRef.current(lastPage);
  }, [outOfRange, lastPage]);

  if (!pagination || pagination.total === 0 || outOfRange) return null;
  const { page, limit, total, totalPages } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const btn = 'flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm font-medium transition disabled:pointer-events-none disabled:opacity-40';

  return (
    <nav className={cn('flex flex-col items-center justify-between gap-3 border-t border-line px-5 py-3.5 sm:flex-row', className)} aria-label="Pagination">
      <p className="text-[13px] text-ink-3">
        Showing <span className="font-medium text-ink">{formatNumber(from)}</span>–<span className="font-medium text-ink">{formatNumber(to)}</span> of{' '}
        <span className="font-medium text-ink">{formatNumber(total)}</span> {label}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" className={cn(btn, 'text-ink-2 hover:bg-surface-3')} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft size={16} />
          </button>
          {pageList(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="px-1 text-ink-3">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn(btn, p === page ? 'bg-brand-600 text-white shadow-sm dark:bg-brand-500' : 'text-ink-2 hover:bg-surface-3', p !== page && Math.abs(p - page) > 1 && 'hidden sm:flex')}
              >
                {p}
              </button>
            )
          )}
          <button type="button" className={cn(btn, 'text-ink-2 hover:bg-surface-3')} onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </nav>
  );
}
