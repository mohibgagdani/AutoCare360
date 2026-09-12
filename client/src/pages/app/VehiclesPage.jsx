import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, LayoutGrid, List, Car, Fuel, HeartPulse, ArrowUpDown } from 'lucide-react';
import {
  PageHeader,
  Button,
  Card,
  SearchBar,
  FilterDropdown,
  SegmentedControl,
  EmptyState,
  ErrorState,
  Pagination,
  DataTable,
  HealthMeter,
  StatusBadge,
  Badge,
  Skeleton,
} from '@/components/ui';
import { VehicleCard } from '@/components/vehicles/VehicleCard';
import { VehicleThumb, RegPlate } from '@/components/vehicles/VehicleVisual';
import { OdometerModal } from '@/features/vehicles/OdometerModal';
import { vehicleApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useDisclosure, useDocumentTitle, useMeta } from '@/hooks/common';
import { formatNumber, formatDate } from '@/utils/format';
import { unitLabel, vehicleName } from '@/utils/vehicle';

const SORTS = [
  { value: '-createdAt', label: 'Recently added' },
  { value: 'healthScore', label: 'Health: lowest first' },
  { value: '-healthScore', label: 'Health: highest first' },
  { value: '-odometer', label: 'Highest mileage' },
  { value: 'make', label: 'Make (A–Z)' },
  { value: '-year', label: 'Newest model year' },
];

