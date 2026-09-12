import { useEffect } from 'react';
import { Plus, Download, Car, Wrench, History, Receipt, Calculator, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { PageHeader, Card, Button, SearchBar, FilterDropdown, Pagination, ErrorState, Menu, FilterBar, DateRangeFilter, DashboardCard } from '@/components/ui';
import { ServiceRecordList } from '@/features/services/ServiceRecordList';
import { useRecordActions } from '@/features/records/useRecordActions';
import { serviceRecordApi, exportApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useDocumentTitle } from '@/hooks/common';
import { useVehicles } from '@/hooks/useVehicles';
import { SERVICE_TYPES } from '@/utils/constants';
import { formatCurrency } from '@/utils/format';
import { vehicleName } from '@/utils/vehicle';
import { getErrorMessage } from '@/utils/errors';

export default function ServiceHistoryPage() {
  useDocumentTitle('Service history');
  const { vehicles } = useVehicles();
  const [params, setParams, clear] = useQueryParams({ page: '1', sort: '-serviceDate' });
  const { actions, element } = useRecordActions({ vehicles, defaultVehicle: params.vehicle });

  const query = {
    vehicle: params.vehicle,
    serviceType: params.serviceType,
    from: params.from,
    to: params.to,
    search: params.search,
    sort: params.sort,
    page: params.page,
    limit: 12,
  };
  const { data, meta, initialLoading, refreshing, error, refetch } = useFetch((signal) => serviceRecordApi.list(query, { signal }), [JSON.stringify(query)], {
    refreshOn: ['services'],
  });

  // Quick-add (?new=1) and deep links (?record=<id>).
  useEffect(() => {
    if (params.new) {
      actions.createService();
      setParams({ new: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.new]);
  useEffect(() => {
    if (params.record) actions.openService({ _id: params.record });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.record]);

  const filtered = Boolean(params.vehicle || params.serviceType || params.from || params.to || params.search);
  const totals = meta?.totals;
  const exportAs = (format) => exportApi.serviceRecords({ ...query, page: undefined, limit: undefined }, format).catch((e) => toast.error(getErrorMessage(e)));

  return (
    <>
      <PageHeader
        title="Service history"
        description="Every workshop visit, with parts, costs, invoices and photos."
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
            <Button leftIcon={Plus} onClick={actions.createService} disabled={!vehicles.length}>
              Log service
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DashboardCard label="Service records" value={totals?.count ?? 0} icon={History} tone="violet" sub={filtered ? 'matching filters' : 'all time'} />
        <DashboardCard label="Total spent" value={totals?.total ?? 0} format={(v) => formatCurrency(v, { compact: v > 99999 })} icon={Receipt} tone="blue" index={1} />
        <DashboardCard label="Average per visit" value={totals?.average ?? 0} format={(v) => formatCurrency(v)} icon={Calculator} tone="teal" index={2} />
        <DashboardCard
          label="Most recent"
          value={data?.[0] ? formatCurrency(data[0].totalCost) : '—'}
          icon={Star}
          tone="yellow"
          sub={data?.[0]?.serviceCenter}
          index={3}
        />
      </div>

      <Card className="overflow-hidden">
        <FilterBar>
          <SearchBar size="sm" value={params.search || ''} onChange={(v) => setParams({ search: v })} placeholder="Service centre, mechanic, part…" className="w-64 shrink-0" />
          <FilterDropdown label="Vehicle" icon={Car} value={params.vehicle} onChange={(v) => setParams({ vehicle: v })} allLabel="All vehicles" options={vehicles.map((v) => ({ value: v._id, label: vehicleName(v), color: v.color }))} />
          <FilterDropdown label="Type" icon={Wrench} multiple value={params.serviceType} onChange={(v) => setParams({ serviceType: v })} options={Object.entries(SERVICE_TYPES).map(([value, label]) => ({ value, label }))} />
          <DateRangeFilter label="Date" from={params.from || ''} to={params.to || ''} onChange={({ from, to }) => setParams({ from, to })} />

          {filtered && (
            <Button variant="ghost" size="sm" onClick={() => clear()}>
              Clear
            </Button>
          )}
        </FilterBar>
        {error && !data ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <ServiceRecordList records={data || []} loading={initialLoading} refreshing={refreshing} onOpen={actions.openService} sort={params.sort} onSortChange={(s) => setParams({ sort: s })} />
        )}
        <Pagination pagination={meta?.pagination} onPageChange={(p) => setParams({ page: p })} label="records" />
      </Card>
      {element}
    </>
  );
}
