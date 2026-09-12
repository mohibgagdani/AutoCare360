import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Plus,
  RefreshCw,
  History as HistoryIcon,
  Download,
  AlertTriangle,
  CalendarClock,
  Wallet,
  Gauge,
  TrendingUp,
  CircleAlert,
  BellRing,
  Info,
  Hash,
  Calendar,
  Fuel,
  Settings2,
  Car,
  ShieldCheck,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  Button,
  SearchBar,
  FilterDropdown,
  SegmentedControl,
  Pagination,
  ErrorState,
  EmptyState,
  HealthRing,
  InfoItem,
  Skeleton,
  Badge,
  Menu,
  useConfirm,
} from '@/components/ui';
import { MaintenanceCard } from '@/components/maintenance/MaintenanceCard';
import { ActivityTimeline } from '@/components/common/Timeline';
import { RankedBars } from '@/components/charts/RankedBars';
import { StackedMonthlyChart } from '@/components/charts/Charts';
import { MaintenanceTable } from '@/features/maintenance/MaintenanceTable';
import { ServiceRecordList } from '@/features/services/ServiceRecordList';
import { ExpenseTable } from '@/features/expenses/ExpenseTable';
import { DocumentGrid } from '@/features/documents/DocumentGrid';
import { ReminderList } from '@/features/reminders/ReminderList';
import { maintenanceApi, serviceRecordApi, expenseApi, documentApi, reminderApi, vehicleApi, exportApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useMeta } from '@/hooks/common';
import { HEALTH, EXPENSE_CATEGORIES, TRANSMISSIONS, TASK_STATUS, healthKey } from '@/utils/constants';
import { formatCurrency, formatDate, formatNumber } from '@/utils/format';
import { unitLabel } from '@/utils/vehicle';
import { emitChange } from '@/utils/events';
import { getErrorMessage } from '@/utils/errors';
import { cn } from '@/utils/cn';

