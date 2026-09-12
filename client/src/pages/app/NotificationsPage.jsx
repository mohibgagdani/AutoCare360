import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { CheckCheck, Trash2, Inbox, X } from 'lucide-react';
import { PageHeader, Card, Button, Tabs, FilterDropdown, Pagination, ErrorState, EmptyState, Skeleton, IconButton, FilterBar } from '@/components/ui';
import { NotificationItem } from '@/components/layout/NotificationPanel';
import { notificationApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useDocumentTitle } from '@/hooks/common';
import { setUnread, fetchUnreadCount } from '@/store/notificationSlice';
import { getErrorMessage } from '@/utils/errors';
import { emitChange } from '@/utils/events';

const TYPES = [
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'reminder', label: 'Reminders' },
  { value: 'document', label: 'Documents' },
  { value: 'service', label: 'Service' },
  { value: 'system', label: 'System' },
];

export default function NotificationsPage() {
  useDocumentTitle('Notifications');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params, setParams] = useQueryParams({ filter: 'all', page: '1' });
  const query = { unread: params.filter === 'unread' ? 'true' : undefined, type: params.type, page: params.page, limit: 20 };
  const { data, meta, initialLoading, refreshing, error, refetch, setData } = useFetch((signal) => notificationApi.list(query, { signal }), [JSON.stringify(query)], {
    refreshOn: ['notifications'],
  });

  const open = async (n) => {
    if (!n.read) {
      setData((list) => list.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      await notificationApi.markRead(n._id).catch(() => {});
      dispatch(fetchUnreadCount());
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    try {
      await notificationApi.markAllRead();
      dispatch(setUnread(0));
      setData((list) => list?.map((x) => ({ ...x, read: true })));
      toast.success('All caught up!');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const clearRead = async () => {
    try {
      const res = await notificationApi.clearRead();
      toast.success(res.message);
      emitChange('notifications');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const remove = async (n) => {
    setData((list) => list.filter((x) => x._id !== n._id));
    try {
      await notificationApi.remove(n._id);
      if (!n.read) dispatch(fetchUnreadCount());
    } catch (e) {
      toast.error(getErrorMessage(e));
      refetch();
    }
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Maintenance alerts, document expiries and account activity."
        actions={
          <>
            <Button variant="secondary" leftIcon={Trash2} onClick={clearRead}>
              Clear read
            </Button>
            <Button leftIcon={CheckCheck} onClick={markAll} disabled={!meta?.unread}>
              Mark all read
            </Button>
          </>
        }
      />
      <Card className="mx-auto max-w-3xl overflow-hidden">
        <div className="px-4 pt-1 sm:px-5">
          <Tabs
            value={params.filter}
            onChange={(v) => setParams({ filter: v })}
            className="border-0"
            tabs={[
              { value: 'all', label: 'All' },
              { value: 'unread', label: 'Unread', count: meta?.unread, countTone: meta?.unread ? 'brand' : undefined },
            ]}
          />
        </div>
        <FilterBar className="border-t">
          <FilterDropdown label="Type" value={params.type} onChange={(v) => setParams({ type: v })} options={TYPES} />
        </FilterBar>
        <div className={refreshing ? 'opacity-60 transition-opacity' : ''}>
          {error && !data ? (
            <ErrorState error={error} onRetry={refetch} />
          ) : initialLoading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : data?.length ? (
            <ul className="divide-y divide-line p-2">
              {data.map((n) => (
                <li key={n._id} className="group relative">
                  <NotificationItem n={n} onClick={open} />
                  <IconButton
                    icon={X}
                    label="Remove notification"
                    onClick={() => remove(n)}
                    className="absolute right-3 top-3 opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Inbox} title={params.filter === 'unread' ? 'No unread notifications' : 'No notifications'} description="You’ll be alerted here before maintenance and documents come due." />
          )}
        </div>
        <Pagination pagination={meta?.pagination} onPageChange={(p) => setParams({ page: p })} label="notifications" />
      </Card>
    </>
  );
}
