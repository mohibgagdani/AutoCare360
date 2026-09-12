import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { useEntrance } from '@/hooks/useMotion';

export function PageHeader({ title, description, actions, back, eyebrow, className, children }) {
  const initial = useEntrance({ opacity: 0, y: -6 });
  return (
    <motion.header
      initial={initial}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn('mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div className="min-w-0">
        {back && (
          <Link to={back.to} className="mb-2 inline-flex items-center gap-1 text-[13px] font-medium text-ink-3 transition hover:text-ink">
            <ChevronLeft size={15} aria-hidden />
            {back.label}
          </Link>
        )}
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand-600 dark:text-brand-400">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-bold text-ink sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-3">{description}</p>}
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </motion.header>
  );
}

/** Toolbar row that holds search + filters above a list. */
export function FilterBar({ children, className, right }) {
  return (
    <div className={cn('flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between', className)}>
      <div className="scrollbar-none flex flex-1 items-center gap-2 overflow-x-auto">{children}</div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}