export default function VehiclesPage() {
  useDocumentTitle('Vehicles');
  const { vehicleTypes, fuelTypes, vehicleTypeMap, fuelTypeMap } = useMeta();
  const [params, setParams, clear] = useQueryParams({ view: 'grid', sort: '-createdAt', page: '1' });
  const odometer = useDisclosure();
  const navigate = useNavigate();
  const [limit] = useState(12);

  const query = {
    search: params.search,
    vehicleType: params.vehicleType,
    fuelType: params.fuelType,
    status: params.status,
    health: params.health,
    sort: params.sort,
    page: params.page,
    limit,
  };
  const { data, meta, initialLoading, refreshing, error, refetch } = useFetch((signal) => vehicleApi.list(query, { signal }), [JSON.stringify(query)], {
    refreshOn: ['vehicles', 'maintenance', 'services'],
  });

  const hasFilters = Boolean(params.search || params.vehicleType || params.fuelType || params.status || params.health);
  const vehicles = data || [];
  const unitOf = (v) => unitLabel(vehicleTypeMap[v.vehicleType]?.usageUnit);

  const columns = [
    {
      key: 'vehicle',
      header: 'Vehicle',
      sortKey: 'make',
      render: (v) => (
        <div className="flex items-center gap-3">
          <VehicleThumb vehicle={v} illustration={vehicleTypeMap[v.vehicleType]?.illustration} size={48} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{vehicleName(v)}</p>
            <p className="truncate text-xs text-ink-3">
              {v.make} {v.model} {v.variant} {v.year ? `· ${v.year}` : ''}
            </p>
          </div>
        </div>
      ),
      mobileFull: true,
    },
    { key: 'reg', header: 'Registration', render: (v) => <RegPlate number={v.registrationNumber} fuelType={v.fuelType} group={vehicleTypeMap[v.vehicleType]?.group} /> },
    { key: 'type', header: 'Type', hideBelow: 'lg', render: (v) => <span className="text-ink-2">{vehicleTypeMap[v.vehicleType]?.name} · {fuelTypeMap[v.fuelType]?.name}</span> },
    { key: 'odometer', header: 'Reading', sortKey: 'odometer', align: 'right', render: (v) => <span className="tabular text-ink-2">{formatNumber(v.odometer)} {unitOf(v)}</span> },
    {
      key: 'next',
      header: 'Next maintenance',
      hideBelow: 'xl',
      render: (v) =>
        v.nextService?.name ? (
          <div className="min-w-0">
            <p className="truncate text-sm text-ink">{v.nextService.name}</p>
            <p className="text-xs text-ink-3">{formatDate(v.nextService.date)}</p>
          </div>
        ) : (
          <span className="text-ink-3">—</span>
        ),
    },
    { key: 'status', header: 'Status', hideBelow: 'md', render: (v) => (v.nextService?.status ? <StatusBadge status={v.nextService.status} /> : <Badge tone="green">Up to date</Badge>) },
    { key: 'health', header: 'Health', sortKey: 'healthScore', render: (v) => <HealthMeter score={v.healthScore} /> },
  ];

  return (
    <>
      <PageHeader
        title="Vehicles"
        description={meta?.pagination ? `${meta.pagination.total} vehicle${meta.pagination.total === 1 ? '' : 's'} in your garage` : 'Your garage'}
        actions={
          <Button leftIcon={Plus} to="/app/vehicles/new">
            Add vehicle
          </Button>
        }
      />

      <Card className="mb-6">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <SearchBar value={params.search || ''} onChange={(v) => setParams({ search: v })} placeholder="Search make, model, registration, VIN…" className="lg:w-80" />
          <div className="scrollbar-none flex flex-1 items-center gap-2 overflow-x-auto">
            <FilterDropdown
              label="Type"
              icon={Car}
              multiple
              value={params.vehicleType}
              onChange={(v) => setParams({ vehicleType: v })}
              options={vehicleTypes.map((t) => ({ value: t.code, label: t.name }))}
            />
            <FilterDropdown
              label="Fuel"
              icon={Fuel}
              multiple
              value={params.fuelType}
              onChange={(v) => setParams({ fuelType: v })}
              options={fuelTypes.map((f) => ({ value: f.code, label: f.name }))}
            />
            <FilterDropdown
              label="Health"
              icon={HeartPulse}
              value={params.health}
              onChange={(v) => setParams({ health: v })}
              options={[{ value: 'attention', label: 'Needs attention (< 75)' }]}
            />
            <FilterDropdown
              label="Status"
              value={params.status}
              onChange={(v) => setParams({ status: v })}
              allLabel="Active"
              options={[
                { value: 'sold', label: 'Sold' },
                { value: 'archived', label: 'Archived' },
                { value: 'all', label: 'All vehicles' },
              ]}
            />
            <FilterDropdown label="Sort" icon={ArrowUpDown} value={params.sort === '-createdAt' ? '' : params.sort} onChange={(v) => setParams({ sort: v || '-createdAt' })} allLabel="Recently added" options={SORTS.slice(1)} />
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => clear(['view'])}>
                Clear
              </Button>
            )}
          </div>
          <SegmentedControl
            ariaLabel="View mode"
            value={params.view}
            onChange={(v) => setParams({ view: v, page: params.page })}
            options={[
              { value: 'grid', label: 'Grid view', icon: LayoutGrid, iconOnly: true },
              { value: 'list', label: 'List view', icon: List, iconOnly: true },
            ]}
          />
        </div>
      </Card>

      {error && !data ? (
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : initialLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl border border-line bg-surface">
              <Skeleton className="aspect-[16/9] rounded-none" />
              <div className="space-y-3 p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-16 w-full rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : !vehicles.length ? (
        <Card>
          <EmptyState
            icon={Car}
            title={hasFilters ? 'No vehicles match your filters' : 'Your garage is empty'}
            description={hasFilters ? 'Try a different search or clear the filters.' : 'Add a car, bike, EV, truck or tractor to generate its maintenance schedule automatically.'}
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={() => clear(['view'])}>
                  Clear filters
                </Button>
              ) : (
                <Button leftIcon={Plus} to="/app/vehicles/new">
                  Add your first vehicle
                </Button>
              )
            }
          />
        </Card>
      ) : params.view === 'list' ? (
        <Card className="overflow-hidden">
          <DataTable
            columns={columns}
            data={vehicles}
            refreshing={refreshing}
            sort={params.sort}
            onSortChange={(s) => setParams({ sort: s })}
            onRowClick={(v) => navigate(`/app/vehicles/${v._id}`)}
            caption="Vehicles"
            renderMobile={(v) => (
              <Link to={`/app/vehicles/${v._id}`} className="flex items-center gap-3">
                <VehicleThumb vehicle={v} illustration={vehicleTypeMap[v.vehicleType]?.illustration} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-ink">{vehicleName(v)}</p>
                  <p className="truncate text-xs text-ink-3">
                    {v.registrationNumber} · {formatNumber(v.odometer)} {unitOf(v)}
                  </p>
                </div>
                <HealthMeter score={v.healthScore} />
              </Link>
            )}
          />
          <Pagination pagination={meta?.pagination} onPageChange={(p) => setParams({ page: p })} label="vehicles" />
        </Card>
      ) : (
        <>
          <div className={`grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 ${refreshing ? 'opacity-60 transition-opacity' : ''}`}>
            {vehicles.map((v, i) => (
              <VehicleCard key={v._id} vehicle={v} index={i} type={vehicleTypeMap[v.vehicleType]} fuel={fuelTypeMap[v.fuelType]} onOdometer={(veh) => odometer.open(veh)} />
            ))}
            <Link
              to="/app/vehicles/new"
              className="group flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-line-strong text-ink-3 transition hover:border-brand-400 hover:bg-brand-50/40 hover:text-brand-600 dark:hover:bg-brand-500/5"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-3 transition group-hover:bg-brand-100 dark:group-hover:bg-brand-500/15">
                <Plus size={22} />
              </span>
              <span className="text-sm font-medium">Add another vehicle</span>
            </Link>
          </div>
          {meta?.pagination?.totalPages > 1 && (
            <Card className="mt-6 overflow-hidden">
              <Pagination pagination={meta.pagination} onPageChange={(p) => setParams({ page: p })} label="vehicles" />
            </Card>
          )}
        </>
      )}

      <OdometerModal
        open={odometer.isOpen}
        vehicle={odometer.payload}
        unit={vehicleTypeMap[odometer.payload?.vehicleType]?.usageUnit}
        onClose={odometer.close}
      />
    </>
  );
}
