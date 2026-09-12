import { Car, Fuel } from 'lucide-react';
import { PageHeader, Card, SearchBar, FilterDropdown, DataTable, Pagination, ErrorState, HealthMeter, Avatar, FilterBar, Button } from '@/components/ui';
import { VehicleThumb, RegPlate } from '@/components/vehicles/VehicleVisual';
import { adminApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useDocumentTitle, useMeta } from '@/hooks/common';
import { formatDate, formatNumber } from '@/utils/format';
import { unitLabel, vehicleName } from '@/utils/vehicle';

export default function AdminVehiclesPage() {
  useDocumentTitle('Admin · Vehicles');
  const { vehicleTypes, fuelTypes, vehicleTypeMap, fuelTypeMap } = useMeta();
  const [params, setParams, clear] = useQueryParams({ page: '1', sort: '-createdAt' });
  const query = { search: params.search, vehicleType: params.vehicleType, fuelType: params.fuelType, sort: params.sort, page: params.page, limit: 15 };
  const { data, meta, initialLoading, refreshing, error, refetch } = useFetch((signal) => adminApi.vehicles(query, { signal }), [JSON.stringify(query)]);

  const columns = [
    {
      key: 'vehicle',
      header: 'Vehicle',
      sortKey: 'make',
      mobileFull: true,
      render: (v) => (
        <div className="flex items-center gap-3">
          <VehicleThumb vehicle={v} illustration={vehicleTypeMap[v.vehicleType]?.illustration} size={44} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{vehicleName(v)}</p>
            <p className="truncate text-xs text-ink-3">
              {vehicleTypeMap[v.vehicleType]?.name} · {fuelTypeMap[v.fuelType]?.name}
            </p>
          </div>
        </div>
      ),
    },
    { key: 'reg', header: 'Registration', render: (v) => <RegPlate number={v.registrationNumber} fuelType={v.fuelType} group={vehicleTypeMap[v.vehicleType]?.group} /> },
    {
      key: 'owner',
      header: 'Owner',
      hideBelow: 'md',
      render: (v) => (
        <div className="flex items-center gap-2">
          <Avatar name={v.owner?.name} size={26} />
          <div className="min-w-0">
            <p className="truncate text-sm text-ink">{v.owner?.name}</p>
            <p className="truncate text-xs text-ink-3">{v.owner?.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'odometer', header: 'Reading', sortKey: 'odometer', align: 'right', hideBelow: 'lg', render: (v) => <span className="tabular text-ink-2">{formatNumber(v.odometer)} {unitLabel(vehicleTypeMap[v.vehicleType]?.usageUnit)}</span> },
    { key: 'overdue', header: 'Overdue', align: 'right', hideBelow: 'lg', render: (v) => <span className={v.openTaskCounts?.overdue ? 'font-semibold text-red-600 dark:text-red-400' : 'text-ink-3'}>{v.openTaskCounts?.overdue || 0}</span> },
    { key: 'health', header: 'Health', sortKey: 'healthScore', render: (v) => <HealthMeter score={v.healthScore} /> },
    { key: 'added', header: 'Added', sortKey: 'createdAt', hideBelow: 'xl', render: (v) => <span className="text-ink-2">{formatDate(v.createdAt)}</span> },
  ];

  return (
    <>
      <PageHeader eyebrow="Admin" title="All vehicles" description={meta?.pagination ? `${formatNumber(meta.pagination.total)} vehicles across all accounts` : 'Every vehicle on the platform'} />
      <Card className="overflow-hidden">
        <FilterBar>
          <SearchBar size="sm" value={params.search || ''} onChange={(v) => setParams({ search: v })} placeholder="Make, model, registration…" className="w-64 shrink-0" />
          <FilterDropdown label="Type" icon={Car} multiple value={params.vehicleType} onChange={(v) => setParams({ vehicleType: v })} options={vehicleTypes.map((t) => ({ value: t.code, label: t.name }))} />
          <FilterDropdown label="Fuel" icon={Fuel} multiple value={params.fuelType} onChange={(v) => setParams({ fuelType: v })} options={fuelTypes.map((f) => ({ value: f.code, label: f.name }))} />
          {(params.search || params.vehicleType || params.fuelType) && (
            <Button variant="ghost" size="sm" onClick={() => clear()}>
              Clear
            </Button>
          )}
        </FilterBar>
        {error && !data ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <DataTable columns={columns} data={data || []} loading={initialLoading} refreshing={refreshing} sort={params.sort} onSortChange={(s) => setParams({ sort: s })} caption="All vehicles" />
        )}
        <Pagination pagination={meta?.pagination} onPageChange={(p) => setParams({ page: p })} label="vehicles" />
      </Card>
    </>
  );
}
