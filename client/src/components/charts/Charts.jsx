import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  LineChart,
  Line,
  LabelList,
} from 'recharts';
import { ChartCard } from './ChartCard';
import { ChartTooltip, axisProps, gridProps, series, BAR_MAX, BAR_RADIUS, activeDot, cursorFill, surfaceGap } from './chartTheme';
import { formatCurrency, formatMonth, formatMonthLong, formatNumber } from '@/utils/format';
import { useReducedMotionPref } from '@/hooks/useMotion';

const money = (v) => formatCurrency(v);
const moneyCompact = (v) => formatCurrency(v, { compact: true });

/**
 * Stacked monthly columns. series: [{ key, label }] — colours by fixed slot order.
 */
export function StackedMonthlyChart({ title, description, data = [], seriesDefs, loading, refreshing, height = 260, valueFormatter = money, action, className }) {
  const animate = !useReducedMotionPref();
  const isEmpty = !loading && !data.some((d) => seriesDefs.some((s) => d[s.key] > 0));
  return (
    <ChartCard
      title={title}
      description={description}
      action={action}
      loading={loading}
      refreshing={refreshing}
      isEmpty={isEmpty}
      height={height}
      className={className}
      legend={seriesDefs.map((s, i) => ({ label: s.label, color: series(i) }))}
      table={{
        columns: [
          { key: 'month', label: 'Month', format: formatMonthLong },
          ...seriesDefs.map((s) => ({ key: s.key, label: s.label, align: 'right', format: (v) => valueFormatter(v || 0) })),
          { key: '__total', label: 'Total', align: 'right', format: (_, row) => valueFormatter(seriesDefs.reduce((sum, s) => sum + (row[s.key] || 0), 0)) },
        ],
        rows: data,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="month" tickFormatter={formatMonth} {...axisProps} interval="preserveStartEnd" minTickGap={8} />
          <YAxis tickFormatter={valueFormatter === money ? moneyCompact : (v) => formatNumber(v, { compact: true })} {...axisProps} width={56} />
          <Tooltip cursor={cursorFill} content={<ChartTooltip labelFormatter={formatMonthLong} valueFormatter={valueFormatter} hideZero total />} />
          {seriesDefs.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              stackId="stack"
              fill={series(i)}
              maxBarSize={BAR_MAX}
              radius={i === seriesDefs.length - 1 ? BAR_RADIUS : 0}
              {...surfaceGap}
              isAnimationActive={animate}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** One series → one colour; value printed at each bar tip. */
export function HorizontalBarChart({ title, description, data = [], loading, refreshing, height, valueFormatter = money, className, labelKey = 'name', valueKey = 'total' }) {
  const animate = !useReducedMotionPref();
  const rows = data.slice(0, 8);
  const h = height || Math.max(180, rows.length * 38 + 20);
  return (
    <ChartCard
      title={title}
      description={description}
      loading={loading}
      refreshing={refreshing}
      isEmpty={!loading && !rows.length}
      height={h}
      className={className}
      table={{ columns: [{ key: labelKey, label: 'Name' }, { key: valueKey, label: 'Amount', align: 'right', format: valueFormatter }], rows: data }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey={labelKey} {...axisProps} width={110} tick={{ fill: 'var(--c-ink-2)', fontSize: 12 }} />
          <Tooltip cursor={cursorFill} content={<ChartTooltip valueFormatter={valueFormatter} />} />
          <Bar dataKey={valueKey} name="Spend" fill={series(0)} barSize={16} radius={[0, 4, 4, 0]} isAnimationActive={animate}>
            <LabelList dataKey={valueKey} position="right" formatter={moneyCompact} style={{ fill: 'var(--c-ink-2)', fontSize: 11, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** Single-series area (e.g. cumulative spend). */
export function TrendAreaChart({ title, description, data = [], dataKey, name, loading, refreshing, height = 240, valueFormatter = money, className }) {
  const animate = !useReducedMotionPref();
  const isEmpty = !loading && !data.some((d) => d[dataKey] > 0);
  return (
    <ChartCard
      title={title}
      description={description}
      loading={loading}
      refreshing={refreshing}
      isEmpty={isEmpty}
      height={height}
      className={className}
      table={{ columns: [{ key: 'month', label: 'Month', format: formatMonthLong }, { key: dataKey, label: name, align: 'right', format: valueFormatter }], rows: data }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`area-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.22} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="month" tickFormatter={formatMonth} {...axisProps} interval="preserveStartEnd" minTickGap={8} />
          <YAxis tickFormatter={moneyCompact} {...axisProps} width={56} />
          <Tooltip content={<ChartTooltip labelFormatter={formatMonthLong} valueFormatter={valueFormatter} />} cursor={{ stroke: 'var(--chart-axis)' }} />
          <Area type="monotone" dataKey={dataKey} name={name} stroke="var(--chart-1)" strokeWidth={2} fill={`url(#area-${dataKey})`} activeDot={activeDot} dot={false} isAnimationActive={animate} />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

/** Multi-series lines (≤6), colours in fixed slot order per entity. */
export function MultiLineChart({ title, description, data = [], seriesDefs = [], loading, refreshing, height = 240, valueFormatter = (v) => formatNumber(v), unit = '', className }) {
  const animate = !useReducedMotionPref();
  const isEmpty = !loading && (!seriesDefs.length || !data.some((d) => seriesDefs.some((s) => d[s.key] > 0)));
  return (
    <ChartCard
      title={title}
      description={description}
      loading={loading}
      refreshing={refreshing}
      isEmpty={isEmpty}
      height={height}
      className={className}
      legend={seriesDefs.map((s, i) => ({ label: s.name, color: series(i), type: 'line' }))}
      table={{
        columns: [{ key: 'month', label: 'Month', format: formatMonthLong }, ...seriesDefs.map((s) => ({ key: s.key, label: s.name, align: 'right', format: (v) => `${formatNumber(v || 0)}${unit}` }))],
        rows: data,
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="month" tickFormatter={formatMonth} {...axisProps} />
          <YAxis tickFormatter={(v) => formatNumber(v, { compact: true })} {...axisProps} width={48} />
          <Tooltip content={<ChartTooltip labelFormatter={formatMonthLong} valueFormatter={(v) => `${valueFormatter(v)}${unit}`} />} cursor={{ stroke: 'var(--chart-axis)' }} />
          {seriesDefs.map((s, i) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={series(i)} strokeWidth={2} dot={false} activeDot={activeDot} strokeLinecap="round" isAnimationActive={animate} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
