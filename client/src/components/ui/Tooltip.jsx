import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';

/** Lightweight tooltip shown on hover and keyboard focus. */
export function Tooltip({ content, children, side = 'top', className, delay = 250 }) {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);
  const timer = useRef(null);
  const id = useId();

  if (!content) return children;

  const show = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      setPos({
        left: side === 'right' ? r.right + 8 : r.left + r.width / 2,
        top: side === 'right' ? r.top + r.height / 2 : side === 'bottom' ? r.bottom + 8 : r.top - 8,
      });
    }, delay);
  };
  const hide = () => {
    clearTimeout(timer.current);
    setPos(null);
  };

  return (
    <span
      ref={ref}
      className={cn('inline-flex', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={pos ? id : undefined}
    >
      {children}
      {pos &&
        createPortal(
          <span
            id={id}
            role="tooltip"
            style={{ left: pos.left, top: pos.top }}
            className={cn(
              'pointer-events-none fixed z-[90] max-w-xs rounded-lg bg-navy-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg animate-fade-in dark:bg-white dark:text-navy-900',
              side === 'top' && '-translate-x-1/2 -translate-y-full',
              side === 'bottom' && '-translate-x-1/2',
              side === 'right' && '-translate-y-1/2'
            )}
          >
            {content}
          </span>,
          document.body
        )}
    </span>
  );
}
