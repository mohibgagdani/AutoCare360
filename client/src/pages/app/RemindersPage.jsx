import { useEffect } from 'react';
import { Plus, Car, Tags, BellRing, AlertCircle, CheckCheck, CalendarClock } from 'lucide-react';
import { PageHeader, Card, Button, SearchBar, FilterDropdown, Pagination, ErrorState, Tabs, FilterBar, Skeleton, Callout } from '@/components/ui';
import { ReminderList } from '@/features/reminders/ReminderList';
import { useReminderActions } from '@/features/reminders/useReminderActions';
import { reminderApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useDocumentTitle } from '@/hooks/common';
import { useVehicles } from '@/hooks/useVehicles';
import { REMINDER_TYPES } from '@/utils/constants';
import { vehicleName } from '@/utils/vehicle';

export default function RemindersPage() {
  useDocumentTitle('Reminders');
  const { vehicles } = useVehicles();
  const [params, setParams, clear] = useQueryParams({ status: 'upcoming', page: '1' });
  const { actions, element } = useReminderActions({ vehicles, defaultVehicle: params.vehicle });

  const query = { status: params.status, vehicle: params.vehicle, type: params.type, search: params.search, page: params.page, limit: 20 };
  const { data, meta, initialLoading, refreshing, error, refetch } = useFetch((signal) => reminderApi.list(query, { signal }), [JSON.stringify(query)], {
    refreshOn: ['reminders', 'documents', 'maintenance'],
  });

  useEffect(() => {
    if (params.new) {
      actions.create();
      setParams({ new: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.new]);

  const counts = meta?.counts || {};
  const filtered = Boolean(params.vehicle || params.type || params.search);

  return (
    <>
      <PageHeader
        title="Reminders"
        description="Maintenance alerts, document renewals and your own reminders — with 7 / 15 / 30-day or custom timing."
        actions={
          <Button leftIcon={Plus} onClick={actions.create}>
            New reminder
          </Button>
        }
      />

      {counts.overdue > 0 && params.status !== 'overdue' && (
        <Callout
          tone="danger"
          icon={AlertCircle}
          className="mb-5"
          title={`${counts.overdue} reminder${counts.overdue > 1 ? 's are' : ' is'} past due`}
          action={
            <Button size="sm" variant="danger" onClick={() => setParams({ status: 'overdue' })}>
              Review
            </Button>
          }
        >
          Renew documents or complete maintenance to clear them.
        </Callout>
      )}

      <Card className="overflow-hidden">
        <div className="px-4 pt-1 sm:px-5">
          <Tabs
            value={params.status}
            onChange={(v) => setParams({ status: v })}
            className="border-0"
            tabs={[
              { value: 'upcoming', label: 'Upcoming', icon: CalendarClock, count: counts.upcoming },
              { value: 'overdue', label: 'Overdue', icon: AlertCircle, count: counts.overdue, countTone: counts.overdue ? 'red' : undefined },
              { value: 'completed', label: 'Completed', icon: CheckCheck, count: counts.completed },
              { value: 'all', label: 'All', icon: BellRing },
            ]}
          />
        </div>
        <FilterBar className="border-t">
          <SearchBar size="sm" value={params.search || ''} onChange={(v) => setParams({ search: v })} placeholder="Search reminders…" className="w-60 shrink-0" />
          <FilterDropdown label="Vehicle" icon={Car} value={params.vehicle} onChange={(v) => setParams({ vehicle: v })} allLabel="All vehicles" options={vehicles.map((v) => ({ value: v._id, label: vehicleName(v), color: v.color }))} />
          <FilterDropdown label="Type" icon={Tags} multiple value={params.type} onChange={(v) => setParams({ type: v })} options={Object.entries(REMINDER_TYPES).map(([value, m]) => ({ value, label: m.label, icon: m.icon }))} />
          {filtered && (
            <Button variant="ghost" size="sm" onClick={() => clear(['status'])}>
              Clear
            </Button>
          )}
        </FilterBar>
        <div className={refreshing ? 'opacity-60 transition-opacity' : ''}>
          {error && !data ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : initialLoading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : (
            <ReminderList reminders={data || []} actions={actions} />
          )}
        </div>
        <Pagination pagination={meta?.pagination} onPageChange={(p) => setParams({ page: p })} label="reminders" />
      </Card>
      {element}
    </>
  );
}
