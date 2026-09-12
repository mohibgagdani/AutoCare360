import { useEffect, useMemo } from 'react';
import { Plus, Download, Car, Tags, CalendarRange, Wallet, CalendarDays, TrendingUp, Route, Fuel } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, Card, CardHeader, Button, SearchBar, FilterDropdown, Pagination, ErrorState, Menu, FilterBar, DateRangeFilter, DashboardCard, SegmentedControl } from '@/components/ui';
import { StackedMonthlyChart, HorizontalBarChart } from '@/components/charts/Charts';
import { ChartCard } from '@/components/charts/ChartCard';
import { RankedBars } from '@/components/charts/RankedBars';
import { ExpenseTable } from '@/features/expenses/ExpenseTable';
import { useRecordActions } from '@/features/records/useRecordActions';
import { expenseApi, exportApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useDocumentTitle } from '@/hooks/common';
import { useVehicles } from '@/hooks/useVehicles';
import { EXPENSE_CATEGORIES } from '@/utils/constants';
import { formatCurrency, formatNumber } from '@/utils/format';
import { vehicleName } from '@/utils/vehicle';
import { getErrorMessage } from '@/utils/errors';

const RANGES = [
  { value: '3', label: '3M' },
  { value: '6', label: '6M' },
  { value: '12', label: '12M' },
  { value: '24', label: '24M' },
];

