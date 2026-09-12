import { History, FileText, Star } from 'lucide-react';
import { DataTable, EmptyState, Badge } from '@/components/ui';
import { VehicleThumb } from '@/components/vehicles/VehicleVisual';
import { useMeta } from '@/hooks/common';
import { formatCurrency, formatDate, formatNumber } from '@/utils/format';
import { SERVICE_TYPES } from '@/utils/constants';
import { unitLabel, vehicleName } from '@/utils/vehicle';

export function ServiceRecordList({ records, loading, refreshing, onOpen, showVehicle = true, sort, onSortChange, empty }) {
  const { vehicleTypeMap } = useMeta();
  const unitOf = (r) => unitLabel(vehicleTypeMap[r.vehicle?.vehicleType]?.usageUnit);

  const columns = [
    {
      key: 'date',
      header: 'Date',
      sortKey: 'serviceDate',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-3 leading-none">
            <span className="text-[10px] font-semibold uppercase text-ink-3">{formatDate(r.serviceDate, 'MMM')}</span>
            <span className="text-base font-bold text-ink">{formatDate(r.serviceDate, 'd')}</span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{r.serviceCenter || SERVICE_TYPES[r.serviceType]}</p>
            <p className="truncate text-xs text-ink-3">
              {formatDate(r.serviceDate, 'yyyy')} · {r.serviceCenterLocation || SERVICE_TYPES[r.serviceType]}
            </p>
          </div>
        </div>
      ),
      mobileFull: true,
    },
    ...(showVehicle
      ? [
          {
            key: 'vehicle',
            header: 'Vehicle',
            hideBelow: 'lg',
            render: (r) => (
              <div className="flex items-center gap-2">
                <VehicleThumb vehicle={r.vehicle} illustration={vehicleTypeMap[r.vehicle?.vehicleType]?.illustration} size={32} />
                <span className="truncate text-ink-2">{vehicleName(r.vehicle)}</span>
              </div>
            ),
          },
        ]
      : []),
    { key: 'type', header: 'Type', hideBelow: 'xl', render: (r) => <Badge tone={r.serviceType === 'repair' || r.serviceType === 'accident_repair' ? 'orange' : 'gray'}>{SERVICE_TYPES[r.serviceType]}</Badge> },
    {
      key: 'items',
      header: 'Work done',
      hideBelow: 'md',
      render: (r) => (
        <p className="max-w-[220px] truncate text-ink-2" title={r.maintenanceItems.map((i) => i.name).join(', ')}>
          {r.maintenanceItems.length ? `${r.maintenanceItems[0].name}${r.maintenanceItems.length > 1 ? ` +${r.maintenanceItems.length - 1} more` : ''}` : '—'}
        </p>
      ),
    },
    { key: 'odometer', header: 'Reading', sortKey: 'odometer', align: 'right', hideBelow: 'lg', render: (r) => <span className="tabular text-ink-2">{formatNumber(r.odometer)} {unitOf(r)}</span> },
    {
      key: 'extras',
      header: <span className="sr-only">Attachments</span>,
      hideBelow: '2xl',
      render: (r) => (
        <div className="flex items-center gap-2 text-ink-3">
          {r.invoice && <FileText size={15} aria-label="Invoice attached" />}
          {r.rating ? (
            <span className="inline-flex items-center gap-0.5 text-xs">
              <Star size={13} className="fill-amber-400 text-amber-400" aria-hidden />
              {r.rating}
            </span>
          ) : null}
        </div>
      ),
    },
    { key: 'total', header: 'Total', sortKey: 'totalCost', align: 'right', render: (r) => <span className="font-semibold text-ink tabular">{formatCurrency(r.totalCost)}</span> },
  ];

  return (
    <DataTable
      columns={columns}
      data={records}
      loading={loading}
      refreshing={refreshing}
      sort={sort}
      onSortChange={onSortChange}
      onRowClick={onOpen}
      caption="Service records"
      empty={empty || <EmptyState icon={History} title="No service records yet" description="Log workshop visits to build a complete service history — maintenance items update automatically." />}
      renderMobile={(r) => (
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-3 leading-none">
            <span className="text-[10px] font-semibold uppercase text-ink-3">{formatDate(r.serviceDate, 'MMM')}</span>
            <span className="text-base font-bold text-ink">{formatDate(r.serviceDate, 'd')}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{r.serviceCenter || SERVICE_TYPES[r.serviceType]}</p>
            <p className="truncate text-xs text-ink-3">
              {showVehicle ? `${vehicleName(r.vehicle)} · ` : ''}
              {r.maintenanceItems.length} items
            </p>
          </div>
          <span className="text-sm font-semibold text-ink tabular">{formatCurrency(r.totalCost)}</span>
        </div>
      )}
    />
  );
}
