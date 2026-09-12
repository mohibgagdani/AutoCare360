import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Power } from 'lucide-react';
import { PageHeader, Card, Button, SearchBar, DataTable, ErrorState, Badge, Menu, FilterBar, useConfirm } from '@/components/ui';
import { CategoryIcon } from '@/components/maintenance/MaintenanceBits';
import { VehicleArt } from '@/components/vehicles/VehicleArt';
import { CatalogFormModal } from '@/features/admin/AdminForms';
import { adminApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useDocumentTitle, useMeta } from '@/hooks/common';
import { useDispatch } from 'react-redux';
import { fetchMeta } from '@/store/metaSlice';
import { VEHICLE_GROUPS, POWERTRAINS } from '@/utils/constants';
import { emitChange } from '@/utils/events';
import { getErrorMessage } from '@/utils/errors';

const CONFIG = {
  categories: {
    title: 'Maintenance categories',
    description: 'Group maintenance items (engine, brakes, EV system…). Colours and icons appear across the app.',
    api: adminApi.categories,
  },
  vehicleTypes: {
    title: 'Vehicle types',
    description: 'Add new vehicle types without code changes — pick a group and it inherits that group’s maintenance templates.',
    api: adminApi.vehicleTypes,
  },
  fuelTypes: {
    title: 'Fuel types',
    description: 'Each fuel maps to a powertrain, which decides whether combustion, hybrid or EV maintenance applies.',
    api: adminApi.fuelTypes,
  },
};

export default function AdminCatalogPage({ kind }) {
  const config = CONFIG[kind];
  useDocumentTitle(`Admin · ${config.title}`);
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const { fuelTypeMap } = useMeta();
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ open: false, item: null });

  const { data, initialLoading, refreshing, error, refetch } = useFetch((signal) => config.api.list({ search, limit: 200 }, { signal }), [kind, search], {
    refreshOn: [`admin-${kind}`],
  });

  const run = async (fn) => {
    try {
      const res = await fn();
      toast.success(res.message);
      emitChange(`admin-${kind}`);
      dispatch(fetchMeta(true));
    } catch (e) {
      toast.error(getErrorMessage(e));
      throw e;
    }
  };

  const remove = (item) =>
    confirm({
      title: `Delete “${item.name}”?`,
      message: 'Items that are in use can’t be deleted — deactivate them instead.',
      confirmLabel: 'Delete',
      action: () => run(() => config.api.remove(item._id)),
    });

  const nameColumn = {
    key: 'name',
    header: 'Name',
    mobileFull: true,
    render: (item) => (
      <div className="flex items-center gap-3">
        {kind === 'categories' && <CategoryIcon category={item} size={34} />}
        {kind === 'vehicleTypes' && (
          <div className="w-16 shrink-0 rounded-lg bg-surface-2 p-0.5">
            <VehicleArt illustration={item.illustration} color="#3b6af5" ground={false} />
          </div>
        )}
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-medium text-ink">
            {item.name}
            {!item.isActive && <Badge tone="gray" size="xs">Inactive</Badge>}
          </p>
          <p className="font-mono text-[11px] text-ink-3">{item.code}</p>
        </div>
      </div>
    ),
  };

  const extraColumns = {
    categories: [
      { key: 'desc', header: 'Description', hideBelow: 'md', render: (c) => <span className="text-ink-2">{c.description}</span> },
      { key: 'color', header: 'Colour', hideBelow: 'lg', render: (c) => <span className="inline-flex items-center gap-2 font-mono text-xs text-ink-3"><span className="h-4 w-4 rounded" style={{ background: c.color }} />{c.color}</span> },
    ],
    vehicleTypes: [
      { key: 'group', header: 'Group', render: (t) => <Badge tone="brand">{VEHICLE_GROUPS[t.group]}</Badge> },
      { key: 'unit', header: 'Usage unit', hideBelow: 'md', render: (t) => <span className="text-ink-2">{t.usageUnit === 'hours' ? 'Hour meter' : 'Odometer (km)'}</span> },
      { key: 'fuels', header: 'Allowed fuels', hideBelow: 'lg', render: (t) => <span className="text-ink-2">{t.allowedFuelTypes?.length ? t.allowedFuelTypes.map((f) => fuelTypeMap[f]?.name || f).join(', ') : 'Any'}</span> },
    ],
    fuelTypes: [{ key: 'pt', header: 'Powertrain', render: (f) => <Badge tone={f.powertrain === 'ev' ? 'green' : f.powertrain === 'hybrid' ? 'teal' : 'gray'}>{POWERTRAINS[f.powertrain]}</Badge> }],
  }[kind];

  const columns = [
    nameColumn,
    ...extraColumns,
    { key: 'sort', header: 'Order', align: 'right', hideBelow: 'xl', render: (i) => <span className="tabular text-ink-3">{i.sortOrder}</span> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      mobile: false,
      render: (item) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Menu
            items={[
              { label: 'Edit', icon: Pencil, onClick: () => setForm({ open: true, item }) },
              { label: item.isActive ? 'Deactivate' : 'Activate', icon: Power, onClick: () => run(() => config.api.update(item._id, { isActive: !item.isActive })) },
              { divider: true },
              { label: 'Delete', icon: Trash2, danger: true, onClick: () => remove(item) },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Admin · Catalog"
        title={config.title}
        description={config.description}
        actions={
          <Button leftIcon={Plus} onClick={() => setForm({ open: true, item: null })}>
            Add new
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <FilterBar>
          <SearchBar size="sm" value={search} onChange={setSearch} placeholder="Search…" className="w-64 shrink-0" />
        </FilterBar>
        {error && !data ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : (
          <DataTable columns={columns} data={data || []} loading={initialLoading} refreshing={refreshing} onRowClick={(item) => setForm({ open: true, item })} caption={config.title} />
        )}
      </Card>
      <CatalogFormModal kind={kind} open={form.open} item={form.item} onClose={() => setForm({ open: false, item: null })} />
    </>
  );
}
