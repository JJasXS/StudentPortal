import { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
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
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import {
  attendanceApi,
  enrollmentsApi,
  invoicesApi,
} from '@/api/resources';
import {
  mockAttendance,
  mockEnrollments,
  mockInvoices,
} from '@/utils/mockData';
import { loadAllInvoices } from '@/utils/mockInvoiceStore';
import {
  buildEnrollmentMonthlySeries,
  buildInvoiceMonthlySeries,
  buildRevenueByCourseSeries,
  filterEnrollmentsByDateRange,
  filterInvoicesByDateRange,
} from '@/utils/adminDashboardAnalytics';
import { exportAttendanceCsv, exportAttendancePdf } from '@/utils/attendanceExport';
import { exportRevenueCsv } from '@/utils/revenueExport';
import type { Attendance, Enrollment, Invoice } from '@/types';

const chartMargin = { top: 8, right: 8, left: 4, bottom: 0 };

function formatRm(value: number) {
  return `RM ${value.toLocaleString('en-MY')}`;
}

export default function AdminReportsPage() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>(mockEnrollments);
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const useMock = import.meta.env.VITE_USE_MOCK === 'true';
    Promise.all([
      attendanceApi.getAll().catch(() => mockAttendance),
      enrollmentsApi.getAll().catch(() => mockEnrollments),
      invoicesApi.getAll().catch(() => mockInvoices),
    ])
      .then(([att, enr]) => {
        setAttendance(att.length ? att : mockAttendance);
        setEnrollments(useMock || enr.length < mockEnrollments.length ? mockEnrollments : enr);
        setInvoices(loadAllInvoices());
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredInvoices = useMemo(
    () => filterInvoicesByDateRange(invoices, fromMonth || undefined, toMonth || undefined),
    [invoices, fromMonth, toMonth]
  );
  const filteredEnrollments = useMemo(
    () => filterEnrollmentsByDateRange(enrollments, fromMonth || undefined, toMonth || undefined),
    [enrollments, fromMonth, toMonth]
  );

  const invoiceSeries = useMemo(
    () => buildInvoiceMonthlySeries(filteredInvoices),
    [filteredInvoices]
  );
  const courseRevenue = useMemo(
    () => buildRevenueByCourseSeries(filteredInvoices),
    [filteredInvoices]
  );
  const enrollmentsSeries = useMemo(
    () => buildEnrollmentMonthlySeries(filteredEnrollments),
    [filteredEnrollments]
  );

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Revenue, enrollment trends, and exports"
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportRevenueCsv(filteredInvoices)}
          >
            <FileSpreadsheet className="mr-1.5 h-4 w-4" />
            Export revenue CSV
          </Button>
        }
      />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <div>
            <Label htmlFor="from-month">From month</Label>
            <Input
              id="from-month"
              type="month"
              value={fromMonth}
              onChange={(e) => setFromMonth(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="to-month">To month</Label>
            <Input
              id="to-month"
              type="month"
              value={toMonth}
              onChange={(e) => setToMonth(e.target.value)}
            />
          </div>
          {(fromMonth || toMonth) && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setFromMonth('');
                setToMonth('');
              }}
            >
              Clear range
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by month</CardTitle>
            <p className="text-sm font-normal text-slate-500">Paid vs outstanding invoice amounts</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-16 text-center text-sm text-slate-500">Loading…</p>
            ) : invoiceSeries.length ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={invoiceSeries} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={40} />
                    <Tooltip formatter={(v) => formatRm(Number(v ?? 0))} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="paid" name="Paid" stackId="a" fill="#10b981" />
                    <Bar dataKey="unpaid" name="Unpaid" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="draft" name="Draft" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-slate-500">No invoice data for this range.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by course</CardTitle>
            <p className="text-sm font-normal text-slate-500">Total billed per course</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-16 text-center text-sm text-slate-500">Loading…</p>
            ) : courseRevenue.length ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={courseRevenue} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="courseName"
                      width={110}
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip formatter={(v) => formatRm(Number(v ?? 0))} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="paid" name="Collected" stackId="c" fill="#10b981" />
                    <Bar dataKey="unpaid" name="Outstanding" stackId="c" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-slate-500">No course revenue data.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Enrollment trends</CardTitle>
            <p className="text-sm font-normal text-slate-500">New class enrollments per month</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-16 text-center text-sm text-slate-500">Loading…</p>
            ) : enrollmentsSeries.length ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={enrollmentsSeries} margin={chartMargin}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" name="Enrollments" stroke="#0ea5e9" strokeWidth={2} dot={{ fill: '#0ea5e9', r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-slate-500">No enrollment data for this range.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Attendance export</CardTitle>
            <p className="text-sm font-normal text-slate-500">
              Download {attendance.length} attendance records
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportAttendanceCsv(attendance)}
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportAttendancePdf(attendance)}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Filter on the{' '}
            <a href="/admin/attendance" className="font-medium text-primary-600 hover:text-primary-700">
              Attendance Overview
            </a>{' '}
            page to export a subset.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
