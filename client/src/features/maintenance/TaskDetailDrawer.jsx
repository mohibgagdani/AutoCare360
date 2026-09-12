import { Link } from 'react-router-dom';
import { CheckCircle2, CalendarClock, SkipForward, Pencil, Trash2, Clock, Wallet, Timer, History, Info, Sparkles } from 'lucide-react';
import { Drawer, Button, StatusBadge, PriorityBadge, Badge, ProgressBar, Skeleton, ErrorState, InfoItem, Callout } from '@/components/ui';
import { CategoryIcon, DuePoint, describeDue, intervalText } from '@/components/maintenance/MaintenanceBits';
import { maintenanceApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { formatCurrency, formatDate, formatNumber } from '@/utils/format';
import { SERVICE_MODE } from '@/utils/constants';
import { unitLabel, vehicleName } from '@/utils/vehicle';

export function TaskDetailDrawer({ taskId, open, onClose, unitFor, actions }) {
  const { data: task, loading, error, refetch } = useFetch((signal) => maintenanceApi.get(taskId, { signal }), [taskId], {
    enabled: Boolean(open && taskId),
    refreshOn: ['maintenance'],
  });
  const unit = task ? unitFor(task.vehicle) : 'km';
  const u = unitLabel(unit);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={task?.name || 'Maintenance item'}
      description={
        task?.vehicle && (
          <Link to={`/app/vehicles/${task.vehicle._id}`} onClick={onClose} className="hover:text-brand-600">
            {vehicleName(task.vehicle)} · {task.vehicle.registrationNumber}
          </Link>
        )
      }
      footer={
        task && (
          <>
            {task.isOpen ? (
              <>
                <Button variant="danger-ghost" size="sm" leftIcon={Trash2} onClick={() => actions.remove(task, onClose)}>
                  Delete
                </Button>
                <Button variant="ghost" size="sm" leftIcon={Pencil} onClick={() => actions.edit(task)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" leftIcon={SkipForward} onClick={() => actions.skip(task)}>
                  Skip
                </Button>
                <Button variant="secondary" size="sm" leftIcon={CalendarClock} onClick={() => actions.reschedule(task)}>
                  Reschedule
                </Button>
                <Button size="sm" leftIcon={CheckCircle2} onClick={() => actions.complete(task)}>
                  Complete
                </Button>
              </>
            ) : (
              <Button variant="danger-ghost" size="sm" leftIcon={Trash2} onClick={() => actions.remove(task, onClose)}>
                Delete from history
              </Button>
            )}
          </>
        )
      }
    >
      {loading && !task ? (
        <div className="space-y-4">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} compact />
      ) : task ? (
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <CategoryIcon category={task.category} size={44} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={task.status} size="md" />
                <PriorityBadge priority={task.priority} />
                {task.isCustom && <Badge tone="violet">Custom</Badge>}
                {task.isRescheduled && <Badge tone="blue">Rescheduled</Badge>}
                {task.template?.makes?.length > 0 && (
                  <Badge tone="teal" icon={Sparkles}>
                    {task.template.makes[0]} specific
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-sm text-ink-2">{task.category?.name}</p>
            </div>
          </div>

          {task.isOpen && (
            <div className="rounded-2xl border border-line bg-surface-2 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-3">Next due · whichever comes first</p>
                  <div className="mt-2">
                    <DuePoint task={task} unit={unit} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-ink-3">Current reading</p>
                  <p className="text-sm font-semibold text-ink tabular">
                    {formatNumber(task.vehicle?.odometer)} {u}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <ProgressBar value={Math.min(120, (task.progress || 0) * 100)} height="h-2" label="Interval used" />
                <p className="mt-2 text-xs text-ink-3">{describeDue(task, unit)}</p>
              </div>
              {task.isRescheduled && task.rescheduleReason && (
                <p className="mt-3 text-xs text-ink-3">Rescheduled: {task.rescheduleReason}</p>
              )}
            </div>
          )}

          {task.status === 'completed' && (
            <Callout tone="success" icon={CheckCircle2} title={`Completed ${formatDate(task.completedAt)}`}>
              at {formatNumber(task.completedOdometer)} {u}
              {task.actualCost ? ` · ${formatCurrency(task.actualCost)}` : ''}
              {task.serviceRecord?.serviceCenter ? ` · ${task.serviceRecord.serviceCenter}` : ''}
            </Callout>
          )}
          {task.status === 'skipped' && (
            <Callout tone="info" icon={SkipForward} title={`Skipped ${formatDate(task.skippedAt)}`}>
              {task.skipReason || 'No reason given'}
            </Callout>
          )}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-5">
            <InfoItem icon={Clock} label="Interval" value={intervalText(task, unit)} />
            <InfoItem icon={Wallet} label="Estimated cost" value={task.estimatedCost ? formatCurrency(task.estimatedCost) : 'Free'} />
            <InfoItem icon={Timer} label="Typical duration" value={task.estimatedDurationMinutes ? `${task.estimatedDurationMinutes} min` : '—'} />
            <InfoItem icon={Info} label="Who does it" value={SERVICE_MODE[task.serviceMode]?.label} />
            <InfoItem
              icon={History}
              label="Last performed"
              value={task.lastPerformedDate ? `${formatDate(task.lastPerformedDate)} · ${formatNumber(task.lastPerformedOdometer)} ${u}` : 'Never recorded'}
              className="col-span-2"
            />
          </dl>
          {task.baselineEstimated && task.isOpen && (
            <p className="-mt-2 text-xs text-ink-3">No history for this item yet — the schedule starts from the vehicle’s last known service.</p>
          )}

          {task.description && (
            <div>
              <h3 className="text-sm font-semibold text-ink">About this item</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-2">{task.description}</p>
            </div>
          )}
          {task.notes && (
            <div>
              <h3 className="text-sm font-semibold text-ink">Notes</h3>
              <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{task.notes}</p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-ink">History</h3>
            {task.history?.length ? (
              <ol className="mt-3 space-y-3 border-l border-line pl-4">
                {task.history.map((h) => (
                  <li key={h._id} className="relative">
                    <span className={`absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-surface ${h.status === 'completed' ? 'bg-brand-500' : 'bg-slate-400'}`} />
                    <p className="text-sm font-medium text-ink">
                      {h.status === 'completed' ? 'Completed' : 'Skipped'} · {formatDate(h.completedAt || h.skippedAt)}
                    </p>
                    <p className="text-xs text-ink-3">
                      {h.completedOdometer ? `${formatNumber(h.completedOdometer)} ${u}` : ''}
                      {h.actualCost ? ` · ${formatCurrency(h.actualCost)}` : ''}
                      {h.serviceRecord?.serviceCenter ? ` · ${h.serviceRecord.serviceCenter}` : ''}
                      {h.skipReason ? h.skipReason : ''}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-1 text-sm text-ink-3">No previous occurrences recorded.</p>
            )}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
