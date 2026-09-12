import { useEffect } from 'react';
import { Upload, Car, FileText, ShieldAlert, ShieldCheck, Clock, Files } from 'lucide-react';
import { PageHeader, Card, Button, SearchBar, FilterDropdown, Pagination, ErrorState, FilterBar, Skeleton, DashboardCard, EmptyState } from '@/components/ui';
import { DocumentGrid } from '@/features/documents/DocumentGrid';
import { useRecordActions } from '@/features/records/useRecordActions';
import { documentApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useDocumentTitle } from '@/hooks/common';
import { useVehicles } from '@/hooks/useVehicles';
import { DOCUMENT_TYPES } from '@/utils/constants';
import { vehicleName } from '@/utils/vehicle';

export default function DocumentsPage() {
  useDocumentTitle('Documents');
  const { vehicles } = useVehicles();
  const [params, setParams, clear] = useQueryParams({ page: '1', sort: 'expiryDate' });
  const { actions, element } = useRecordActions({ vehicles, defaultVehicle: params.vehicle });

  const query = { vehicle: params.vehicle, type: params.type, expiry: params.expiry, search: params.search, sort: params.sort, page: params.page, limit: 12 };
  const { data, meta, initialLoading, refreshing, error, refetch } = useFetch((signal) => documentApi.list(query, { signal }), [JSON.stringify(query)], {
    refreshOn: ['documents'],
  });

  useEffect(() => {
    if (params.new) {
      actions.createDocument();
      setParams({ new: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.new]);

  const counts = meta?.counts || {};
  const filtered = Boolean(params.vehicle || params.type || params.expiry || params.search);
  const setExpiry = (value) => setParams({ expiry: params.expiry === value ? '' : value });

  return (
    <>
      <PageHeader
        title="Documents"
        description="RC, insurance, PUC, warranties, licences and invoices — with automatic expiry reminders."
        actions={
          <Button leftIcon={Upload} onClick={actions.createDocument}>
            Upload document
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button type="button" className="text-left" onClick={() => setParams({ expiry: '' })}>
          <DashboardCard label="All documents" value={counts.total ?? 0} icon={Files} tone="blue" />
        </button>
        <button type="button" className="text-left" onClick={() => setExpiry('expired')}>
          <DashboardCard label="Expired" value={counts.expired ?? 0} icon={ShieldAlert} tone={counts.expired ? 'red' : 'gray'} sub="renew as soon as possible" index={1} className={params.expiry === 'expired' ? 'ring-2 ring-red-500/40' : ''} />
        </button>
        <button type="button" className="text-left" onClick={() => setExpiry('expiring')}>
          <DashboardCard label="Expiring in 30 days" value={counts.expiring ?? 0} icon={Clock} tone={counts.expiring ? 'yellow' : 'gray'} index={2} className={params.expiry === 'expiring' ? 'ring-2 ring-amber-500/40' : ''} />
        </button>
        <button type="button" className="text-left" onClick={() => setExpiry('valid')}>
          <DashboardCard label="Valid" value={counts.valid ?? 0} icon={ShieldCheck} tone="green" index={3} className={params.expiry === 'valid' ? 'ring-2 ring-emerald-500/40' : ''} />
        </button>
      </div>

      <Card className="mb-5 overflow-hidden">
        <FilterBar>
          <SearchBar size="sm" value={params.search || ''} onChange={(v) => setParams({ search: v })} placeholder="Search name, number, issuer…" className="w-64 shrink-0" />
          <FilterDropdown
            label="Vehicle"
            icon={Car}
            value={params.vehicle}
            onChange={(v) => setParams({ vehicle: v })}
            allLabel="All"
            options={[{ value: 'none', label: 'Personal (no vehicle)' }, ...vehicles.map((v) => ({ value: v._id, label: vehicleName(v), color: v.color }))]}
          />
          <FilterDropdown label="Type" icon={FileText} multiple value={params.type} onChange={(v) => setParams({ type: v })} options={Object.entries(DOCUMENT_TYPES).map(([value, m]) => ({ value, label: m.label, icon: m.icon }))} />
          <FilterDropdown
            label="Sort"
            value={params.sort === 'expiryDate' ? '' : params.sort}
            onChange={(v) => setParams({ sort: v || 'expiryDate' })}
            allLabel="Expiry (soonest)"
            options={[
              { value: '-uploadDate', label: 'Recently uploaded' },
              { value: 'name', label: 'Name (A–Z)' },
            ]}
          />
          {filtered && (
            <Button variant="ghost" size="sm" onClick={() => clear()}>
              Clear
            </Button>
          )}
        </FilterBar>
      </Card>

      <div className={refreshing ? 'opacity-60 transition-opacity' : ''}>
        {error && !data ? (
          <Card>
            <ErrorState error={error} onRetry={refetch} />
          </Card>
        ) : initialLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-52 rounded-2xl" />
            ))}
          </div>
        ) : (
          <DocumentGrid
            documents={data || []}
            onEdit={actions.editDocument}
            onDelete={actions.deleteDocument}
            empty={
              <Card>
                <EmptyState
                  icon={FileText}
                  title={filtered ? 'No documents match these filters' : 'Your document vault is empty'}
                  description={filtered ? 'Try clearing the filters.' : 'Upload your RC, insurance and PUC to get reminders before they expire.'}
                  action={
                    filtered ? (
                      <Button variant="secondary" onClick={() => clear()}>
                        Clear filters
                      </Button>
                    ) : (
                      <Button leftIcon={Upload} onClick={actions.createDocument}>
                        Upload a document
                      </Button>
                    )
                  }
                />
              </Card>
            }
          />
        )}
      </div>
      {meta?.pagination?.totalPages > 1 && (
        <Card className="mt-5 overflow-hidden">
          <Pagination pagination={meta.pagination} onPageChange={(p) => setParams({ page: p })} label="documents" />
        </Card>
      )}
      {element}
    </>
  );
}