// ─── Overview ────────────────────────────────────────────────────────────────
export function OverviewTab({ vehicle, taskActions, onTab }) {
  const { fuelTypeMap } = useMeta();
  const { data, initialLoading, error, refetch } = useFetch((signal) => vehicleApi.overview(vehicle._id, { signal }), [vehicle._id], {
    refreshOn: ['maintenance', 'services', 'expenses', 'documents', 'reminders', 'vehicles'],
  });
  const unit = data?.type?.usageUnit || 'km';
  const u = unitLabel(unit);

  if (error) return <Card><ErrorState error={error} onRetry={refetch} /></Card>;
  if (initialLoading || !data) {
    return (
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-72 rounded-2xl xl:col-span-2" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const hk = healthKey(vehicle.healthScore);
  const counts = data.statusCounts;

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <Card>
          <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center">
            <HealthRing score={vehicle.healthScore} size={120} stroke={10} />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-3">Current health</p>
              <p className="mt-1 text-2xl font-semibold text-ink">{HEALTH[hk].label}</p>
              <p className="mt-1 text-sm text-ink-3">
                {counts.overdue
                  ? `${counts.overdue} overdue item${counts.overdue > 1 ? 's' : ''} are pulling the score down.`
                  : counts.due
                    ? 'A few items are due now — book a service soon.'
                    : 'Everything is on schedule. Nice work!'}
              </p>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {['overdue', 'due', 'due_soon', 'up_to_date'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onTab('maintenance', s)}
                    className="rounded-xl bg-surface-2 px-2 py-2 text-center transition hover:bg-surface-3"
                  >
                    <span className="block text-lg font-semibold text-ink tabular">{counts[s] || 0}</span>
                    <span className="block truncate text-[11px] text-ink-3">{TASK_STATUS[s].label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {data.alerts.length > 0 && (
          <Card className="p-5">
            <h3 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
              <AlertTriangle size={16} className="text-amber-500" aria-hidden /> Important alerts
            </h3>
            <ul className="mt-3 space-y-2">
              {data.alerts.map((a, i) => (
                <li
                  key={i}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm',
                    a.severity === 'critical' ? 'bg-red-50 text-red-800 dark:bg-red-500/10 dark:text-red-200' : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200'
                  )}
                >
                  <CircleAlert size={15} className="shrink-0" aria-hidden />
                  <span className="flex-1">{a.title}</span>
                  <button type="button" onClick={() => onTab(a.documentId ? 'documents' : 'maintenance')} className="text-xs font-semibold underline-offset-2 hover:underline">
                    View
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-ink">Next maintenance</h3>
            <Button variant="ghost" size="sm" onClick={() => onTab('maintenance')}>
              View schedule
            </Button>
          </div>
          {data.nextMaintenance.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {data.nextMaintenance.slice(0, 4).map((t) => (
                <MaintenanceCard
                  key={t._id}
                  task={{ ...t, vehicle }}
                  unit={unit}
                  showVehicle={false}
                  onOpen={taskActions.open}
                  onComplete={taskActions.complete}
                  onReschedule={taskActions.reschedule}
                />
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState compact icon={CalendarClock} title="No maintenance scheduled" />
            </Card>
          )}
        </div>

        <Card>
          <CardHeader title="Recent activity" description="Services, expenses and maintenance on this vehicle" />
          <div className="px-3 pb-4 pt-2">
            {data.activity.length ? <ActivityTimeline items={data.activity} showVehicle={false} /> : <EmptyState compact icon={HistoryIcon} title="No activity yet" />}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-navy-800 to-navy-950 p-5 text-white">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total cost of ownership</p>
            <p className="mt-1 text-3xl font-semibold tabular">{formatCurrency(data.totals.ownershipCost, { compact: data.totals.ownershipCost > 999999 })}</p>
            <p className="mt-1 text-xs text-slate-400">Purchase price + all tracked expenses</p>
          </div>
          <dl className="grid grid-cols-2 gap-4 p-5">
            <InfoItem icon={Wallet} label="Running costs" value={formatCurrency(data.totals.expenses)} />
            <InfoItem icon={TrendingUp} label={`Cost per ${u}`} value={data.totals.runningCostPerKm ? `₹${data.totals.runningCostPerKm}` : '—'} />
            <InfoItem icon={HistoryIcon} label="Services" value={`${data.totals.services} · ${formatCurrency(data.totals.serviceSpend, { compact: true })}`} />
            <InfoItem icon={Gauge} label="Avg. usage" value={data.totals.averageDailyUsage ? `${data.totals.averageDailyUsage} ${u}/day` : '—'} />
          </dl>
          {data.expenseByCategory.length > 0 && (
            <div className="border-t border-line p-5">
              <RankedBars
                limit={5}
                items={data.expenseByCategory.map((c) => ({ key: c.category, label: EXPENSE_CATEGORIES[c.category]?.label || c.category, icon: EXPENSE_CATEGORIES[c.category]?.icon, value: c.total }))}
                format={(v) => formatCurrency(v, { compact: v > 99999 })}
              />
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-[15px] font-semibold text-ink">Vehicle information</h3>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
            <InfoItem icon={Car} label="Type" value={data.type?.name} />
            <InfoItem icon={Fuel} label="Fuel" value={[fuelTypeMap[vehicle.fuelType]?.name, fuelTypeMap[vehicle.secondaryFuelType]?.name].filter(Boolean).join(' + ')} />
            <InfoItem icon={Settings2} label="Transmission" value={TRANSMISSIONS[vehicle.transmission]} />
            <InfoItem icon={Calendar} label="Model year" value={vehicle.year} />
            <InfoItem icon={Hash} label="VIN / chassis" value={vehicle.vin} mono />
            <InfoItem icon={Hash} label="Engine no." value={vehicle.engineNumber} mono />
            <InfoItem icon={Calendar} label="Purchased" value={formatDate(vehicle.purchaseDate)} />
            <InfoItem icon={Wallet} label="Purchase price" value={vehicle.purchasePrice ? formatCurrency(vehicle.purchasePrice) : '—'} />
            <InfoItem icon={ShieldCheck} label="Last service" value={vehicle.lastServiceDate ? formatDate(vehicle.lastServiceDate) : '—'} />
            <InfoItem icon={Gauge} label={`At (${u})`} value={vehicle.lastServiceOdometer ? formatNumber(vehicle.lastServiceOdometer) : '—'} />
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Active reminders"
            icon={BellRing}
            action={
              <Button variant="ghost" size="sm" onClick={() => onTab('reminders')}>
                All
              </Button>
            }
          />
          <ul className="space-y-1 px-5 pb-5 pt-3">
            {data.reminders.length ? (
              data.reminders.map((r) => (
                <li key={r._id} className="flex items-center justify-between gap-3 rounded-xl py-1.5 text-sm">
                  <span className="truncate text-ink-2">{r.title}</span>
                  <span className="shrink-0 text-xs text-ink-3">{formatDate(r.dueDate, 'd MMM')}</span>
                </li>
              ))
            ) : (
              <li className="text-sm text-ink-3">No active reminders.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}

// ─── Maintenance ─────────────────────────────────────────────────────────────
export function MaintenanceTab({ vehicle, taskActions, initialStatus }) {
  const confirm = useConfirm();
  const { categories } = useMeta();
  const [mode, setMode] = useState('open');
  const [filters, setFilters] = useState({ status: initialStatus || '', category: '', search: '', page: 1 });
  const query = { vehicle: vehicle._id, ...filters, history: mode === 'history' ? 'true' : undefined, limit: 20 };
  const { data, meta, initialLoading, refreshing, error, refetch } = useFetch((signal) => maintenanceApi.list(query, { signal }), [JSON.stringify(query)], {
    refreshOn: ['maintenance'],
  });
  const set = (patch) => setFilters((f) => ({ ...f, ...patch, page: patch.page ?? 1 }));

  const sync = (includeRemoved) =>
    confirm({
      tone: 'info',
      title: includeRemoved ? 'Restore removed items & re-sync?' : 'Re-sync maintenance schedule?',
      message: 'Applies the latest templates for this vehicle’s type, fuel and model. Completed history is never touched.',
      confirmLabel: 'Re-sync',
      action: async () => {
        try {
          const res = await vehicleApi.syncSchedule(vehicle._id, { includeRemoved });
          toast.success(res.message);
          emitChange('maintenance', 'vehicles');
        } catch (e) {
          toast.error(getErrorMessage(e));
          throw e;
        }
      },
    });

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center">
        <SegmentedControl
          ariaLabel="Schedule or history"
          value={mode}
          onChange={(m) => {
            setMode(m);
            set({ status: '' });
          }}
          options={[
            { value: 'open', label: 'Schedule' },
            { value: 'history', label: 'History' },
          ]}
        />
        <SearchBar size="sm" value={filters.search} onChange={(v) => set({ search: v })} placeholder="Search items…" className="lg:w-64" />
        <div className="scrollbar-none flex flex-1 items-center gap-2 overflow-x-auto">
          {mode === 'open' && (
            <FilterDropdown
              label="Status"
              multiple
              value={filters.status}
              onChange={(v) => set({ status: v })}
              options={['overdue', 'due', 'due_soon', 'up_to_date'].map((s) => ({ value: s, label: TASK_STATUS[s].label }))}
            />
          )}
          <FilterDropdown label="Category" multiple value={filters.category} onChange={(v) => set({ category: v })} options={categories.map((c) => ({ value: c._id, label: c.name, color: c.color }))} />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" leftIcon={Download} onClick={() => exportApi.maintenance({ vehicle: vehicle._id, history: mode === 'history' ? 'true' : undefined }, 'pdf').catch((e) => toast.error(getErrorMessage(e)))}>
            PDF
          </Button>
          <Menu
            label="Schedule options"
            items={[
              { label: 'Re-sync schedule', icon: RefreshCw, onClick: () => sync(false) },
              { label: 'Restore removed items', icon: RefreshCw, onClick: () => sync(true) },
            ]}
          />
          <Button size="sm" leftIcon={Plus} onClick={taskActions.create}>
            Custom item
          </Button>
        </div>
      </div>
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <MaintenanceTable tasks={data || []} loading={initialLoading} refreshing={refreshing} actions={taskActions} showVehicle={false} mode={mode} />
      )}
      <Pagination pagination={meta?.pagination} onPageChange={(p) => set({ page: p })} label="items" />
    </Card>
  );
}

// ─── Service history ─────────────────────────────────────────────────────────
export function ServicesTab({ vehicle, onOpen, onCreate }) {
  const [page, setPage] = useState(1);
  const { data, meta, initialLoading, refreshing, error, refetch } = useFetch(
    (signal) => serviceRecordApi.list({ vehicle: vehicle._id, page, limit: 10 }, { signal }),
    [vehicle._id, page],
    { refreshOn: ['services'] }
  );
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <div>
          <p className="text-sm font-semibold text-ink">{meta?.totals ? `${meta.totals.count} service records` : 'Service records'}</p>
          {meta?.totals && <p className="text-xs text-ink-3">{formatCurrency(meta.totals.total)} total · {formatCurrency(meta.totals.average)} average</p>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" leftIcon={Download} onClick={() => exportApi.serviceRecords({ vehicle: vehicle._id }, 'csv').catch((e) => toast.error(getErrorMessage(e)))}>
            CSV
          </Button>
          <Button size="sm" leftIcon={Plus} onClick={onCreate}>
            Log service
          </Button>
        </div>
      </div>
      {error ? <ErrorState error={error} onRetry={refetch} /> : <ServiceRecordList records={data || []} loading={initialLoading} refreshing={refreshing} onOpen={onOpen} showVehicle={false} />}
      <Pagination pagination={meta?.pagination} onPageChange={setPage} label="records" />
    </Card>
  );
}

// ─── Expenses ────────────────────────────────────────────────────────────────
export function ExpensesTab({ vehicle, onCreate, onEdit, onDelete }) {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const list = useFetch((signal) => expenseApi.list({ vehicle: vehicle._id, category, page, limit: 12 }, { signal }), [vehicle._id, category, page], { refreshOn: ['expenses'] });
  const summary = useFetch((signal) => expenseApi.summary({ vehicle: vehicle._id, months: 12 }, { signal }), [vehicle._id], { refreshOn: ['expenses'] });
  const s = summary.data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Total spent', s ? formatCurrency(s.total) : '—'],
          ['This year', s ? formatCurrency(s.currentYear) : '—'],
          ['Monthly average', s ? formatCurrency(s.monthlyAverage) : '—'],
          ['Cost per km', s?.costPerKm ? `₹${s.costPerKm}` : '—'],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-medium text-ink-3">{label}</p>
            <p className="mt-1 text-xl font-semibold text-ink tabular">{value}</p>
          </Card>
        ))}
      </div>
      <StackedMonthlyChart
        title="Monthly spend"
        description="Last 12 months"
        data={s?.monthly || []}
        loading={summary.initialLoading}
        height={220}
        seriesDefs={[
          { key: 'fuel', label: 'Fuel' },
          { key: 'charging', label: 'Charging' },
          { key: 'maintenance', label: 'Maintenance' },
          { key: 'insurance', label: 'Insurance' },
        ].filter((sd) => (s?.byCategory || []).some((c) => c.category === sd.key))}
      />
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
          <FilterDropdown label="Category" value={category} onChange={(v) => { setCategory(v); setPage(1); }} options={Object.entries(EXPENSE_CATEGORIES).map(([value, m]) => ({ value, label: m.label, icon: m.icon }))} />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" leftIcon={Download} onClick={() => exportApi.expenses({ vehicle: vehicle._id }, 'csv').catch((e) => toast.error(getErrorMessage(e)))}>
              CSV
            </Button>
            <Button size="sm" leftIcon={Plus} onClick={onCreate}>
              Add expense
            </Button>
          </div>
        </div>
        {list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : (
          <ExpenseTable expenses={list.data || []} loading={list.initialLoading} refreshing={list.refreshing} onEdit={onEdit} onDelete={onDelete} showVehicle={false} />
        )}
        <Pagination pagination={list.meta?.pagination} onPageChange={setPage} label="expenses" />
      </Card>
    </div>
  );
}

// ─── Documents ───────────────────────────────────────────────────────────────
export function DocumentsTab({ vehicle, onCreate, onEdit, onDelete }) {
  const { data, initialLoading, error, refetch } = useFetch((signal) => documentApi.list({ vehicle: vehicle._id, limit: 50, sort: 'expiryDate' }, { signal }), [vehicle._id], {
    refreshOn: ['documents'],
  });
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-3">RC, insurance, PUC, warranty and invoices for this vehicle.</p>
        <Button size="sm" leftIcon={Plus} onClick={onCreate}>
          Upload document
        </Button>
      </div>
      {error ? (
        <Card><ErrorState error={error} onRetry={refetch} /></Card>
      ) : initialLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-2xl" />)}
        </div>
      ) : (
        <DocumentGrid documents={data || []} onEdit={onEdit} onDelete={onDelete} showVehicle={false} empty={<Card><EmptyState icon={Info} title="No documents for this vehicle" description="Upload the RC, insurance and PUC to get renewal reminders." action={<Button size="sm" leftIcon={Plus} onClick={onCreate}>Upload document</Button>} /></Card>} />
      )}
    </div>
  );
}

// ─── Reminders ───────────────────────────────────────────────────────────────
export function RemindersTab({ vehicle, reminderActions }) {
  const [status, setStatus] = useState('active');
  const { data, initialLoading, error, refetch } = useFetch((signal) => reminderApi.list({ vehicle: vehicle._id, status, limit: 50 }, { signal }), [vehicle._id, status], {
    refreshOn: ['reminders', 'maintenance', 'documents'],
  });
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4">
        <SegmentedControl
          ariaLabel="Reminder status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'overdue', label: 'Overdue' },
            { value: 'completed', label: 'Done' },
          ]}
        />
        <Button size="sm" leftIcon={Plus} onClick={reminderActions.create}>
          New reminder
        </Button>
      </div>
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : initialLoading ? (
        <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
      ) : (
        <ReminderList reminders={data || []} actions={reminderActions} showVehicle={false} />
      )}
    </Card>
  );
}
