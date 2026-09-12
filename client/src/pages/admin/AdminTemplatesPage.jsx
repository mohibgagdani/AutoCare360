import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Copy, Trash2, Send, Power, Car, Layers, Flag, Sparkles, Fuel } from 'lucide-react';
import { PageHeader, Card, Button, SearchBar, FilterDropdown, DataTable, Pagination, ErrorState, Badge, Menu, FilterBar, PriorityBadge, useConfirm } from '@/components/ui';
import { CategoryIcon } from '@/components/maintenance/MaintenanceBits';
import { TemplateFormModal } from '@/features/admin/AdminForms';
import { adminApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useDocumentTitle, useMeta } from '@/hooks/common';
import { PRIORITY, VEHICLE_GROUPS, POWERTRAINS } from '@/utils/constants';
import { formatCurrency, formatNumber } from '@/utils/format';
import { emitChange } from '@/utils/events';
import { getErrorMessage } from '@/utils/errors';

export default function AdminTemplatesPage() {
  useDocumentTitle('Admin · Templates');
  const confirm = useConfirm();
  const { categories, vehicleTypes, vehicleTypeMap, fuelTypes, fuelTypeMap } = useMeta();
  const [params, setParams, clear] = useQueryParams({ page: '1', sort: 'name' });
  const [form, setForm] = useState({ open: false, template: null });

  const query = {
    search: params.search,
    category: params.category,
    vehicleType: params.vehicleType,
    vehicleGroup: params.vehicleGroup,
    fuelType: params.fuelType,
    powertrain: params.powertrain,
    priority: params.priority,
    scope: params.scope,
    isActive: params.isActive,
    sort: params.sort,
    page: params.page,
    limit: 20,
  };
  const { data, meta, initialLoading, refreshing, error, refetch } = useFetch((signal) => adminApi.templates.list(query, { signal }), [JSON.stringify(query)], {
    refreshOn: ['admin-templates'],
  });

  const run = async (fn) => {
    try {
      const res = await fn();
      toast.success(res.message);
      emitChange('admin-templates');
    } catch (e) {
      toast.error(getErrorMessage(e));
      throw e;
    }
  };

  const apply = (t) =>
    confirm({
      tone: 'info',
      title: `Apply “${t.name}” to open items?`,
      message: 'Existing open maintenance items created from this template get its current interval, cost and priority. Their due points are recalculated and owners are notified.',
      confirmLabel: 'Apply now',
      action: () => run(() => adminApi.templates.apply(t._id)),
    });

  const remove = (t) =>
    confirm({
      title: `Delete “${t.name}”?`,
      message: 'Templates used by open maintenance items can’t be deleted — deactivate them instead.',
      confirmLabel: 'Delete',
      action: () => run(() => adminApi.templates.remove(t._id)),
    });

  const scope = (t) => {
    const parts = [
      ...t.vehicleGroups.map((g) => VEHICLE_GROUPS[g]),
      ...t.vehicleTypes.map((c) => vehicleTypeMap[c]?.name || c),
    ];
    return parts.join(', ');
  };

  const columns = [
    {
      key: 'name',
      header: 'Template',
      sortKey: 'name',
      mobileFull: true,
      render: (t) => (
        <div className="flex items-center gap-3">
          <CategoryIcon category={t.category} size={34} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate font-medium text-ink">
              {t.name}
              {!t.isActive && <Badge tone="gray" size="xs">Inactive</Badge>}
            </p>
            <p className="truncate font-mono text-[11px] text-ink-3">{t.code}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'applies',
      header: 'Applies to',
      hideBelow: 'md',
      render: (t) => (
        <div className="max-w-xs">
          <p className="truncate text-sm text-ink-2" title={scope(t)}>
            {scope(t)}
          </p>
          <div className="mt-1 flex flex-wrap gap-1">
            {t.fuelTypes.map((f) => (
              <Badge key={f} tone="teal" size="xs">
                {fuelTypeMap[f]?.name || f}
              </Badge>
            ))}
            {t.powertrains.map((p) => (
              <Badge key={p} tone="blue" size="xs">
                {p.toUpperCase()}
              </Badge>
            ))}
            {t.transmissions.map((x) => (
              <Badge key={x} tone="violet" size="xs">
                {x}
              </Badge>
            ))}
            {t.makes.length > 0 && (
              <Badge tone="yellow" size="xs" icon={Sparkles}>
                {t.makes.join(', ')}
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'interval',
      header: 'Interval',
      sortKey: 'intervalKm',
      render: (t) => (
        <span className="text-sm text-ink-2 tabular">{[t.intervalKm && formatNumber(t.intervalKm), t.intervalMonths && `${t.intervalMonths} mo`].filter(Boolean).join(' / ')}</span>
      ),
    },
    { key: 'priority', header: 'Priority', sortKey: 'priority', hideBelow: 'lg', render: (t) => <PriorityBadge priority={t.priority} /> },
    { key: 'cost', header: 'Est. cost', sortKey: 'estimatedCost', align: 'right', hideBelow: 'xl', render: (t) => <span className="tabular text-ink-2">{t.estimatedCost ? formatCurrency(t.estimatedCost) : '—'}</span> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      mobile: false,
      render: (t) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Menu
            items={[
              { label: 'Edit', icon: Pencil, onClick: () => setForm({ open: true, template: t }) },
              { label: 'Duplicate as override', icon: Copy, onClick: () => run(() => adminApi.templates.duplicate(t._id)) },
              { label: 'Apply to open items', icon: Send, onClick: () => apply(t) },
              { label: t.isActive ? 'Deactivate' : 'Activate', icon: Power, onClick: () => run(() => adminApi.templates.update(t._id, { isActive: !t.isActive })) },
              { divider: true },
              { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(t) },
            ]}
          />
        </div>
      ),
    },
  ];

  const hasFilters = ['search', 'category', 'vehicleType', 'vehicleGroup', 'fuelType', 'powertrain', 'priority', 'scope', 'isActive'].some((k) => params[k]);

  return (
    <>
      <PageHeader
        eyebrow="Admin · Catalog"
        title="Maintenance templates"
        description={`${meta?.pagination?.total ?? '…'} templates power vehicle-specific schedules. Templates sharing a code override each other — most specific wins.`}
        actions={
          <Button leftIcon={Plus} onClick={() => setForm({ open: true, template: null })}>
            New template
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <FilterBar>
          <SearchBar size="sm" value={params.search || ''} onChange={(v) => setParams({ search: v })} placeholder="Name, code, make…" className="w-56 shrink-0" />
          <FilterDropdown label="Vehicle type" icon={Car} value={params.vehicleType} onChange={(v) => setParams({ vehicleType: v })} options={vehicleTypes.map((t) => ({ value: t.code, label: t.name }))} />
          <FilterDropdown label="Group" value={params.vehicleGroup} onChange={(v) => setParams({ vehicleGroup: v })} options={Object.entries(VEHICLE_GROUPS).map(([value, label]) => ({ value, label }))} />
          <FilterDropdown label="Fuel" icon={Fuel} value={params.fuelType} onChange={(v) => setParams({ fuelType: v })} options={fuelTypes.map((f) => ({ value: f.code, label: f.name }))} />
          <FilterDropdown label="Powertrain" value={params.powertrain} onChange={(v) => setParams({ powertrain: v })} options={Object.entries(POWERTRAINS).map(([value, label]) => ({ value, label }))} />
          <FilterDropdown label="Category" icon={Layers} value={params.category} onChange={(v) => setParams({ category: v })} options={categories.map((c) => ({ value: c._id, label: c.name, color: c.color }))} />
          <FilterDropdown label="Priority" icon={Flag} value={params.priority} onChange={(v) => setParams({ priority: v })} options={Object.entries(PRIORITY).map(([value, m]) => ({ value, label: m.label }))} />
          <FilterDropdown label="Scope" value={params.scope} onChange={(v) => setParams({ scope: v })} options={[{ value: 'manufacturer', label: 'Manufacturer-specific' }]} />
          <FilterDropdown label="State" value={params.isActive} onChange={(v) => setParams({ isActive: v })} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => clear()}>
              Clear
            </Button>
          )}
        </FilterBar>
        {error && !data ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <DataTable
            columns={columns}
            data={data || []}
            loading={initialLoading}
            refreshing={refreshing}
            sort={params.sort}
            onSortChange={(s) => setParams({ sort: s })}
            onRowClick={(t) => setForm({ open: true, template: t })}
            caption="Maintenance templates"
          />
        )}
        <Pagination pagination={meta?.pagination} onPageChange={(p) => setParams({ page: p })} label="templates" />
      </Card>
      <TemplateFormModal open={form.open} template={form.template} onClose={() => setForm({ open: false, template: null })} />
    </>
  );
}
