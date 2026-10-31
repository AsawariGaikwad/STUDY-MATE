import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, EmptyState, ErrorState, Skeleton } from './ui';

function useChartColors() {
  const { theme } = useAuth();
  const dark = theme === 'dark';
  return {
    axis: dark ? '#94a3b8' : '#64748b',
    grid: dark ? '#334155' : '#e2e8f0',
    series: dark ? '#fbbf24' : '#3347b8',
    tooltipBg: dark ? '#0f172a' : '#ffffff',
    tooltipBorder: dark ? '#334155' : '#e2e8f0',
    text: dark ? '#e2e8f0' : '#1e293b',
  };
}

function ChartShell({ title, subtitle, loading, error, onRetry, empty, height, children }) {
  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-base font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {loading ? (
        <Skeleton className="w-full" style={{ height }} />
      ) : error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : empty ? (
        <EmptyState icon={BarChart3} title="No data yet" message="This chart fills in as records are added." />
      ) : (
        children
      )}
    </Card>
  );
}

function prepare(data, yKey) {
  return (Array.isArray(data) ? data : []).map((d) => ({ ...d, [yKey]: Number(d[yKey]) || 0 }));
}

function ChartTooltip({ active, payload, label, c, fmt, xFormat, name }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-soft"
      style={{ background: c.tooltipBg, borderColor: c.tooltipBorder, color: c.text }}
    >
      <p className="font-medium">{xFormat ? xFormat(label) : label}</p>
      <p>
        {name ? `${name}: ` : ''}
        <strong>{fmt(payload[0].value)}</strong>
      </p>
    </div>
  );
}

export function BarChartCard({
  title,
  subtitle,
  data,
  xKey,
  yKey,
  name,
  loading,
  error,
  onRetry,
  valueFormat = (v) => v,
  tickFormat,
  xFormat,
  yDomain,
  height = 280,
  ariaLabel,
}) {
  const c = useChartColors();
  const rows = prepare(data, yKey);
  return (
    <ChartShell
      title={title}
      subtitle={subtitle}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={rows.length === 0}
      height={height}
    >
      <div role="img" aria-label={ariaLabel || title} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: c.axis, fontSize: 12 }} tickFormatter={xFormat} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: c.axis, fontSize: 12 }} tickFormatter={tickFormat || valueFormat} domain={yDomain} axisLine={false} tickLine={false} width={64} />
            <Tooltip
              cursor={{ fill: c.grid, opacity: 0.35 }}
              content={<ChartTooltip c={c} fmt={valueFormat} xFormat={xFormat} name={name} />}
            />
            <Bar dataKey={yKey} fill={c.series} radius={[6, 6, 0, 0]} maxBarSize={44} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  );
}

export function LineChartCard({
  title,
  subtitle,
  data,
  xKey,
  yKey,
  name,
  loading,
  error,
  onRetry,
  valueFormat = (v) => v,
  tickFormat,
  xFormat,
  yDomain,
  height = 280,
  ariaLabel,
}) {
  const c = useChartColors();
  const rows = prepare(data, yKey);
  return (
    <ChartShell
      title={title}
      subtitle={subtitle}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={rows.length === 0}
      height={height}
    >
      <div role="img" aria-label={ariaLabel || title} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid stroke={c.grid} strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={xKey} tick={{ fill: c.axis, fontSize: 12 }} tickFormatter={xFormat} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: c.axis, fontSize: 12 }} tickFormatter={tickFormat || valueFormat} domain={yDomain} axisLine={false} tickLine={false} width={64} />
            <Tooltip content={<ChartTooltip c={c} fmt={valueFormat} xFormat={xFormat} name={name} />} />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={c.series}
              strokeWidth={2.5}
              dot={{ r: 3, fill: c.series }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartShell>
  );
}
