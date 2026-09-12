import { CalendarRange, ChevronDown, Check } from 'lucide-react';
import { addDays, format, startOfMonth, startOfYear, subDays, subMonths } from 'date-fns';
import { usePopover, PopoverPanel } from './Menu';
import { Input } from './Form';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

const iso = (d) => format(d, 'yyyy-MM-dd');

const PAST_PRESETS = () => {
  const today = new Date();
  return [
    { label: 'Last 30 days', from: iso(subDays(today, 30)), to: iso(today) },
    { label: 'Last 90 days', from: iso(subDays(today, 90)), to: iso(today) },
    { label: 'This month', from: iso(startOfMonth(today)), to: iso(today) },
    { label: 'Last 6 months', from: iso(subMonths(today, 6)), to: iso(today) },
    { label: 'This year', from: iso(startOfYear(today)), to: iso(today) },
  ];
};

const FUTURE_PRESETS = () => {
  const today = new Date();
  return [
    { label: 'Next 7 days', from: iso(today), to: iso(addDays(today, 7)) },
    { label: 'Next 30 days', from: iso(today), to: iso(addDays(today, 30)) },
    { label: 'Next 90 days', from: iso(today), to: iso(addDays(today, 90)) },
    { label: 'Already past', from: '', to: iso(subDays(today, 1)) },
  ];
};

/**
 * Date-range filter: presets + custom from/to in a popover.
 * mode: 'past' (history, expenses) | 'future' (due dates)
 */
export function DateRangeFilter({ label = 'Date', from = '', to = '', onChange, mode = 'past', align = 'start' }) {
  const popover = usePopover(align);
  const presets = mode === 'future' ? FUTURE_PRESETS() : PAST_PRESETS();
  const active = presets.find((p) => p.from === from && p.to === to);
  const summary = active ? active.label : from || to ? `${from ? formatDate(from, 'd MMM yy') : '…'} – ${to ? formatDate(to, 'd MMM yy') : '…'}` : null;

  return (
    <>
      <button
        ref={popover.anchorRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={popover.open}
        onClick={() => popover.setOpen((o) => !o)}
        className={cn(
          'inline-flex h-9 shrink-0 items-center gap-2 rounded-xl border px-3 text-[13px] font-medium whitespace-nowrap transition',
          summary
            ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300'
            : 'border-line-strong/80 bg-surface text-ink-2 hover:border-line-strong hover:text-ink'
        )}
      >
        <CalendarRange size={15} aria-hidden />
        <span>{label}</span>
        {summary && <span className="border-l border-current/20 pl-2 font-semibold">{summary}</span>}
        <ChevronDown size={14} className={cn('transition', popover.open && 'rotate-180')} aria-hidden />
      </button>
      <PopoverPanel popover={popover} className="w-72 p-2">
        <div className="space-y-0.5">
          {presets.map((p) => {
            const selected = active?.label === p.label;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  onChange({ from: p.from, to: p.to });
                  popover.setOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-surface-3"
              >
                <span className="flex h-4 w-4 items-center justify-center">{selected && <Check size={15} strokeWidth={2.6} className="text-brand-600" />}</span>
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="mt-2 border-t border-line px-1 pb-1 pt-3">
          <p className="mb-2 text-xs font-medium text-ink-3">Custom range</p>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" size="sm" aria-label="From" value={from} max={to || undefined} onChange={(e) => onChange({ from: e.target.value, to })} className="px-2 text-[13px]" />
            <Input type="date" size="sm" aria-label="To" value={to} min={from || undefined} onChange={(e) => onChange({ from, to: e.target.value })} className="px-2 text-[13px]" />
          </div>
          {(from || to) && (
            <button
              type="button"
              onClick={() => {
                onChange({ from: '', to: '' });
                popover.setOpen(false);
              }}
              className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-ink-3 hover:bg-surface-3 hover:text-ink"
            >
              Clear dates
            </button>
          )}
        </div>
      </PopoverPanel>
    </>
  );
}
