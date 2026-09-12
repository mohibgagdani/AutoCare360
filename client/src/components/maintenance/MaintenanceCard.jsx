import { Link } from 'react-router-dom';
import { CheckCircle2, CalendarClock } from 'lucide-react';
import { StatusBadge, PriorityBadge, ProgressBar, Button } from '@/components/ui';
import { CategoryIcon, DuePoint, describeDue } from './MaintenanceBits';
import { formatCurrency } from '@/utils/format';
import { vehicleName } from '@/utils/vehicle';
import { cn } from '@/utils/cn';

const STATUS_RING = {
  overdue: 'before:bg-red-500',
  due: 'before:bg-orange-500',
  due_soon: 'before:bg-amber-400',
  up_to_date: 'before:bg-emerald-500',
  completed: 'before:bg-brand-500',
  skipped: 'before:bg-slate-400',
};

/**
 * Maintenance item card — used on dashboards, mobile lists and the vehicle
 * overview. A status stripe on the left edge echoes the badge.
 */
export function MaintenanceCard({ task, unit = 'km', showVehicle = true, onOpen, onComplete, onReschedule, className }) {
  const progress = Math.min(120, Math.round((task.progress || 0) * 100));
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-card transition before:absolute before:inset-y-0 before:left-0 before:w-1',
        STATUS_RING[task.status],
        onOpen && 'cursor-pointer hover:border-line-strong hover:shadow-card-hover',
        className
      )}
      onClick={onOpen ? () => onOpen(task) : undefined}
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onKeyDown={onOpen ? (e) => e.key === 'Enter' && onOpen(task) : undefined}
    >
      <div className="flex items-start gap-3">
        <CategoryIcon category={task.category} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="truncate text-sm font-semibold text-ink">{task.name}</h4>
              {showVehicle && task.vehicle && (
                <Link
                  to={`/app/vehicles/${task.vehicle._id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="truncate text-xs text-ink-3 hover:text-brand-600"
                >
                  {vehicleName(task.vehicle)} · {task.vehicle.registrationNumber}
                </Link>
              )}
            </div>
            <StatusBadge status={task.status} />
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <DuePoint task={task} unit={unit} compact />
            <div className="text-right">
              <PriorityBadge priority={task.priority} />
              {task.estimatedCost > 0 && <p className="text-xs text-ink-3">≈ {formatCurrency(task.estimatedCost)}</p>}
            </div>
          </div>

          {task.isOpen !== false && (
            <div className="mt-3">
              <ProgressBar value={progress} label={`${progress}% of interval used`} />
              <p className="mt-1.5 text-xs text-ink-3">{describeDue(task, unit)}</p>
            </div>
          )}

          {(onComplete || onReschedule) && task.isOpen !== false && (
            <div className="mt-3 flex gap-2">
              {onComplete && (
                <Button
                  size="xs"
                  variant="subtle"
                  leftIcon={CheckCircle2}
                  onClick={(e) => {
                    e.stopPropagation();
                    onComplete(task);
                  }}
                >
                  Complete
                </Button>
              )}
              {onReschedule && (
                <Button
                  size="xs"
                  variant="ghost"
                  leftIcon={CalendarClock}
                  onClick={(e) => {
                    e.stopPropagation();
                    onReschedule(task);
                  }}
                >
                  Reschedule
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
