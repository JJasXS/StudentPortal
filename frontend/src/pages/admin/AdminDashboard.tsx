import { useEffect, useMemo, useState } from 'react';
import {
  GraduationCap,
  Users,
  ClipboardList,
  Banknote,
  UserPlus,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { DashboardNotifyFeed } from '@/components/dashboard/DashboardNotifyFeed';
import { DashboardCentreFooter } from '@/components/dashboard/DashboardCentreFooter';
import { StatCard } from '@/components/StatCard';
import { AdminDashboardCharts } from '@/components/admin/AdminDashboardCharts';
import {
  studentsApi,
  teachersApi,
  enrollmentsApi,
  invoicesApi,
} from '@/api/resources';
import {
  mockStudents,
  mockTeachers,
  mockEnrollments,
  mockInvoices,
} from '@/utils/mockData';
import { loadAllInvoices } from '@/utils/mockInvoiceStore';
import {
  buildEnrollmentMonthlySeries,
  buildInvoiceMonthlySeries,
  buildInvoiceStatusSummary,
  buildStudentsJoinedMonthlySeries,
  countEnrollmentsThisMonth,
} from '@/utils/adminDashboardAnalytics';
import type { Enrollment, Invoice } from '@/types';

export default function AdminDashboard() {
  const [students, setStudents] = useState(mockStudents);
  const [teachers, setTeachers] = useState(mockTeachers);
  const [enrollments, setEnrollments] = useState<Enrollment[]>(mockEnrollments);
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [loading, setLoading] = useState(true);
  const useMockCharts = import.meta.env.VITE_USE_MOCK === 'true';

  useEffect(() => {
    setLoading(true);
    Promise.all([
      studentsApi.getAll().catch(() => (useMockCharts ? mockStudents : [])),
      teachersApi.getAll().catch(() => (useMockCharts ? mockTeachers : [])),
      enrollmentsApi.getAll().catch(() => (useMockCharts ? mockEnrollments : [])),
      invoicesApi.getAll().catch(() => (useMockCharts ? mockInvoices : [])),
    ])
      .then(([s, t, e, inv]) => {
        setStudents(s);
        setTeachers(t);
        setEnrollments(e);
        setInvoices(useMockCharts ? loadAllInvoices() : inv);
      })
      .finally(() => setLoading(false));
  }, [useMockCharts]);

  const activeEnrollments = useMemo(
    () => enrollments.filter((e) => e.status === 'Active').length,
    [enrollments]
  );

  const invoiceSummary = useMemo(() => buildInvoiceStatusSummary(invoices), [invoices]);
  const invoiceSeries = useMemo(() => buildInvoiceMonthlySeries(invoices), [invoices]);
  const studentsJoinedSeries = useMemo(
    () => buildStudentsJoinedMonthlySeries(enrollments),
    [enrollments]
  );
  const enrollmentsSeries = useMemo(
    () => buildEnrollmentMonthlySeries(enrollments),
    [enrollments]
  );
  const joinedThisMonth = useMemo(() => countEnrollmentsThisMonth(enrollments), [enrollments]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Admin Dashboard"
        description="Centre overview"
      />

      <DashboardNotifyFeed role="Admin" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Students" value={students.length} icon={GraduationCap} />
        <StatCard title="Teachers" value={teachers.length} icon={Users} />
        <StatCard
          title="Active enrollments"
          value={activeEnrollments}
          icon={ClipboardList}
          description={joinedThisMonth > 0 ? `${joinedThisMonth} new this month` : undefined}
        />
        <StatCard
          title="Revenue"
          value={`RM ${invoiceSummary.collectedAmount.toLocaleString('en-MY')}`}
          icon={Banknote}
          description="Collected"
        />
        <StatCard
          title="Students joined"
          value={studentsJoinedSeries.reduce((sum, p) => sum + p.count, 0)}
          icon={UserPlus}
        />
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-slate-500">Loading analytics…</p>
      ) : (
        <AdminDashboardCharts
          invoiceSeries={invoiceSeries}
          studentsJoinedSeries={studentsJoinedSeries}
          enrollmentsSeries={enrollmentsSeries}
        />
      )}

      <DashboardCentreFooter />
    </div>
  );
}
