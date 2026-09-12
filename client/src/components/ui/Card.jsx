import { cn } from '@/utils/cn';

export function Card({ as: Tag = 'div', className, hover = false, children, ...props }) {
  return (
    <Tag
      className={cn(
        'rounded-2xl border border-line bg-surface shadow-card',
        hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-card-hover',
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, action, icon: Icon, className, children }) {
  return (
    <div className={cn('flex items-start justify-between gap-3 px-5 pt-5', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon && (
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-ink-2">
            <Icon size={16} aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          {title && <h3 className="truncate text-[15px] font-semibold text-ink">{title}</h3>}
          {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
          {children}
        </div>
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

export function CardFooter({ className, children }) {
  return <div className={cn('flex items-center justify-end gap-2 border-t border-line px-5 py-3.5', className)}>{children}</div>;
}

/** Label / value pair used in detail grids. */
export function InfoItem({ label, value, icon: Icon, className, mono = false }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-ink-3">
        {Icon && <Icon size={13} aria-hidden />}
        {label}
      </dt>
      <dd className={cn('mt-1 truncate text-sm font-medium text-ink', mono && 'font-mono text-[13px]')}>{value ?? '—'}</dd>
    </div>
  );
}
