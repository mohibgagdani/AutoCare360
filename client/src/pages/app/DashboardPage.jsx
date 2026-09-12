import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import {
  Car,
  Wrench,
  AlertTriangle,
  CalendarClock,
  Wallet,
  CalendarDays,
  ClipboardList,
  Calculator,
  Plus,
  History,
  ArrowRight,
  CircleAlert,
  FileWarning,
  BellRing,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  PageHeader,
  DashboardCard,
  Button,
  Card,
  CardHeader,
  StatSkeleton,
  CardSkeleton,
  ErrorState,
  EmptyState,
  HealthMeter,
  HealthRing,
  StatusBadge,
} from '@/components/ui';
import { StackedMonthlyChart, HorizontalBarChart, TrendAreaChart, MultiLineChart } from '@/components/charts/Charts';
import { ChartCard } from '@/components/charts/ChartCard';
import { RankedBars } from '@/components/charts/RankedBars';
import { ActivityTimeline } from '@/components/common/Timeline';
import { CategoryIcon, describeDue } from '@/components/maintenance/MaintenanceBits';
import { VehicleThumb } from '@/components/vehicles/VehicleVisual';
import { useTaskActions } from '@/features/maintenance/useTaskActions';
import { dashboardApi } from '@/services';
import { useFetch } from '@/hooks/useFetch';
import { useDocumentTitle, useMeta } from '@/hooks/common';
import { formatCurrency, formatNumber } from '@/utils/format';
import { EXPENSE_CATEGORIES } from '@/utils/constants';
import { vehicleName } from '@/utils/vehicle';
import { cn } from '@/utils/cn';
import { useEntrance } from '@/hooks/useMotion';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

const ALERT_STYLE = {
  critical: { icon: CircleAlert, className: 'border-red-200 bg-red-50/70 dark:border-red-500/25 dark:bg-red-500/10', iconClass: 'text-red-600 dark:text-red-400' },
  warning: { icon: AlertTriangle, className: 'border-amber-200 bg-amber-50/70 dark:border-amber-500/25 dark:bg-amber-500/10', iconClass: 'text-amber-600 dark:text-amber-400' },
  info: { icon: BellRing, className: 'border-blue-200 bg-blue-50/70 dark:border-blue-500/25 dark:bg-blue-500/10', iconClass: 'text-blue-600 dark:text-blue-400' },
};

