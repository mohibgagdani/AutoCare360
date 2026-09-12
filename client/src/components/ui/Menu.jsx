import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useOverlayMotion } from '@/hooks/useMotion';

/** Menu actions may be async; their handlers show their own error toasts, so swallow the rejection. */
function runItem(item) {
  const result = item.onClick?.();
  if (result && typeof result.catch === 'function') result.catch(() => {});
}

/**
 * Positions a floating panel under an anchor element (portalled, so it never
 * gets clipped by overflow containers such as tables).
 */
export function usePopover(align = 'end') {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, placeAbove: false });
  const anchorRef = useRef(null);
  const panelRef = useRef(null);

  const update = useCallback(() => {
    const a = anchorRef.current?.getBoundingClientRect();
    const p = panelRef.current;
    if (!a) return;
    const width = p?.offsetWidth || 220;
    const height = p?.offsetHeight || 200;
    const placeAbove = a.bottom + height + 12 > window.innerHeight && a.top > height + 12;
    let left = align === 'end' ? a.right - width : a.left;
    left = Math.max(8, Math.min(left, window.innerWidth - width - 8));
    setPos({ top: placeAbove ? a.top - height - 6 : a.bottom + 6, left, placeAbove });
  }, [align]);

  useLayoutEffect(() => {
    if (open) update();
  }, [open, update]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (anchorRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        anchorRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, update]);

  return { open, setOpen, anchorRef, panelRef, pos, update };
}

export function PopoverPanel({ popover, className, children, role = 'dialog', ...props }) {
  const motionProps = useOverlayMotion({ opacity: 0, y: popover.pos.placeAbove ? 4 : -4, scale: 0.98 }, { opacity: 0, scale: 0.98 });
  return createPortal(
    <AnimatePresence>
      {popover.open && (
        <motion.div
          ref={popover.panelRef}
          role={role}
          {...motionProps}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.12 }}
          style={{ position: 'fixed', top: popover.pos.top, left: popover.pos.left }}
          className={cn('z-[80] rounded-xl border border-line bg-surface p-1 shadow-pop', className)}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/**
 * Dropdown action menu.
 *   <Menu items={[{ label, icon, onClick, danger, disabled, divider }]} />
 */
export function Menu({ items, trigger, align = 'end', label = 'More actions', className, triggerClassName }) {
  const popover = usePopover(align);
  const [active, setActive] = useState(-1);
  const actionable = items.filter((i) => !i.divider && !i.hidden);

  useEffect(() => {
    if (popover.open) setActive(-1);
  }, [popover.open]);

  const onKeyDown = (e) => {
    if (!popover.open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % actionable.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + actionable.length) % actionable.length);
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      const item = actionable[active];
      if (!item.disabled) {
        popover.setOpen(false);
        runItem(item);
      }
    }
  };

  return (
    <div className={cn('relative inline-flex', className)} onKeyDown={onKeyDown}>
      <button
        ref={popover.anchorRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={popover.open}
        aria-label={trigger ? undefined : label}
        onClick={(e) => {
          e.stopPropagation();
          popover.setOpen((o) => !o);
        }}
        className={cn(
          !trigger && 'flex h-8 w-8 items-center justify-center rounded-lg text-ink-3 transition hover:bg-surface-3 hover:text-ink',
          triggerClassName
        )}
      >
        {trigger || <MoreHorizontal size={18} />}
      </button>
      <PopoverPanel popover={popover} role="menu" className="min-w-[200px]">
        {items
          .filter((i) => !i.hidden)
          .map((item, idx) => {
            if (item.divider) return <div key={`d${idx}`} className="my-1 h-px bg-line" role="separator" />;
            const index = actionable.indexOf(item);
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onMouseEnter={() => setActive(index)}
                onClick={(e) => {
                  e.stopPropagation();
                  popover.setOpen(false);
                  runItem(item);
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition disabled:opacity-50',
                  item.danger ? 'text-red-600 dark:text-red-400' : 'text-ink',
                  index === active && (item.danger ? 'bg-red-50 dark:bg-red-500/10' : 'bg-surface-3')
                )}
              >
                {Icon && <Icon size={16} className={item.danger ? '' : 'text-ink-3'} aria-hidden />}
                <span className="flex-1">{item.label}</span>
                {item.hint && <span className="text-xs text-ink-3">{item.hint}</span>}
              </button>
            );
          })}
      </PopoverPanel>
    </div>
  );
}
