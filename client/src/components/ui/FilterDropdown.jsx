import { useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/utils/cn';
import { usePopover, PopoverPanel } from './Menu';

/**
 * Filter button with a popover list.
 *   single:  value = 'x' | ''      onChange('x')
 *   multiple: value = 'a,b' (string, URL-friendly) onChange('a,b')
 * options: [{ value, label, icon?, color?, count? }]
 */
export function FilterDropdown({ label, icon: Icon, options, value = '', onChange, multiple = false, searchable, align = 'start', className, allLabel = 'All' }) {
  const popover = usePopover(align);
  const [query, setQuery] = useState('');
  const selected = useMemo(() => (value ? String(value).split(',').filter(Boolean) : []), [value]);
  const showSearch = searchable ?? options.length > 8;
  const filtered = query ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())) : options;

  const toggle = (v) => {
    if (!multiple) {
      onChange(selected[0] === v ? '' : v);
      popover.setOpen(false);
      return;
    }
    const next = selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v];
    onChange(next.join(','));
  };

  const summary = !selected.length
    ? null
    : selected.length === 1
      ? options.find((o) => String(o.value) === selected[0])?.label
      : `${selected.length} selected`;

  return (
    <>
      <button
        ref={popover.anchorRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={popover.open}
        onClick={() => popover.setOpen((o) => !o)}
        className={cn(
          'inline-flex h-9 items-center gap-2 rounded-xl border px-3 text-[13px] font-medium whitespace-nowrap transition',
          selected.length
            ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300'
            : 'border-line-strong/80 bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
          className
        )}
      >
        {Icon && <Icon size={15} aria-hidden />}
        <span>{label}</span>
        {summary && <span className="max-w-32 truncate border-l border-current/20 pl-2 font-semibold">{summary}</span>}
        <ChevronDown size={14} className={cn('transition', popover.open && 'rotate-180')} aria-hidden />
      </button>
      <PopoverPanel popover={popover} className="w-64 p-1.5">
        {showSearch && (
          <div className="relative mb-1.5">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              className="h-8 w-full rounded-lg border border-line bg-surface-2 pl-8 pr-2 text-sm text-ink placeholder:text-ink-3 focus:border-brand-500 focus:outline-none"
            />
          </div>
        )}
        <div role="listbox" aria-multiselectable={multiple} className="scrollbar-thin max-h-72 overflow-y-auto">
          {!multiple && (
            <button
              type="button"
              role="option"
              aria-selected={!selected.length}
              onClick={() => {
                onChange('');
                popover.setOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink-2 hover:bg-surface-3"
            >
              <span className="flex h-4 w-4 items-center justify-center">{!selected.length && <Check size={15} strokeWidth={2.6} className="text-brand-600" />}</span>
              {allLabel}
            </button>
          )}
          {filtered.map((o) => {
            const isSelected = selected.includes(String(o.value));
            const OptIcon = o.icon;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => toggle(String(o.value))}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-surface-3"
              >
                {multiple ? (
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      isSelected ? 'border-brand-600 bg-brand-600 text-white' : 'border-line-strong'
                    )}
                  >
                    {isSelected && <Check size={11} strokeWidth={3} />}
                  </span>
                ) : (
                  <span className="flex h-4 w-4 items-center justify-center">{isSelected && <Check size={15} strokeWidth={2.6} className="text-brand-600" />}</span>
                )}
                {o.color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: o.color }} aria-hidden />}
                {OptIcon && <OptIcon size={15} className="shrink-0 text-ink-3" aria-hidden />}
                <span className="flex-1 truncate">{o.label}</span>
                {o.count !== undefined && <span className="text-xs text-ink-3 tabular">{o.count}</span>}
              </button>
            );
          })}
          {!filtered.length && <p className="px-2.5 py-3 text-center text-sm text-ink-3">No matches</p>}
        </div>
        {multiple && selected.length > 0 && (
          <div className="mt-1 border-t border-line pt-1">
            <button type="button" onClick={() => onChange('')} className="w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-ink-3 hover:bg-surface-3 hover:text-ink">
              Clear selection
            </button>
          </div>
        )}
      </PopoverPanel>
    </>
  );
}
