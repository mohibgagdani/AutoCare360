import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useOverlayMotion } from '@/hooks/useMotion';

const dialogStack = [];
const FOCUSABLE ='a[href], button:not([disabled]), textarea, input:not([type="hidden"]), select, [tabindex]:not([tabindex="-1"])';

/** Focus trap + Escape + scroll lock + focus restore. */
function useDialogBehaviour(open, onClose, panelRef) {
  // Keep the latest onClose without re-running the effect (which would steal focus on every render).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const token = Symbol('dialog');
    dialogStack.push(token);
    const isTop = () => dialogStack[dialogStack.length - 1] === token;
    const previouslyFocused = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const autofocus = panel.querySelector('[data-autofocus]');
      const target = autofocus || panel.querySelector(FOCUSABLE);
      (target || panel).focus({ preventScroll: true });
    };
    const t = setTimeout(focusFirst, 30);

    const onKey = (e) => {
      if (!isTop()) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      dialogStack.splice(dialogStack.indexOf(token), 1);
      if (!dialogStack.length) document.body.style.overflow = overflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open, panelRef]);
}

const SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

/**
 * Modal dialog. On mobile it becomes a bottom sheet.
 */
export function Modal({ open, onClose, title, description, icon: Icon, size = 'md', children, footer, className, closeOnOverlay = true }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useDialogBehaviour(open, onClose, panelRef);
  const fade = useOverlayMotion({ opacity: 0 });
  const pop = useOverlayMotion({ opacity: 0, y: 24, scale: 0.98 }, { opacity: 0, y: 16, scale: 0.98 });

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px]"
            {...fade}
            animate={{ opacity: 1 }}
            onClick={closeOnOverlay ? onClose : undefined}
            aria-hidden
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            tabIndex={-1}
            {...pop}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', damping: 30, stiffness: 380 }}
            className={cn(
              'relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-pop outline-none sm:rounded-2xl',
              SIZES[size],
              className
            )}
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
            {(title || onClose) && (
              <div className="flex items-start gap-3 px-5 pt-4 pb-3 sm:px-6 sm:pt-5">
                {Icon && (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300">
                    <Icon size={20} aria-hidden />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {title && (
                    <h2 id={titleId} className="text-lg font-semibold text-ink">
                      {title}
                    </h2>
                  )}
                  {description && <p className="mt-0.5 text-sm text-ink-3">{description}</p>}
                </div>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="-mr-1 rounded-lg p-1.5 text-ink-3 transition hover:bg-surface-3 hover:text-ink"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}
            <div className="scrollbar-thin flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
            {footer && (
              <div className="flex flex-col-reverse gap-2 border-t border-line bg-surface-2/60 px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/** Right-side drawer for detail views. Full-screen sheet on mobile. */
export function Drawer({ open, onClose, title, description, children, footer, width = 'max-w-xl', headerExtra }) {
  const panelRef = useRef(null);
  const titleId = useId();
  useDialogBehaviour(open, onClose, panelRef);
  const fade = useOverlayMotion({ opacity: 0 });
  const slide = useOverlayMotion({ x: '100%' });

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex justify-end">
          <motion.div
            className="absolute inset-0 bg-navy-950/40 backdrop-blur-[2px]"
            {...fade}
            animate={{ opacity: 1 }}
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            {...slide}
            animate={{ x: 0 }}
            transition={{ type: 'spring', damping: 34, stiffness: 340 }}
            className={cn('relative flex h-full w-full flex-col border-l border-line bg-surface shadow-pop outline-none', width)}
          >
            <div className="flex items-start gap-3 border-b border-line px-5 py-4 sm:px-6">
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="truncate text-lg font-semibold text-ink">
                  {title}
                </h2>
                {description && <div className="mt-0.5 text-sm text-ink-3">{description}</div>}
                {headerExtra}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="-mr-1 rounded-lg p-1.5 text-ink-3 transition hover:bg-surface-3 hover:text-ink"
                aria-label="Close panel"
              >
                <X size={18} />
              </button>
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3.5 sm:px-6">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
