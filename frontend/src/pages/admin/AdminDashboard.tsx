import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  ClipboardList,
  Banknote,
  UserPlus,
} from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
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

  useEffect(() => {
    setLoading(true);
    const useMockCharts = import.meta.env.VITE_USE_MOCK === 'true';

    Promise.all([
      studentsApi.getAll().catch(() => mockStudents),
      teachersApi.getAll().catch(() => mockTeachers),
      enrollmentsApi.getAll().catch(() => mockEnrollments),
      invoicesApi.getAll().catch(() => mockInvoices),
    ])
      .then(([s, t, e, inv]) => {
        setStudents(useMockCharts || s.length < mockStudents.length ? mockStudents : s);
        setTeachers(t);
        setEnrollments(useMockCharts || e.length < mockEnrollments.length ? mockEnrollments : e);
        const mergedInv = loadAllInvoices();
        setInvoices(useMockCharts || inv.length < mockInvoices.length ? mergedInv : mergedInv);
      })
      .finally(() => setLoading(false));
  }, []);

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
    <div>
      <PageHeader
        title="Admin Dashboard"
        description="Centre overview — students, enrollments, and invoices"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatCard title="Total Students" value={students.length} icon={GraduationCap} />
        <StatCard title="Total Teachers" value={teachers.length} icon={Users} />
        <StatCard
          title="Active Enrollments"
          value={activeEnrollments}
          icon={ClipboardList}
          description={joinedThisMonth > 0 ? `${joinedThisMonth} new this month` : undefined}
        />
        <StatCard
          title="Revenue"
          value={`RM ${invoiceSummary.collectedAmount.toLocaleString('en-MY')}`}
          icon={Banknote}
          description="Collected from paid invoices"
        />
        <StatCard
          title="Students Joined"
          value={studentsJoinedSeries.reduce((sum, p) => sum + p.count, 0)}
          icon={UserPlus}
          description="All time (first enrollment)"
        />
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-500">Loading analytics…</p>
      ) : (
        <AdminDashboardCharts
          invoiceSeries={invoiceSeries}
          studentsJoinedSeries={studentsJoinedSeries}
          enrollmentsSeries={enrollmentsSeries}
        />
      )}

      <p className="mt-4 text-center text-sm text-slate-500">
        <Link to="/admin/reports" className="font-medium text-primary-600 hover:text-primary-700">
          Full reports &amp; exports →
        </Link>
        <span className="mx-2 text-slate-300">·</span>
        <Link to="/admin/invoices" className="font-medium text-primary-600 hover:text-primary-700">
          Manage invoices →
        </Link>
      </p>
    </div>
  );
}
