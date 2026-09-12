import { useState } from 'react';
import toast from 'react-hot-toast';
import { UserPlus, Pencil, Trash2, Ban, CircleCheck, Eye, Shield, Car, Wallet, History, AlertTriangle } from 'lucide-react';
import {
  PageHeader,
  Card,
  Button,
  SearchBar,
  FilterDropdown,
  DataTable,
  Pagination,
  ErrorState,
  Avatar,
  Badge,
  Menu,
  FilterBar,
  Drawer,
  Skeleton,
  InfoItem,
  HealthMeter,
  Modal,
  Field,
  Textarea,
  useConfirm,
} from '@/components/ui';
import { UserFormModal } from '@/features/admin/AdminForms';
import { adminApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useQueryParams } from '@/hooks/useQueryParams';
import { useDocumentTitle } from '@/hooks/common';
import { useSelector } from 'react-redux';
import { formatCurrency, formatDate, formatNumber, formatRelative } from '@/utils/format';
import { emitChange } from '@/utils/events';
import { getErrorMessage } from '@/utils/errors';
import { vehicleName } from '@/utils/vehicle';

function UserDrawer({ userId, onClose }) {
  const { data: u, loading } = useFetch((signal) => adminApi.users.get(userId, { signal }), [userId], { enabled: Boolean(userId) });
  return (
    <Drawer open={Boolean(userId)} onClose={onClose} title={u?.name || 'User'} description={u?.email}>
      {loading || !u ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar name={u.name} src={u.avatar?.url} size={56} />
            <div>
              <div className="flex gap-2">
                <Badge tone={u.role === 'admin' ? 'violet' : 'gray'}>{u.role}</Badge>
                <Badge tone={u.isActive ? 'green' : 'red'} dot>
                  {u.isActive ? 'Active' : 'Blocked'}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-ink-3">Joined {formatDate(u.createdAt)} · last seen {formatRelative(u.lastLoginAt)}</p>
            </div>
          </div>
          {!u.isActive && u.blockedReason && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">Blocked: {u.blockedReason}</p>
          )}
          <dl className="grid grid-cols-3 gap-3">
            <InfoItem icon={Car} label="Vehicles" value={u.vehicles.length} />
            <InfoItem icon={History} label="Services" value={u.stats.serviceRecords} />
            <InfoItem icon={AlertTriangle} label="Overdue" value={u.stats.overdueTasks} />
            <InfoItem icon={Wallet} label="Total spend" value={formatCurrency(u.stats.totalSpend, { compact: true })} className="col-span-3" />
          </dl>
          <div>
            <h3 className="text-sm font-semibold text-ink">Vehicles</h3>
            <ul className="mt-2 divide-y divide-line rounded-xl border border-line">
              {u.vehicles.map((v) => (
                <li key={v._id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="h-2.5 w-2.5 rounded-full ring-1 ring-black/10" style={{ background: v.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{vehicleName(v)}</p>
                    <p className="text-xs text-ink-3">
                      {v.registrationNumber} · {formatNumber(v.odometer)}
                    </p>
                  </div>
                  <HealthMeter score={v.healthScore} />
                </li>
              ))}
              {!u.vehicles.length && <li className="px-3 py-4 text-sm text-ink-3">No vehicles yet.</li>}
            </ul>
          </div>
        </div>
      )}
    </Drawer>
  );
}

export default function AdminUsersPage() {
  useDocumentTitle('Admin · Users');
  const confirm = useConfirm();
  const me = useSelector((s) => s.auth.user);
  const [params, setParams, clear] = useQueryParams({ page: '1', sort: '-createdAt' });
  const [form, setForm] = useState({ open: false, user: null });
  const [viewId, setViewId] = useState(null);
  const [blockTarget, setBlockTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [blocking, setBlocking] = useState(false);

  const query = { search: params.search, role: params.role, status: params.status, sort: params.sort, page: params.page, limit: 12 };
  const { data, meta, initialLoading, refreshing, error, refetch } = useFetch((signal) => adminApi.users.list(query, { signal }), [JSON.stringify(query)], {
    refreshOn: ['admin-users'],
  });

  const setStatus = async (user, isActive, why) => {
    try {
      const res = await adminApi.users.setStatus(user._id, { isActive, reason: why });
      toast.success(res.message);
      emitChange('admin-users');
    } catch (e) {
      toast.error(getErrorMessage(e));
      throw e;
    }
  };

  const remove = (user) =>
    confirm({
      title: `Delete ${user.name}?`,
      message: 'This permanently deletes the account and all of its vehicles, maintenance history, expenses and documents.',
      confirmLabel: 'Delete user',
      action: async () => {
        try {
          const res = await adminApi.users.remove(user._id);
          toast.success(res.message);
          emitChange('admin-users');
        } catch (e) {
          toast.error(getErrorMessage(e));
          throw e;
        }
      },
    });

  const columns = [
    {
      key: 'user',
      header: 'User',
      sortKey: 'name',
      mobileFull: true,
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} src={u.avatar?.url} size={36} />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">
              {u.name} {u._id === me?._id && <span className="text-xs text-ink-3">(you)</span>}
            </p>
            <p className="truncate text-xs text-ink-3">{u.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', header: 'Role', sortKey: 'role', render: (u) => <Badge tone={u.role === 'admin' ? 'violet' : 'gray'} icon={u.role === 'admin' ? Shield : undefined}>{u.role === 'admin' ? 'Admin' : 'User'}</Badge> },
    { key: 'status', header: 'Status', render: (u) => <Badge tone={u.isActive ? 'green' : 'red'} dot>{u.isActive ? 'Active' : 'Blocked'}</Badge> },
    { key: 'vehicles', header: 'Vehicles', align: 'right', hideBelow: 'md', render: (u) => <span className="tabular text-ink-2">{u.vehicleCount}</span> },
    { key: 'lastLogin', header: 'Last active', sortKey: 'lastLoginAt', hideBelow: 'lg', render: (u) => <span className="text-ink-2">{u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'Never'}</span> },
    { key: 'joined', header: 'Joined', sortKey: 'createdAt', hideBelow: 'xl', render: (u) => <span className="text-ink-2">{formatDate(u.createdAt)}</span> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      mobile: false,
      render: (u) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Menu
            items={[
              { label: 'View details', icon: Eye, onClick: () => setViewId(u._id) },
              { label: 'Edit', icon: Pencil, onClick: () => setForm({ open: true, user: u }) },
              { label: 'Block user', icon: Ban, hidden: !u.isActive || u._id === me?._id, onClick: () => { setReason(''); setBlockTarget(u); } },
              { label: 'Unblock user', icon: CircleCheck, hidden: u.isActive, onClick: () => setStatus(u, true) },
              { divider: true, hidden: u._id === me?._id },
              { label: 'Delete', icon: Trash2, danger: true, hidden: u._id === me?._id, onClick: () => remove(u) },
            ]}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Users"
        description="Manage accounts, roles and access."
        actions={
          <Button leftIcon={UserPlus} onClick={() => setForm({ open: true, user: null })}>
            Create user
          </Button>
        }
      />
      <Card className="overflow-hidden">
        <FilterBar>
          <SearchBar size="sm" value={params.search || ''} onChange={(v) => setParams({ search: v })} placeholder="Search name, email, phone…" className="w-64 shrink-0" />
          <FilterDropdown label="Role" value={params.role} onChange={(v) => setParams({ role: v })} options={[{ value: 'user', label: 'Users' }, { value: 'admin', label: 'Admins' }]} />
          <FilterDropdown label="Status" value={params.status} onChange={(v) => setParams({ status: v })} options={[{ value: 'active', label: 'Active' }, { value: 'blocked', label: 'Blocked' }]} />
          {(params.search || params.role || params.status) && (
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
            onRowClick={(u) => setViewId(u._id)}
            caption="Users"
          />
        )}
        <Pagination pagination={meta?.pagination} onPageChange={(p) => setParams({ page: p })} label="users" />
      </Card>

      <UserFormModal open={form.open} user={form.user} onClose={() => setForm({ open: false, user: null })} />
      <UserDrawer userId={viewId} onClose={() => setViewId(null)} />
      <Modal
        open={Boolean(blockTarget)}
        onClose={() => setBlockTarget(null)}
        size="sm"
        icon={Ban}
        title={`Block ${blockTarget?.name}?`}
        description="They’ll be signed out everywhere and won’t be able to sign in until unblocked."
        footer={
          <>
            <Button variant="secondary" onClick={() => setBlockTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={blocking}
              onClick={async () => {
                setBlocking(true);
                try {
                  await setStatus(blockTarget, false, reason || undefined);
                  setBlockTarget(null);
                } catch {
                  /* toast shown */
                } finally {
                  setBlocking(false);
                }
              }}
            >
              Block user
            </Button>
          </>
        }
      >
        <Field label="Reason (shown to admins)" htmlFor="block-reason">
          <Textarea id="block-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Suspicious activity" />
        </Field>
      </Modal>
    </>
  );
}