function SmartAlerts({ alerts }) {
  const entrance = useEntrance({ opacity: 0, y: 8 });
  if (!alerts?.length) return null;
  return (
    <div className="scrollbar-none -mx-4 mb-6 flex snap-x gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 xl:grid-cols-4">
      {alerts.slice(0, 4).map((a, i) => {
        const style = ALERT_STYLE[a.severity] || ALERT_STYLE.info;
        const Icon = a.type === 'document' ? FileWarning : style.icon;
        return (
          <motion.div key={a.title} initial={entrance} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="min-w-[270px] snap-start sm:min-w-0">
            <Link to={a.link} className={cn('group flex h-full items-start gap-3 rounded-2xl border p-4 transition hover:shadow-card-hover', style.className)}>
              <Icon size={18} className={cn('mt-0.5 shrink-0', style.iconClass)} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">{a.title}</p>
                <p className="mt-0.5 truncate text-xs text-ink-2">{a.message}</p>
              </div>
              <ArrowRight size={16} className="mt-0.5 shrink-0 text-ink-3 transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}

function UpcomingTimeline({ tasks, actions, typeMap }) {
  if (!tasks.length) {
    return <EmptyState compact icon={CheckCircle2} title="You're all caught up" description="No maintenance is due soon. We'll alert you before anything comes up." />;
  }
  return (
    <ol className="space-y-2">
      {tasks.map((t) => {
        const unit = typeMap[t.vehicle?.vehicleType]?.usageUnit;
        return (
          <li key={t._id}>
            <button
              type="button"
              onClick={() => actions.open(t)}
              className="flex w-full items-center gap-3 rounded-xl border border-transparent p-2.5 text-left transition hover:border-line hover:bg-surface-2"
            >
              <CategoryIcon category={t.category} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-ink">{t.name}</p>
                  <StatusBadge status={t.status} size="xs" />
                </div>
                <p className="truncate text-xs text-ink-3">
                  {vehicleName(t.vehicle)} · {describeDue(t, unit)}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const user = useSelector((s) => s.auth.user);
  const { vehicleTypeMap } = useMeta();
  const { data, initialLoading, refreshing, error, refetch } = useFetch((signal) => dashboardApi.get({ signal }), [], {
    refreshOn: ['maintenance', 'vehicles', 'services', 'expenses', 'documents', 'reminders'],
  });
  const { actions, element } = useTaskActions({ vehicles: data?.vehicles || [] });

  const firstName = user?.name?.split(' ')[0] || 'there';
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const header = (
    <PageHeader
      eyebrow={today}
      title={`${greeting()}, ${firstName}`}
      description="Here’s what’s happening across your garage."
      actions={
        <>
          <Button variant="secondary" leftIcon={History} to="/app/service-history?new=1">
            Log service
          </Button>
          <Button leftIcon={Plus} to="/app/vehicles/new">
            Add vehicle
          </Button>
        </>
      }
    />
  );

  if (error && !data) {
    return (
      <>
        {header}
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      </>
    );
  }

  if (initialLoading) {
    return (
      <>
        {header}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <StatSkeleton key={i} />
          ))}
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <CardSkeleton className="xl:col-span-2" rows={6} />
          <CardSkeleton rows={6} />
        </div>
      </>
    );
  }

  const { stats, charts, upcoming, alerts, recentActivity, vehicles } = data;

  if (!stats.totalVehicles) {
    return (
      <>
        {header}
        <Card className="overflow-hidden">
          <div className="relative px-6 py-16 text-center">
            <div className="bg-grid absolute inset-0 opacity-60" aria-hidden />
            <EmptyState
              className="relative"
              icon={Car}
              title="Add your first vehicle"
              description="AutoCare360 builds a maintenance schedule tailored to your vehicle’s type, fuel and powertrain — cars, bikes, EVs, trucks and tractors."
              action={
                <Button size="lg" leftIcon={Plus} to="/app/vehicles/new">
                  Add a vehicle
                </Button>
              }
            />
          </div>
        </Card>
      </>
    );
  }

  const kpis = [
    { label: 'Total vehicles', value: stats.totalVehicles, icon: Car, tone: 'blue', sub: `Avg health ${stats.averageHealthScore}/100`, to: '/app/vehicles' },
    {
      label: 'Need maintenance',
      value: stats.vehiclesNeedingMaintenance,
      icon: Wrench,
      tone: stats.vehiclesNeedingMaintenance ? 'orange' : 'green',
      sub: stats.vehiclesNeedingMaintenance ? 'vehicles with due/overdue items' : 'Every vehicle is up to date',
      to: '/app/vehicles?health=attention',
    },
    {
      label: 'Overdue items',
      value: stats.overdueMaintenance,
      icon: AlertTriangle,
      tone: stats.overdueMaintenance ? 'red' : 'green',
      sub: 'past their due date or reading',
      to: '/app/maintenance?status=overdue',
    },
    { label: 'Upcoming items', value: stats.upcomingMaintenance, icon: CalendarClock, tone: 'yellow', sub: 'due now or due soon', to: '/app/maintenance?status=due,due_soon' },
    { label: 'Total spending', value: stats.totalSpending, format: (v) => formatCurrency(v, { compact: v > 99999 }), icon: Wallet, tone: 'violet', sub: 'all-time tracked costs', to: '/app/expenses' },
    {
      label: 'This month',
      value: stats.currentMonthSpending,
      format: (v) => formatCurrency(v),
      icon: CalendarDays,
      tone: 'teal',
      delta: stats.monthOverMonthChange !== null ? { value: stats.monthOverMonthChange, goodWhenUp: false } : null,
      sub: 'vs last month',
      to: '/app/expenses',
    },
    { label: 'Service records', value: stats.totalServiceRecords, icon: ClipboardList, tone: 'gray', sub: `${formatCurrency(stats.totalServiceSpend, { compact: true })} on servicing`, to: '/app/service-history' },
    { label: 'Avg. service cost', value: stats.averageMaintenanceCost, format: (v) => formatCurrency(v), icon: Calculator, tone: 'blue', sub: 'per workshop visit', to: '/app/service-history' },
  ];

  const categoryItems = charts.expensesByCategory.map((c) => ({
    key: c.category,
    label: EXPENSE_CATEGORIES[c.category]?.label || c.category,
    icon: EXPENSE_CATEGORIES[c.category]?.icon,
    value: c.total,
  }));

  return (
    <>
      {header}
      <SmartAlerts alerts={alerts} />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <DashboardCard key={k.label} index={i} {...k} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <StackedMonthlyChart
          className="xl:col-span-2"
          title="Monthly expenses"
          description="Last 12 months · fuel & charging vs maintenance vs everything else"
          data={charts.monthlyExpenses}
          refreshing={refreshing}
          height={280}
          seriesDefs={[
            { key: 'energy', label: 'Fuel & charging' },
            { key: 'maintenance', label: 'Maintenance & repairs' },
            { key: 'other', label: 'Other costs' },
          ]}
        />
        <Card className="flex flex-col">
          <CardHeader
            title="Upcoming maintenance"
            description="Most urgent first"
            action={
              <Button variant="ghost" size="sm" to="/app/maintenance" rightIcon={ArrowRight}>
                All
              </Button>
            }
          />
          <div className="flex-1 px-3 pb-3 pt-3">
            <UpcomingTimeline tasks={upcoming} actions={actions} typeMap={vehicleTypeMap} />
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard
          title="Expenses by category"
          description="Last 12 months"
          fluid
          isEmpty={!categoryItems.length}
          height={280}
          table={{ columns: [{ key: 'label', label: 'Category' }, { key: 'value', label: 'Amount', align: 'right', format: (v) => formatCurrency(v) }], rows: categoryItems }}
        >
          <RankedBars items={categoryItems} format={(v) => formatCurrency(v, { compact: v > 99999 })} className="px-2" />
        </ChartCard>
        <HorizontalBarChart title="Expenses by vehicle" description="Last 12 months" data={charts.expensesByVehicle} refreshing={refreshing} />
        <Card className="flex flex-col lg:col-span-2 xl:col-span-1">
          <CardHeader title="Fleet health" description="Lowest scores first" action={<Button variant="ghost" size="sm" to="/app/vehicles" rightIcon={ArrowRight}>Garage</Button>} />
          <ul className="flex-1 divide-y divide-line px-5 pb-2 pt-2">
            {vehicles.slice(0, 6).map((v) => (
              <li key={v._id}>
                <Link to={`/app/vehicles/${v._id}`} className="flex items-center gap-3 py-2.5 transition hover:opacity-80">
                  <VehicleThumb vehicle={v} illustration={vehicleTypeMap[v.vehicleType]?.illustration} size={42} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{vehicleName(v)}</p>
                    <p className="truncate text-xs text-ink-3">
                      {v.openTaskCounts?.overdue ? `${v.openTaskCounts.overdue} overdue · ` : ''}
                      {v.nextService?.name || 'All up to date'}
                    </p>
                  </div>
                  <HealthMeter score={v.healthScore} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <StackedMonthlyChart
          title="Maintenance completion"
          description="Items closed per month · last 6 months"
          data={charts.completionTrend}
          refreshing={refreshing}
          height={230}
          valueFormatter={(v) => formatNumber(v)}
          seriesDefs={[
            { key: 'onTime', label: 'On time' },
            { key: 'late', label: 'Completed late' },
            { key: 'skipped', label: 'Skipped' },
          ]}
        />
        <TrendAreaChart title="Cost trend" description="Cumulative spend over the last 12 months" data={charts.costTrend} dataKey="cumulative" name="Cumulative spend" refreshing={refreshing} height={230} />
        <MultiLineChart
          className="lg:col-span-2 xl:col-span-1"
          title="Vehicle usage"
          description="Kilometres driven per month"
          data={charts.mileageTrend.data}
          seriesDefs={charts.mileageTrend.series}
          unit=" km"
          refreshing={refreshing}
          height={230}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Recent activity" description="Services, expenses and completed maintenance" />
          <div className="px-3 pb-4 pt-2">
            {recentActivity.length ? <ActivityTimeline items={recentActivity} /> : <EmptyState compact icon={History} title="No activity yet" />}
          </div>
        </Card>
        <Card className="relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-500/15 blur-2xl" aria-hidden />
          <CardHeader title="Garage health" description="Average across active vehicles" icon={Sparkles} />
          <div className="flex flex-col items-center px-5 pb-6 pt-4">
            <HealthRing score={stats.averageHealthScore ?? 100} size={132} stroke={11} />
            <dl className="mt-5 grid w-full grid-cols-3 gap-2 text-center">
              {[
                ['Up to date', stats.upToDate, 'text-emerald-600 dark:text-emerald-400'],
                ['Due soon', stats.upcomingMaintenance, 'text-amber-600 dark:text-amber-400'],
                ['Overdue', stats.overdueMaintenance, 'text-red-600 dark:text-red-400'],
              ].map(([label, value, cls]) => (
                <div key={label} className="rounded-xl bg-surface-2 py-2.5">
                  <dd className={cn('text-lg font-semibold tabular', cls)}>{formatNumber(value)}</dd>
                  <dt className="text-[11px] text-ink-3">{label}</dt>
                </div>
              ))}
            </dl>
            <Button variant="secondary" className="mt-5 w-full" to="/app/maintenance?status=overdue" rightIcon={ArrowRight}>
              Review overdue items
            </Button>
          </div>
        </Card>
      </div>
      {element}
    </>
  );
}
