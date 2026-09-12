import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Bell, CheckCheck, Info, CircleCheck, AlertTriangle, CircleAlert, Inbox } from 'lucide-react';
import { usePopover, PopoverPanel, SegmentedControl, Skeleton, EmptyState, Drawer } from '@/components/ui';
import { notificationApi } from '@/services';
import { setUnread, decrementUnread } from '@/store/notificationSlice';
import { useIsMobile } from '@/hooks/common';
import { formatRelative } from '@/utils/format';
import { emitChange } from '@/utils/events';
import { cn } from '@/utils/cn';

export const SEVERITY_ICON = {
  info: { icon: Info, className: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' },
  success: { icon: CircleCheck, className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300' },
  warning: { icon: AlertTriangle, className: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
  critical: { icon: CircleAlert, className: 'bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300' },
};

export function NotificationItem({ n, onClick, compact }) {
  const meta = SEVERITY_ICON[n.severity] || SEVERITY_ICON.info;
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={() => onClick(n)}
      className={cn('flex w-full gap-3 rounded-xl p-3 text-left transition hover:bg-surface-2', !n.read && 'bg-brand-50/50 dark:bg-brand-500/[0.06]')}
    >
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', meta.className)}>
        <Icon size={17} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className={cn('text-sm leading-snug text-ink', !n.read && 'font-semibold')}>{n.title}</span>
          {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" aria-label="Unread" />}
        </span>
        {n.message && <span className={cn('mt-0.5 block text-[13px] text-ink-3', compact && 'line-clamp-2')}>{n.message}</span>}
        <span className="mt-1 block text-[11px] font-medium text-ink-3">{formatRelative(n.createdAt)}</span>
      </span>
    </button>
  );
}

function PanelBody({ onNavigate }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [items, setItems] = useState(null);

  const load = () =>
    notificationApi
      .list({ limit: 12, unread: filter === 'unread' ? 'true' : undefined })
      .then((res) => {
        setItems(res.data);
        dispatch(setUnread(res.meta.unread));
      })
      .catch(() => setItems([]));

  useEffect(() => {
    setItems(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const open = async (n) => {
    if (!n.read) {
      setItems((list) => list.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      dispatch(decrementUnread());
      notificationApi.markRead(n._id).catch(() => {});
    }
    onNavigate?.();
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    await notificationApi.markAllRead();
    dispatch(setUnread(0));
    setItems((list) => list?.map((x) => ({ ...x, read: true })));
    emitChange('notifications');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-3">
        <SegmentedControl
          ariaLabel="Filter notifications"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'unread', label: 'Unread' },
          ]}
        />
        <button type="button" onClick={markAll} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10">
          <CheckCheck size={14} aria-hidden /> Mark all read
        </button>
      </div>
      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-1.5">
        {items === null ? (
          <div className="space-y-3 p-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length ? (
          <div className="space-y-0.5 pb-2">
            {items.map((n) => (
              <NotificationItem key={n._id} n={n} onClick={open} compact />
            ))}
          </div>
        ) : (
          <EmptyState compact icon={Inbox} title={filter === 'unread' ? "You're all caught up" : 'No notifications yet'} description="Maintenance alerts and document reminders will appear here." />
        )}
      </div>
      <div className="border-t border-line p-2">
        <Link
          to="/app/notifications"
          onClick={onNavigate}
          className="block rounded-lg py-2 text-center text-[13px] font-medium text-ink-2 transition hover:bg-surface-2 hover:text-ink"
        >
          View all notifications
        </Link>
      </div>
    </div>
  );
}

/** Bell button + notification centre (popover on desktop, sheet on mobile). */
export function NotificationBell() {
  const unread = useSelector((s) => s.notifications.unread);
  const isMobile = useIsMobile();
  const popover = usePopover('end');
  const [sheet, setSheet] = useState(false);

  const toggle = () => (isMobile ? setSheet(true) : popover.setOpen((o) => !o));

  return (
    <>
      <button
        ref={popover.anchorRef}
        type="button"
        onClick={toggle}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 transition hover:bg-surface-3 hover:text-ink"
      >
        <Bell size={19} aria-hidden />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9.5px] font-bold text-white ring-2 ring-surface animate-pulse-ring">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <PopoverPanel popover={popover} className="flex h-[520px] max-h-[75vh] w-[400px] flex-col p-0">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">Notifications</h2>
          {unread > 0 && <span className="text-xs text-ink-3">{unread} unread</span>}
        </div>
        <PanelBody onNavigate={() => popover.setOpen(false)} />
      </PopoverPanel>
      <Drawer open={sheet} onClose={() => setSheet(false)} title="Notifications" width="max-w-full sm:max-w-md">
        <div className="-mx-5 -my-5 h-[calc(100dvh-73px)]">
          <PanelBody onNavigate={() => setSheet(false)} />
        </div>
      </Drawer>
    </>
  );
}
