import { Link } from 'react-router-dom';
import { Wrench, History, Receipt, SkipForward } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@/utils/constants';
import { formatCurrency, formatRelative } from '@/utils/format';
import { vehicleName } from '@/utils/vehicle';
import { cn } from '@/utils/cn';

const TYPE_META = {
  service: { icon: History, className: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300', link: '/app/service-history' },
  maintenance: { icon: Wrench, className: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300', link: '/app/maintenance?history=true' },
  skipped: { icon: SkipForward, className: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300', link: '/app/maintenance?history=true' },
  expense: { icon: Receipt, className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300', link: '/app/expenses' },
};

/** Vertical activity timeline (services, expenses, completed maintenance). */
export function ActivityTimeline({ items, showVehicle = true, className }) {
  return (
    <ol className={cn('relative space-y-1', className)}>
      {items.map((item, i) => {
        const meta = TYPE_META[item.type] || TYPE_META.expense;
        const Icon = item.type === 'expense' ? EXPENSE_CATEGORIES[item.category]?.icon || meta.icon : meta.icon;
        return (
          <li key={`${item.type}-${item.id}`} className="relative">
            {i < items.length - 1 && <span className="absolute left-[19px] top-11 h-[calc(100%-28px)] w-px bg-line" aria-hidden />}
            <Link to={meta.link} className="flex items-start gap-3 rounded-xl p-2 transition hover:bg-surface-2">
              <span className={cn('relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-4 ring-surface', meta.className)}>
                <Icon size={16} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink">{item.title}</span>
                  {item.amount > 0 && <span className="shrink-0 text-sm font-semibold text-ink tabular">{formatCurrency(item.amount)}</span>}
                </span>
                <span className="block truncate text-xs text-ink-3">
                  {showVehicle && item.vehicle ? `${vehicleName(item.vehicle)} · ` : ''}
                  {formatRelative(item.date)}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