export default function ExpensesPage() {
  useDocumentTitle('Expenses');
  const { vehicles } = useVehicles();
  const [params, setParams, clear] = useQueryParams({ page: '1', sort: '-date', months: '12' });
  const { actions, element } = useRecordActions({ vehicles, defaultVehicle: params.vehicle });

  const filters = { vehicle: params.vehicle, category: params.category, from: params.from, to: params.to };
  const listQuery = { ...filters, search: params.search, sort: params.sort, page: params.page, limit: 15 };
  const list = useFetch((signal) => expenseApi.list(listQuery, { signal }), [JSON.stringify(listQuery)], { refreshOn: ['expenses'] });
  const summary = useFetch((signal) => expenseApi.summary({ ...filters, months: params.months }, { signal }), [JSON.stringify(filters), params.months], {
    refreshOn: ['expenses'],
  });
  const s = summary.data;

  useEffect(() => {
    if (params.new) {
      actions.createExpense();
      setParams({ new: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.new]);

  // Show the categories that actually carry spend in the monthly chart (max 5 + other).
  const monthlySeries = useMemo(() => {
    const top = (s?.byCategory || []).slice(0, 5).map((c) => c.category);
    const rows = (s?.monthly || []).map((m) => {
      const row = { month: m.month };
      let other = 0;
      Object.keys(EXPENSE_CATEGORIES).forEach((k) => {
        if (top.includes(k)) row[k] = m[k] || 0;
        else other += m[k] || 0;
      });
      row.other = other;
      return row;
    });
    const defs = top.map((k) => ({ key: k, label: EXPENSE_CATEGORIES[k]?.label || k }));
    if (rows.some((r) => r.other > 0)) defs.push({ key: 'other', label: 'Everything else' });
    return { rows, defs: defs.slice(0, 6) };
  }, [s]);

  const filtered = Boolean(params.vehicle || params.category || params.from || params.to || params.search);
  const exportAs = (format) => exportApi.expenses({ ...filters, search: params.search }, format).catch((e) => toast.error(getErrorMessage(e)));
  const energy = s?.fuel || [];

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Fuel, charging, maintenance, insurance and every other cost of owning your vehicles."
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
                { label: 'Export PDF report', icon: Download, onClick: () => exportAs('pdf') },
              ]}
            />
            <Button leftIcon={Plus} onClick={actions.createExpense} disabled={!vehicles.length}>
              Add expense
            </Button>
          </>
        }
      />

      <Card className="mb-6 overflow-hidden">
        <FilterBar
          right={
            <SegmentedControl ariaLabel="Chart range" value={params.months} onChange={(v) => setParams({ months: v, page: params.page })} options={RANGES} />
          }
        >
          <FilterDropdown label="Vehicle" icon={Car} value={params.vehicle} onChange={(v) => setParams({ vehicle: v })} allLabel="All vehicles" options={vehicles.map((v) => ({ value: v._id, label: vehicleName(v), color: v.color }))} />
          <FilterDropdown
            label="Category"
            icon={Tags}
            multiple
            value={params.category}
            onChange={(v) => setParams({ category: v })}
            options={Object.entries(EXPENSE_CATEGORIES).map(([value, m]) => ({ value, label: m.label, icon: m.icon }))}
          />
          <DateRangeFilter label="Date" from={params.from || ''} to={params.to || ''} onChange={({ from, to }) => setParams({ from, to })} />

          {filtered && (
            <Button variant="ghost" size="sm" onClick={() => clear(['months'])}>
              Clear
            </Button>
          )}
        </FilterBar>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-5">
        <DashboardCard label="Total cost" value={s?.total ?? 0} format={(v) => formatCurrency(v, { compact: v > 999999 })} icon={Wallet} tone="violet" sub={`${formatNumber(s?.count ?? 0)} entries`} />
        <DashboardCard label="This month" value={s?.currentMonth ?? 0} format={(v) => formatCurrency(v)} icon={CalendarDays} tone="teal" index={1} />
        <DashboardCard label="Monthly average" value={s?.monthlyAverage ?? 0} format={(v) => formatCurrency(v)} icon={TrendingUp} tone="blue" index={2} />
        <DashboardCard label="This year" value={s?.currentYear ?? 0} format={(v) => formatCurrency(v, { compact: v > 999999 })} icon={CalendarRange} tone="yellow" sub={`≈ ${formatCurrency(s?.annualized ?? 0, { compact: true })}/yr run-rate`} index={3} />
        <DashboardCard
          className="col-span-2 xl:col-span-1"
          label="Cost per km"
          value={s?.costPerKm ? `₹${s.costPerKm}` : '—'}
          icon={Route}
          tone="green"
          sub={s?.totalDistance ? `over ${formatNumber(s.totalDistance)} km` : 'log odometer readings'}
          index={4}
        />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-3">
        <StackedMonthlyChart
          className="xl:col-span-2"
          title="Monthly cost"
          description={`Last ${params.months} months by category`}
          data={monthlySeries.rows}
          seriesDefs={monthlySeries.defs}
          loading={summary.initialLoading}
          refreshing={summary.refreshing}
          height={280}
        />
        <ChartCard
          title="By category"
          description="Share of total spend"
          fluid
          loading={summary.initialLoading}
          isEmpty={!s?.byCategory?.length}
          height={280}
          table={{ columns: [{ key: 'label', label: 'Category' }, { key: 'value', label: 'Amount', align: 'right', format: (v) => formatCurrency(v) }, { key: 'share', label: 'Share', align: 'right', format: (v) => `${v}%` }], rows: (s?.byCategory || []).map((c) => ({ label: EXPENSE_CATEGORIES[c.category]?.label, value: c.total, share: c.share })) }}
        >
          <RankedBars
            className="px-2"
            items={(s?.byCategory || []).map((c) => ({ key: c.category, label: EXPENSE_CATEGORIES[c.category]?.label || c.category, icon: EXPENSE_CATEGORIES[c.category]?.icon, value: c.total, sub: `${c.share}%` }))}
            format={(v) => formatCurrency(v, { compact: v > 99999 })}
          />
        </ChartCard>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <HorizontalBarChart
          title="Cost by vehicle"
          description="Within the selected filters"
          data={(s?.byVehicle || []).map((v) => ({ name: v.vehicle.name, total: v.total }))}
          loading={summary.initialLoading}
        />
        <Card>
          <CardHeader title="Running cost" description="Spend ÷ distance covered (engine hours for tractors & equipment)" icon={Route} />
          <ul className="divide-y divide-line px-5 pb-3 pt-2">
            {(s?.byVehicle || []).map((v) => (
              <li key={v.vehicle._id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ background: v.vehicle.color }} aria-hidden />
                  <span className="truncate text-ink">{v.vehicle.name}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="font-semibold text-ink tabular">{v.costPerKm ? `₹${v.costPerKm}/${v.usageUnit === 'hours' ? 'hr' : 'km'}` : '—'}</span>
                  <span className="block text-xs text-ink-3">
                    {formatCurrency(v.total, { compact: true })} · {v.distance ? `${formatNumber(v.distance)} ${v.usageUnit === 'hours' ? 'hrs' : 'km'}` : 'no readings'}
                  </span>
                </span>
              </li>
            ))}
            {!s?.byVehicle?.length && <li className="py-6 text-center text-sm text-ink-3">No data yet</li>}
          </ul>
          {energy.length > 0 && (
            <div className="grid grid-cols-2 gap-3 border-t border-line p-5 sm:grid-cols-3">
              {energy.map((f) => (
                <div key={f.unit} className="rounded-xl bg-surface-2 p-3">
                  <p className="flex items-center gap-1.5 text-xs text-ink-3">
                    <Fuel size={12} aria-hidden /> {f.unit === 'kWh' ? 'Electricity' : f.unit === 'kg' ? 'CNG' : 'Liquid fuel'}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink tabular">
                    {formatNumber(f.quantity)} {f.unit}
                  </p>
                  <p className="text-xs text-ink-3">avg ₹{f.averagePrice}/{f.unit}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="overflow-hidden">
        <FilterBar right={list.meta?.totals && <span className="text-sm text-ink-3">Total <span className="font-semibold text-ink tabular">{formatCurrency(list.meta.totals.total)}</span></span>}>
          <SearchBar size="sm" value={params.search || ''} onChange={(v) => setParams({ search: v })} placeholder="Search description, vendor, notes…" className="w-72 shrink-0" />
        </FilterBar>
        {list.error && !list.data ? (
          <ErrorState error={list.error} onRetry={list.refetch} />
        ) : (
          <ExpenseTable
            expenses={list.data || []}
            loading={list.initialLoading}
            refreshing={list.refreshing}
            onEdit={actions.editExpense}
            onDelete={actions.deleteExpense}
            sort={params.sort}
            onSortChange={(v) => setParams({ sort: v })}
          />
        )}
        <Pagination pagination={list.meta?.pagination} onPageChange={(p) => setParams({ page: p })} label="expenses" />
      </Card>
      {element}
    </>
  );
}
