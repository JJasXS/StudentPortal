import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CalendarDays,
  CalendarOff,
  Clock,
  GraduationCap,
  Megaphone,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { DashboardNotifyFeed } from '@/components/dashboard/DashboardNotifyFeed';
import { DashboardCentreFooter } from '@/components/dashboard/DashboardCentreFooter';
import { ParentOutstandingFeesCard } from '@/components/parent/ParentOutstandingFeesCard';
import { ParentEnrolledClassesSection } from '@/components/parent/ParentEnrolledClassesSection';
import { Card, CardContent } from '@/components/ui/Card';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useSqlAccountStudent } from '@/hooks/useSqlAccountStudent';
import { useParentLeaveNotifyToasts } from '@/hooks/useParentLeaveNotifyToasts';
import { studentsApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import type { Announcement } from '@/types';
import type { ErpCalendarEvent, SqlAccountChild, SqlAccountOutstandingInvoice } from '@/types/sqlAccount';

function formatTimeRange(start?: string, end?: string) {
  if (!start) return '';
  return end ? `${start} – ${end}` : start;
}

function nextEventForBranch(events: ErpCalendarEvent[]): ErpCalendarEvent | null {
  const now = new Date();
  const upcoming = events
    .filter((e) => e.status !== 'Cancelled' && new Date(e.sessionDate) >= now)
    .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
  return upcoming[0] ?? null;
}

const QUICK_LINKS = [
  { to: '/student/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/student/courses', label: 'Assignment', icon: GraduationCap },
  { to: '/student/leave', label: 'Leave', icon: CalendarOff },
  { to: '/student/announcements', label: 'Announcements', icon: Megaphone },
] as const;

export default function StudentDashboard() {
  const { user } = useAuth();
  const { student, loading } = useSqlAccountStudent(true);
  const [events, setEvents] = useState<ErpCalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [notifyItems, setNotifyItems] = useState<Announcement[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<SqlAccountOutstandingInvoice[]>([]);

  const handleFeedLoaded = useCallback((items: Announcement[]) => {
    setNotifyItems(items);
  }, []);

  useParentLeaveNotifyToasts(notifyItems, user?.role === 'Student' || user?.role === 'Parent');

  useEffect(() => {
    studentsApi
      .getOutstandingInvoices()
      .then(setOutstandingInvoices)
      .catch(() => setOutstandingInvoices([]));
  }, []);

  useEffect(() => {
    if (!student?.branchName) {
      setEvents([]);
      setEventsLoading(false);
      return;
    }
    setEventsLoading(true);
    studentsApi
      .getMyCalendarEvents(student.branchName)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setEventsLoading(false));
  }, [student?.branchName]);

  const next = useMemo(() => nextEventForBranch(events), [events]);

  const asChildList: SqlAccountChild[] = student
    ? [
        {
          branchName: student.branchName,
          attention: student.studentName,
          email: student.email,
          phone: student.phone,
        },
      ]
    : [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description={user?.fullName ? `Welcome, ${user.fullName}` : 'Welcome'}
      />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/50 hover:text-primary-800"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <Icon className="h-4 w-4" />
            </span>
            {label}
          </Link>
        ))}
      </div>

      <DashboardNotifyFeed
        role="Student"
        onFeedLoaded={handleFeedLoaded}
        autoMarkReadOnView
      />

      <ParentOutstandingFeesCard invoices={outstandingInvoices} />

      {!loading && asChildList.length > 0 && (
        <ParentEnrolledClassesSection students={asChildList} />
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Next class
        </h2>

        {loading || eventsLoading ? (
          <SkeletonCard />
        ) : !student ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
            No SQL Account student linked to your email.
          </p>
        ) : next ? (
          <Card>
            <CardContent className="p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  <BookOpenCheck className="h-3 w-3" />
                  Next class
                </span>
              </div>
              <p className="text-lg font-semibold text-slate-900">{next.className ?? 'Class'}</p>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-primary-500" />
                  {formatDateDDMMYYYY(next.sessionDate)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary-500" />
                  {formatTimeRange(next.startTime, next.endTime)}
                </span>
                {next.teacherName && (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-4 w-4 text-primary-500" />
                    {next.teacherName}
                  </span>
                )}
              </div>
              <Link
                to="/student/schedule"
                className="mt-3 inline-block text-xs font-medium text-primary-600 hover:underline"
              >
                Open schedule
              </Link>
            </CardContent>
          </Card>
        ) : (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
            No upcoming class scheduled.
          </p>
        )}
      </section>

      <DashboardCentreFooter />
    </div>
  );
}
