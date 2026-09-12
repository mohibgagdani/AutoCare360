import { Link } from 'react-router-dom';
import { Users, UserCheck, UserX, Car, ListChecks, Wrench, AlertTriangle, Wallet, ArrowRight, History, FileText } from 'lucide-react';
import { PageHeader, DashboardCard, Card, CardHeader, Button, Avatar, Badge, ErrorState, StatSkeleton, CardSkeleton } from '@/components/ui';
import { MultiLineChart, TrendAreaChart } from '@/components/charts/Charts';
import { ChartCard } from '@/components/charts/ChartCard';
import { RankedBars } from '@/components/charts/RankedBars';
import { adminApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useDocumentTitle, useMeta } from '@/hooks/common';
import { formatCurrency, formatNumber, formatRelative } from '@/utils/format';
import { TASK_STATUS } from '@/utils/constants';

export default function AdminDashboardPage() {
  useDocumentTitle('Admin · Analytics');
  const { fuelTypeMap } = useMeta();
  const { data, initialLoading, error, refetch } = useFetch((signal) => adminApi.analytics({ signal }), []);

  const header = <PageHeader eyebrow="Admin" title="Platform analytics" description="Usage, growth and maintenance health across every AutoCare360 account." />;

  if (error) {
    return (
      <>
        {header}
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      </>
    );
  }
  if (initialLoading || !data) {
    return (
      <>
        {header}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
        <CardSkeleton className="mt-6" rows={6} />
      </>
    );
  }

  const { stats, growth, vehiclesByType, vehiclesByFuel, taskStatus, topMaintenance, recentUsers } = data;
  const kpis = [
    { label: 'Total users', value: stats.users, icon: Users, tone: 'blue', sub: `${stats.newUsersThisMonth} new this month`, to: '/admin/users' },
    { label: 'Active users', value: stats.activeUsers, icon: UserCheck, tone: 'green', sub: `${stats.admins} administrator${stats.admins === 1 ? '' : 's'}` },
    { label: 'Blocked users', value: stats.blockedUsers, icon: UserX, tone: stats.blockedUsers ? 'red' : 'gray', to: '/admin/users?status=blocked' },
    { label: 'Vehicles tracked', value: stats.vehicles, icon: Car, tone: 'violet', to: '/admin/vehicles' },
    { label: 'Active templates', value: stats.activeTemplates, icon: ListChecks, tone: 'teal', to: '/admin/templates?isActive=true' },
    { label: 'Open maintenance', value: stats.openTasks, icon: Wrench, tone: 'blue', sub: `${formatNumber(stats.completedTasks)} completed all-time`, to: '/admin/maintenance?status=up_to_date,due_soon,due,overdue' },
    { label: 'Overdue items', value: stats.overdueTasks, icon: AlertTriangle, tone: 'orange', to: '/admin/maintenance?status=overdue' },
    { label: 'Spend tracked', value: stats.trackedSpend, format: (v) => formatCurrency(v, { compact: true }), icon: Wallet, tone: 'yellow', sub: `${formatNumber(stats.expenses)} expenses` },
  ];

  const statusItems = ['overdue', 'due', 'due_soon', 'up_to_date', 'completed', 'skipped']
    .filter((s) => taskStatus[s])
    .map((s) => ({ key: s, label: TASK_STATUS[s].label, value: taskStatus[s] }));

  return (
    <>
      {header}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <DashboardCard key={k.label} index={i} {...k} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <MultiLineChart
          className="xl:col-span-2"
          title="Growth"
          description="New users and vehicles per month"
          data={growth}
          seriesDefs={[
            { key: 'users', name: 'New users' },
            { key: 'vehicles', name: 'New vehicles' },
          ]}
          height={260}
        />
        <ChartCard fluid title="Vehicles by type" description="Across all accounts" isEmpty={!vehiclesByType.length} height={260}
          table={{ columns: [{ key: 'label', label: 'Type' }, { key: 'value', label: 'Vehicles', align: 'right' }], rows: vehiclesByType.map((v) => ({ label: v.name, value: v.count })) }}>
          <RankedBars className="px-2" items={vehiclesByType.map((v) => ({ key: v.code, label: v.name, value: v.count }))} format={formatNumber} />
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <TrendAreaChart title="Tracked spend" description="Expenses logged per month (all users)" data={growth} dataKey="spend" name="Spend" height={220} />
        <ChartCard fluid title="Maintenance status" description="All maintenance items" isEmpty={!statusItems.length} height={220}
          table={{ columns: [{ key: 'label', label: 'Status' }, { key: 'value', label: 'Items', align: 'right' }], rows: statusItems }}>
          <RankedBars className="px-2" items={statusItems} format={formatNumber} />
        </ChartCard>
        <ChartCard fluid title="Most completed maintenance" description="Template items completed" isEmpty={!topMaintenance.length} height={220}
          table={{ columns: [{ key: 'label', label: 'Item' }, { key: 'value', label: 'Completions', align: 'right' }], rows: topMaintenance.map((t) => ({ label: t.name, value: t.count })) }}>
          <RankedBars className="px-2" limit={6} items={topMaintenance.map((t) => ({ key: t.name, label: t.name, value: t.count }))} format={formatNumber} />
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Newest users" action={<Button variant="ghost" size="sm" to="/admin/users" rightIcon={ArrowRight}>All users</Button>} />
          <ul className="divide-y divide-line px-5 pb-2 pt-2">
            {recentUsers.map((u) => (
              <li key={u._id} className="flex items-center gap-3 py-3">
                <Avatar name={u.name} src={u.avatar?.url} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{u.name}</p>
                  <p className="truncate text-xs text-ink-3">{u.email}</p>
                </div>
                {u.role === 'admin' && <Badge tone="violet">Admin</Badge>}
                {!u.isActive && <Badge tone="red">Blocked</Badge>}
                <span className="hidden text-xs text-ink-3 sm:block">joined {formatRelative(u.createdAt)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Fuel mix" description="Vehicles by primary fuel" />
          <div className="px-5 pb-5 pt-4">
            <RankedBars items={vehiclesByFuel.map((f) => ({ key: f.code, label: fuelTypeMap[f.code]?.name || f.code, value: f.count }))} format={formatNumber} />
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-line p-5">
            <Link to="/admin/maintenance?tab=services" className="rounded-xl bg-surface-2 p-3 transition hover:bg-surface-3">
              <History size={16} className="text-ink-3" aria-hidden />
              <p className="mt-2 text-lg font-semibold text-ink tabular">{formatNumber(stats.serviceRecords)}</p>
              <p className="text-xs text-ink-3">Service records</p>
            </Link>
            <div className="rounded-xl bg-surface-2 p-3">
              <FileText size={16} className="text-ink-3" aria-hidden />
              <p className="mt-2 text-lg font-semibold text-ink tabular">{formatNumber(stats.documents)}</p>
              <p className="text-xs text-ink-3">Documents stored</p>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
