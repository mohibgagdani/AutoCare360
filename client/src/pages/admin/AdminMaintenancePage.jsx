import { Wrench, History } from 'lucide-react';
import { PageHeader, Card, SearchBar, FilterDropdown, DataTable, Pagination, ErrorState, Tabs, StatusBadge, PriorityBadge, FilterBar } from '@/components/ui';
import { CategoryIcon } from '@/components/maintenance/MaintenanceBits';
import { adminApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useDocumentTitle } from '@/hooks/common';
import { TASK_STATUS, PRIORITY, SERVICE_TYPES } from '@/utils/constants';
import { formatCurrency, formatDate, formatNumber } from '@/utils/format';
import { vehicleName } from '@/utils/vehicle';

function TasksTable({ params, setParams }) {
  const query = { status: params.status, priority: params.priority, search: params.search, sort: params.sort, page: params.page, limit: 15 };
  const { data, meta, initialLoading, refreshing, error, refetch } = useFetch((signal) => adminApi.maintenance(query, { signal }), [JSON.stringify(query)]);
  const columns = [
    {
      key: 'item',
      header: 'Item',
      sortKey: 'name',
      mobileFull: true,
      render: (t) => (
        <div className="flex items-center gap-3">
          <CategoryIcon category={t.category} size={32} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{t.name}</p>
            <p className="truncate text-xs text-ink-3">{t.category?.name}</p>
          </div>
        </div>
      ),
    },
    { key: 'vehicle', header: 'Vehicle', render: (t) => <span className="text-ink-2">{vehicleName(t.vehicle)} · {t.vehicle?.registrationNumber}</span> },
    { key: 'owner', header: 'Owner', hideBelow: 'lg', render: (t) => <span className="text-ink-2">{t.owner?.name}</span> },
    { key: 'status', header: 'Status', sortKey: 'status', render: (t) => <StatusBadge status={t.status} /> },
    { key: 'priority', header: 'Priority', hideBelow: 'xl', render: (t) => <PriorityBadge priority={t.priority} /> },
    { key: 'date', header: 'Due / done', sortKey: 'nextDueDate', hideBelow: 'md', render: (t) => <span className="text-ink-2">{formatDate(t.completedAt || t.skippedAt || t.nextDueDate)}</span> },
  ];
  return (
    <>
      <FilterBar>
        <SearchBar size="sm" value={params.search || ''} onChange={(v) => setParams({ search: v })} placeholder="Search items…" className="w-56 shrink-0" />
        <FilterDropdown label="Status" multiple value={params.status} onChange={(v) => setParams({ status: v })} options={Object.entries(TASK_STATUS).map(([value, m]) => ({ value, label: m.label }))} />
        <FilterDropdown label="Priority" multiple value={params.priority} onChange={(v) => setParams({ priority: v })} options={Object.entries(PRIORITY).map(([value, m]) => ({ value, label: m.label }))} />
      </FilterBar>
      {error && !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <DataTable columns={columns} data={data || []} loading={initialLoading} refreshing={refreshing} sort={params.sort} onSortChange={(s) => setParams({ sort: s })} caption="Maintenance records" />
      )}
      <Pagination pagination={meta?.pagination} onPageChange={(p) => setParams({ page: p })} label="items" />
    </>
  );
}

function ServicesTable({ params, setParams }) {
  const query = { search: params.search, sort: params.sort, page: params.page, limit: 15 };
  const { data, meta, initialLoading, refreshing, error, refetch } = useFetch((signal) => adminApi.serviceRecords(query, { signal }), [JSON.stringify(query)]);
  const columns = [
    { key: 'date', header: 'Date', sortKey: 'serviceDate', render: (r) => <span className="text-ink-2">{formatDate(r.serviceDate)}</span> },
    { key: 'center', header: 'Service centre', mobileFull: true, render: (r) => <span className="font-medium text-ink">{r.serviceCenter || SERVICE_TYPES[r.serviceType]}</span> },
    { key: 'vehicle', header: 'Vehicle', render: (r) => <span className="text-ink-2">{vehicleName(r.vehicle)} · {r.vehicle?.registrationNumber}</span> },
    { key: 'owner', header: 'Owner', hideBelow: 'lg', render: (r) => <span className="text-ink-2">{r.owner?.name}</span> },
    { key: 'items', header: 'Items', align: 'right', hideBelow: 'md', render: (r) => <span className="tabular text-ink-2">{formatNumber(r.maintenanceItems.length)}</span> },
    { key: 'total', header: 'Total', sortKey: 'totalCost', align: 'right', render: (r) => <span className="font-semibold text-ink tabular">{formatCurrency(r.totalCost)}</span> },
  ];
  return (
    <>
      <FilterBar>
        <SearchBar size="sm" value={params.search || ''} onChange={(v) => setParams({ search: v })} placeholder="Service centre, mechanic, item…" className="w-64 shrink-0" />
      </FilterBar>
      {error && !data ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <DataTable columns={columns} data={data || []} loading={initialLoading} refreshing={refreshing} sort={params.sort} onSortChange={(s) => setParams({ sort: s })} caption="Service records" />
      )}
      <Pagination pagination={meta?.pagination} onPageChange={(p) => setParams({ page: p })} label="records" />
    </>
  );
}

export default function AdminMaintenancePage() {
  useDocumentTitle('Admin · Maintenance');
  const [params, setParams] = useQueryParams({ tab: 'tasks', page: '1' });
  return (
    <>
      <PageHeader eyebrow="Admin" title="Maintenance records" description="Maintenance items and service visits across every account." />
      <Card className="overflow-hidden">
        <div className="px-4 pt-1 sm:px-5">
          <Tabs
            className="border-0"
            value={params.tab}
            // One update: two back-to-back setSearchParams calls would clobber each other.
            onChange={(v) => setParams({ tab: v, search: '', status: '', priority: '', sort: '' })}
            tabs={[
              { value: 'tasks', label: 'Maintenance items', icon: Wrench },
              { value: 'services', label: 'Service records', icon: History },
            ]}
          />
        </div>
        <div className="border-t border-line">
          {params.tab === 'services' ? <ServicesTable params={params} setParams={setParams} /> : <TasksTable params={params} setParams={setParams} />}
        </div>
      </Card>
    </>
  );
}
