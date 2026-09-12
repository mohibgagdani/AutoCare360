import { useId, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { CountPill } from './Badge';

/**
 * Underlined tabs with an animated indicator; scrolls horizontally on mobile.
 *   <Tabs tabs={[{ value, label, icon, count }]} value={tab} onChange={setTab} />
 */
export function Tabs({ tabs, value, onChange, className }) {
  const layoutId = useId();
  const listRef = useRef(null);

  const onKeyDown = (e) => {
    const idx = tabs.findIndex((t) => t.value === value);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = tabs[(idx + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      onChange(next.value);
      listRef.current?.querySelector(`[data-tab="${next.value}"]`)?.focus();
    }
  };

  return (
    <div className={cn('scrollbar-none -mx-1 overflow-x-auto border-b border-line', className)}>
      <div ref={listRef} role="tablist" className="flex min-w-max gap-1 px-1" onKeyDown={onKeyDown}>
        {tabs.map((tab) => {
          const active = tab.value === value;
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              data-tab={tab.value}
              role="tab"
              type="button"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(tab.value)}
              className={cn(
                'relative flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors',
                active ? 'text-ink' : 'text-ink-3 hover:text-ink'
              )}
            >
              {Icon && <Icon size={16} aria-hidden />}
              {tab.label}
              {tab.count !== undefined && <CountPill count={tab.count} tone={tab.countTone} />}
              {active && (
                <motion.span
                  layoutId={layoutId}
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600 dark:bg-brand-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Pill-style segmented control for 2–4 options. */
export function SegmentedControl({ options, value, onChange, size = 'sm', className, ariaLabel }) {
  const layoutId = useId();
  return (
    <div role="radiogroup" aria-label={ariaLabel} className={cn('inline-flex rounded-xl bg-surface-3 p-1', className)}>
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label}
            title={o.label}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative flex items-center gap-1.5 rounded-lg font-medium transition-colors',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
              active ? 'text-ink' : 'text-ink-3 hover:text-ink'
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-surface shadow-sm ring-1 ring-line"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="relative flex items-center gap-1.5">
              {Icon && <Icon size={14} aria-hidden />}
              {!o.iconOnly && o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
