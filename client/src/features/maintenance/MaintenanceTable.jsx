import { Link } from 'react-router-dom';
import { CheckCircle2, CalendarClock, SkipForward, Pencil, Trash2, Eye, Wrench } from 'lucide-react';
import { DataTable, StatusBadge, PriorityBadge, Menu, EmptyState, Button, ProgressBar } from '@/components/ui';
import { CategoryIcon, DuePoint, describeDue, intervalText } from '@/components/maintenance/MaintenanceBits';
import { formatCurrency, formatDate, formatNumber } from '@/utils/format';
import { unitLabel, vehicleName } from '@/utils/vehicle';

/**
 * Maintenance list with desktop table + mobile cards.
 * mode: 'open' (schedule) | 'history' (completed & skipped)
 */
export function MaintenanceTable({ tasks, loading, refreshing, actions, showVehicle = true, mode = 'open', sort, onSortChange, empty }) {
  const menuFor = (task) => [
    { label: 'View details', icon: Eye, onClick: () => actions.open(task) },
    { label: 'Mark completed', icon: CheckCircle2, onClick: () => actions.complete(task), hidden: !task.isOpen },
    { label: 'Reschedule', icon: CalendarClock, onClick: () => actions.reschedule(task), hidden: !task.isOpen },
    { label: 'Skip occurrence', icon: SkipForward, onClick: () => actions.skip(task), hidden: !task.isOpen },
    { label: 'Edit', icon: Pencil, onClick: () => actions.edit(task), hidden: !task.isOpen },
    { divider: true },
    { label: task.isOpen ? 'Remove' : 'Delete', icon: Trash2, danger: true, onClick: () => actions.remove(task) },
  ];

  const itemCell = (t) => (
    <div className="flex min-w-0 items-center gap-3">
      <CategoryIcon category={t.category} size={36} />
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{t.name}</p>
        <p className="truncate text-xs text-ink-3">
          {showVehicle && t.vehicle ? (
            <Link to={`/app/vehicles/${t.vehicle._id}`} onClick={(e) => e.stopPropagation()} className="hover:text-brand-600">
              {vehicleName(t.vehicle)} · {t.vehicle.registrationNumber}
            </Link>
          ) : (
            <>
              {t.category?.name} · {intervalText(t, actions.unitFor(t.vehicle)).toLowerCase()}
            </>
          )}
        </p>
      </div>
    </div>
  );

  const openColumns = [
    { key: 'item', header: 'Maintenance item', sortKey: 'name', render: itemCell, mobileFull: true },
    { key: 'status', header: 'Status', sortKey: 'status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'due', header: 'Next due', sortKey: 'nextDueDate', render: (t) => <DuePoint task={t} unit={actions.unitFor(t.vehicle)} /> },
    {
      key: 'progress',
      header: 'Remaining',
      hideBelow: 'lg',
      render: (t) => (
        <div className="w-32">
          <ProgressBar value={Math.min(120, (t.progress || 0) * 100)} />
          <p className="mt-1.5 truncate text-xs text-ink-3">{describeDue(t, actions.unitFor(t.vehicle))}</p>
        </div>
      ),
    },
    { key: 'priority', header: 'Priority', sortKey: 'priority', hideBelow: 'xl', render: (t) => <PriorityBadge priority={t.priority} /> },
    { key: 'cost', header: 'Est. cost', sortKey: 'estimatedCost', align: 'right', hideBelow: 'lg', render: (t) => <span className="tabular text-ink-2">{t.estimatedCost ? formatCurrency(t.estimatedCost) : '—'}</span> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      mobile: false,
      render: (t) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="xs" variant="subtle" className="hidden xl:inline-flex" leftIcon={CheckCircle2} onClick={() => actions.complete(t)}>
            Complete
          </Button>
          <Menu items={menuFor(t)} />
        </div>
      ),
    },
  ];

  const historyColumns = [
    { key: 'item', header: 'Maintenance item', render: itemCell, mobileFull: true },
    { key: 'status', header: 'Result', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'date', header: 'Date', sortKey: 'completedAt', render: (t) => <span className="text-ink-2">{formatDate(t.completedAt || t.skippedAt)}</span> },
    {
      key: 'odo',
      header: 'Reading',
      hideBelow: 'lg',
      render: (t) => (
        <span className="tabular text-ink-2">
          {t.completedOdometer ? `${formatNumber(t.completedOdometer)} ${unitLabel(actions.unitFor(t.vehicle))}` : '—'}
        </span>
      ),
    },
    { key: 'cost', header: 'Cost', align: 'right', render: (t) => <span className="tabular text-ink-2">{t.actualCost ? formatCurrency(t.actualCost) : '—'}</span> },
    { key: 'actions', header: <span className="sr-only">Actions</span>, align: 'right', mobile: false, render: (t) => <div onClick={(e) => e.stopPropagation()}><Menu items={menuFor(t)} /></div> },
  ];

  return (
    <DataTable
      columns={mode === 'history' ? historyColumns : openColumns}
      data={tasks}
      loading={loading}
      refreshing={refreshing}
      sort={sort}
      onSortChange={onSortChange}
      onRowClick={(t) => actions.open(t)}
      caption="Maintenance items"
      empty={
        empty || (
          <EmptyState
            icon={Wrench}
            title={mode === 'history' ? 'No maintenance history yet' : 'Nothing matches these filters'}
            description={mode === 'history' ? 'Completed and skipped items will appear here.' : 'Try clearing a filter to see more maintenance items.'}
          />
        )
      }
      renderMobile={(t) => (
        <div className="flex items-start gap-3">
          <CategoryIcon category={t.category} size={36} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-semibold text-ink">{t.name}</p>
              <StatusBadge status={t.status} size="xs" />
            </div>
            {showVehicle && t.vehicle && <p className="truncate text-xs text-ink-3">{vehicleName(t.vehicle)} · {t.vehicle.registrationNumber}</p>}
            <p className="mt-1.5 text-xs text-ink-2">
              {mode === 'history' ? formatDate(t.completedAt || t.skippedAt) : describeDue(t, actions.unitFor(t.vehicle))}
            </p>
          </div>
          <div onClick={(e) => e.stopPropagation()}>
            <Menu items={menuFor(t)} />
          </div>
        </div>
      )}
    />
  );
}
