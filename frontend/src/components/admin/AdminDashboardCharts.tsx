import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import type { MonthlyCountPoint, MonthlyInvoicePoint } from '@/utils/adminDashboardAnalytics';

const chartMargin = { top: 8, right: 8, left: 4, bottom: 0 };

function formatRm(value: number) {
  return `RM ${value.toLocaleString('en-MY')}`;
}

function InvoiceTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium text-slate-900">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          <span className="capitalize">{entry.name}</span>: {formatRm(entry.value)}
        </p>
      ))}
    </div>
  );
}

function CountTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-slate-900">{label}</p>
      <p className="text-slate-600">{payload[0].value} joined</p>
    </div>
  );
}

interface AdminDashboardChartsProps {
  invoiceSeries: MonthlyInvoicePoint[];
  studentsJoinedSeries: MonthlyCountPoint[];
  enrollmentsSeries: MonthlyCountPoint[];
  className?: string;
}

export function AdminDashboardCharts({
  invoiceSeries,
  studentsJoinedSeries,
  enrollmentsSeries,
  className,
}: AdminDashboardChartsProps) {
  const hasInvoices = invoiceSeries.some((d) => d.paid > 0 || d.unpaid > 0 || d.draft > 0);
  const hasStudents = studentsJoinedSeries.length > 0;
  const hasEnrollments = enrollmentsSeries.length > 0;

  return (
    <div className={cn('grid gap-4 lg:grid-cols-2', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice revenue</CardTitle>
          <p className="text-sm font-normal text-slate-500">
            Monthly amounts by status (RM)
          </p>
        </CardHeader>
        <CardContent>
          {hasInvoices ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={invoiceSeries} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip content={<InvoiceTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="paid" name="Paid" stackId="inv" fill="#10b981" />
                  <Bar dataKey="unpaid" name="Unpaid" stackId="inv" fill="#f59e0b" />
                  <Bar
                    dataKey="draft"
                    name="Draft"
                    stackId="inv"
                    fill="#94a3b8"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-slate-500">No invoice data yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Students joined</CardTitle>
          <p className="text-sm font-normal text-slate-500">
            New students by month (first enrollment)
          </p>
        </CardHeader>
        <CardContent>
          {hasStudents ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studentsJoinedSeries} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip content={<CountTooltip />} />
                  <Bar
                    dataKey="count"
                    name="Students"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-slate-500">No enrollment data yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Class enrollments</CardTitle>
          <p className="text-sm font-normal text-slate-500">
            Total new class enrollments per month
          </p>
        </CardHeader>
        <CardContent>
          {hasEnrollments ? (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={enrollmentsSeries} margin={chartMargin}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    width={28}
                  />
                  <Tooltip content={<CountTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Enrollments"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    dot={{ fill: '#0ea5e9', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-slate-500">No enrollment data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
