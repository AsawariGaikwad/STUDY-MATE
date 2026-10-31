import { errMsg } from '../api/client';
import { useGet } from '../hooks/useApi';
import { formatINR, formatMonth, formatPercent } from '../utils/format';
import { BarChartCard, LineChartCard } from '../components/Charts';
import { PageHeader } from '../components/ui';

const compactINR = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 });
const asPercent = (v) => formatPercent(v);

export default function Reports() {
  const fees = useGet('report-fees', '/reports/fee-collection');
  const attendance = useGet('report-attendance', '/reports/attendance-by-batch');
  const performance = useGet('report-performance', '/reports/performance-by-batch');

  const chartProps = (q) => ({
    data: q.data?.data,
    loading: q.isLoading,
    error: q.isError ? errMsg(q.error) : null,
    onRetry: () => q.refetch(),
  });

  return (
    <div>
      <PageHeader title="Reports" subtitle="How the institute is doing, at a glance." />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <LineChartCard
            title="Fee collection"
            subtitle="Amount collected each month"
            xKey="month"
            yKey="amount"
            name="Collected"
            xFormat={formatMonth}
            valueFormat={formatINR}
            tickFormat={(v) => compactINR.format(v)}
            {...chartProps(fees)}
          />
        </div>
        <BarChartCard
          title="Attendance by batch"
          subtitle="Average attendance percentage"
          xKey="batch"
          yKey="percentage"
          name="Attendance"
          valueFormat={asPercent}
          yDomain={[0, 100]}
          {...chartProps(attendance)}
        />
        <BarChartCard
          title="Performance by batch"
          subtitle="Average test score percentage"
          xKey="batch"
          yKey="percentage"
          name="Average score"
          valueFormat={asPercent}
          yDomain={[0, 100]}
          {...chartProps(performance)}
        />
      </div>
    </div>
  );
}
