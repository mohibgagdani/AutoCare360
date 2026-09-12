import { useEffect } from 'react';
import { Plus, Download, Car, Layers, Flag, AlertTriangle, AlertCircle, Clock, CircleCheck, Wallet } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, SearchBar, FilterDropdown, SegmentedControl, Pagination, ErrorState, Menu, FilterBar, DateRangeFilter } from '@/components/ui';
import { MaintenanceTable } from '@/features/maintenance/MaintenanceTable';
import { useTaskActions } from '@/features/maintenance/useTaskActions';
import { maintenanceApi, exportApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useDocumentTitle, useMeta } from '@/hooks/common';
import { useVehicles } from '@/hooks/useVehicles';
import { TASK_STATUS, PRIORITY } from '@/utils/constants';
import { formatCurrency, formatNumber } from '@/utils/format';
import { vehicleName } from '@/utils/vehicle';
import { getErrorMessage } from '@/utils/errors';
import { cn } from '@/utils/cn';

const SUMMARY = [
  { key: 'overdue', status: 'overdue', label: 'Overdue', icon: AlertCircle, className: 'text-red-600 dark:text-red-400', ring: 'ring-red-500/40 bg-red-50/60 dark:bg-red-500/10' },
  { key: 'due', status: 'due', label: 'Due now', icon: AlertTriangle, className: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-500/40 bg-orange-50/60 dark:bg-orange-500/10' },
  { key: 'dueSoon', status: 'due_soon', label: 'Due soon', icon: Clock, className: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500/40 bg-amber-50/60 dark:bg-amber-500/10' },
  { key: 'upToDate', status: 'up_to_date', label: 'Up to date', icon: CircleCheck, className: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500/40 bg-emerald-50/60 dark:bg-emerald-500/10' },
];

export default function MaintenancePage() {
  useDocumentTitle('Maintenance');
  const { categories } = useMeta();
  const { vehicles } = useVehicles();
  const [params, setParams, clear] = useQueryParams({ page: '1', view: 'open' });
  const { actions, element } = useTaskActions({ vehicles, defaultVehicle: params.vehicle });
  const history = params.view === 'history';

  const query = {
    vehicle: params.vehicle,
    status: history ? params.status : params.status,
    category: params.category,
    priority: params.priority,
    type: params.type,
    dueFrom: params.dueFrom,
    dueTo: params.dueTo,
    search: params.search,
    sort: params.sort,
    history: history ? 'true' : undefined,
    page: params.page,
    limit: 15,
  };
  const { data, meta, initialLoading, refreshing, error, refetch } = useFetch((signal) => maintenanceApi.list(query, { signal }), [JSON.stringify(query)], {
    refreshOn: ['maintenance'],
  });
  const summary = useFetch((signal) => maintenanceApi.summary({ vehicle: params.vehicle }, { signal }), [params.vehicle], { refreshOn: ['maintenance'] });

  // Deep link from search: ?task=<id> opens the drawer.
  useEffect(() => {
    if (params.task) actions.open({ _id: params.task });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.task]);

  const activeStatuses = (params.status || '').split(',').filter(Boolean);
  const filtered = Boolean(params.vehicle || params.status || params.category || params.priority || params.type || params.dueFrom || params.dueTo || params.search);

  const exportAs = (format) =>
    exportApi.maintenance({ ...query, page: undefined, limit: undefined }, format).catch((e) => toast.error(getErrorMessage(e)));

  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Every scheduled item across your vehicles — due by date or reading, whichever comes first."
        actions={
          <>
            <Menu
              label="Export"
              triggerClassName="inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm font-medium text-ink shadow-sm hover:bg-surface-2"
              trigger={
                <>
                  <Download size={16} aria-hidden /> Export
                </>
              }
              items={[
                { label: 'Export CSV', icon: Download, onClick: () => exportAs('csv') },
                { label: 'Export PDF', icon: Download, onClick: () => exportAs('pdf') },
              ]}
            />
            <Button leftIcon={Plus} onClick={actions.create} disabled={!vehicles.length}>
              Custom item
            </Button>
          </>
        }
      />

      {!history && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
          {SUMMARY.map((s) => {
            const active = activeStatuses.length === 1 && activeStatuses[0] === s.status;
            const Icon = s.icon;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setParams({ status: active ? '' : s.status })}
                aria-pressed={active}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left shadow-card transition hover:border-line-strong',
                  active && `ring-2 ${s.ring}`
                )}
              >
                <Icon size={22} className={s.className} aria-hidden />
                <span>
                  <span className="block text-2xl font-semibold leading-none text-ink tabular">{formatNumber(summary.data?.[s.key] ?? 0)}</span>
                  <span className="mt-1 block text-xs text-ink-3">{s.label}</span>
                </span>
              </button>
            );
          })}
          <div className="col-span-2 flex items-center gap-3 rounded-2xl border border-line bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white shadow-card lg:col-span-1">
            <Wallet size={22} className="text-brand-200" aria-hidden />
            <span>
              <span className="block text-xl font-semibold leading-none tabular">{formatCurrency(summary.data?.estimatedCostDue ?? 0, { compact: true })}</span>
              <span className="mt-1 block text-xs text-brand-100">Est. cost of due work</span>
            </span>
          </div>
        </div>
      )}

      <Card className="overflow-hidden">
        <FilterBar
          right={
            <SegmentedControl
              ariaLabel="Schedule or history"
              value={params.view}
              onChange={(v) => setParams({ view: v, status: '' })}
              options={[
                { value: 'open', label: 'Schedule' },
                { value: 'history', label: 'History' },
              ]}
            />
          }
        >
          <SearchBar size="sm" value={params.search || ''} onChange={(v) => setParams({ search: v })} placeholder="Search maintenance…" className="w-56 shrink-0" />
          <FilterDropdown
            label="Vehicle"
            icon={Car}
            value={params.vehicle}
            onChange={(v) => setParams({ vehicle: v })}
            allLabel="All vehicles"
            options={vehicles.map((v) => ({ value: v._id, label: vehicleName(v), color: v.color }))}
          />
          <FilterDropdown
            label="Status"
            multiple
            value={params.status}
            onChange={(v) => setParams({ status: v })}
            options={(history ? ['completed', 'skipped'] : ['overdue', 'due', 'due_soon', 'up_to_date']).map((s) => ({ value: s, label: TASK_STATUS[s].label }))}
          />
          <FilterDropdown label="Category" icon={Layers} multiple value={params.category} onChange={(v) => setParams({ category: v })} options={categories.map((c) => ({ value: c._id, label: c.name, color: c.color }))} />
          <FilterDropdown label="Priority" icon={Flag} multiple value={params.priority} onChange={(v) => setParams({ priority: v })} options={Object.entries(PRIORITY).map(([value, m]) => ({ value, label: m.label }))} />
          <FilterDropdown
            label="Type"
            value={params.type}
            onChange={(v) => setParams({ type: v })}
            options={[
              { value: 'scheduled', label: 'Scheduled (templates)' },
              { value: 'custom', label: 'Custom items' },
            ]}
          />
          {!history && (
            <DateRangeFilter label="Due" mode="future" from={params.dueFrom || ''} to={params.dueTo || ''} onChange={({ from, to }) => setParams({ dueFrom: from, dueTo: to })} />
          )}
          {filtered && (
            <Button variant="ghost" size="sm" onClick={() => clear(['view'])}>
              Clear
            </Button>
          )}
        </FilterBar>

        {error && !data ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <MaintenanceTable
            tasks={data || []}
            loading={initialLoading}
            refreshing={refreshing}
            actions={actions}
            mode={history ? 'history' : 'open'}
            sort={params.sort}
            onSortChange={(s) => setParams({ sort: s })}
          />
        )}
        <Pagination pagination={meta?.pagination} onPageChange={(p) => setParams({ page: p })} label="items" />
      </Card>
      {element}
    </>
  );
}
