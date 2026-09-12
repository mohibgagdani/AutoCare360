import { cn } from '@/utils/cn';

export function Skeleton({ className, ...props }) {
  return <div className={cn('skeleton h-4', className)} aria-hidden {...props} />;
}

export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}

export function CardSkeleton({ className, rows = 3 }) {
  return (
    <div className={cn('rounded-2xl border border-line bg-surface p-5', className)} aria-hidden>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="mt-4 h-8 w-1/2" />
      <SkeletonText lines={rows} className="mt-5" />
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5" aria-hidden>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-24" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-7 w-28" />
      <Skeleton className="mt-3 h-3 w-20" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, columns = 5 }) {
  return (
    <div className="divide-y divide-line" aria-hidden>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          {Array.from({ length: columns - 1 }).map((__, c) => (
            <Skeleton key={c} className={cn('h-3.5', c === 0 ? 'w-1/4' : 'w-1/6', c > 1 && 'hidden md:block')} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 240 }) {
  return (
    <div className="flex items-end gap-2 px-2" style={{ height }} aria-hidden>
      {[40, 65, 50, 80, 60, 90, 70, 55, 85, 45, 75, 60].map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-md" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

/** Full-page loading state (used while the session bootstraps). */
export function PageLoader({ label = 'Loading AutoCare360…' }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas" role="status">
      <div className="relative h-12 w-12">
        <span className="absolute inset-0 rounded-full border-4 border-brand-500/20" />
        <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-brand-600" />
      </div>
      <p className="text-sm text-ink-3">{label}</p>
    </div>
  );
}
