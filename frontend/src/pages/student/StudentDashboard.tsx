import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  Clock,
  MessageSquareText,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { DashboardNotifyFeed } from '@/components/dashboard/DashboardNotifyFeed';
import { DashboardCentreFooter } from '@/components/dashboard/DashboardCentreFooter';
import { TeacherFeedbackCard } from '@/components/student/TeacherFeedbackCard';
import { StudentFeesSection } from '@/components/student/StudentFeesSection';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useSqlAccountStudent } from '@/hooks/useSqlAccountStudent';
import { useSqlAccountChildEnrollments } from '@/hooks/useSqlAccountChildEnrollments';
import { useParentLeaveNotifyToasts } from '@/hooks/useParentLeaveNotifyToasts';
import {
  assignmentsApi,
  homeworkApi,
  lessonNotesApi,
  studentsApi,
} from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { dueLabel, enrollmentClassKey, isAssignmentAssigned } from '@/utils/studentLearning';
import type { Announcement, LessonNote } from '@/types';
import type { ErpCalendarEvent } from '@/types/sqlAccount';
import type { PortalAssignment, PortalHomework } from '@/types/portal';

function formatTimeRange(start?: string, end?: string) {
  if (!start) return '';
  return end ? `${start} – ${end}` : start;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function nextEventForBranch(events: ErpCalendarEvent[]): ErpCalendarEvent | null {
  const now = new Date();
  const upcoming = events
    .filter((e) => e.status !== 'Cancelled' && new Date(e.sessionDate) >= now)
    .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
  return upcoming[0] ?? null;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const { student, loading } = useSqlAccountStudent(true);
  const { enrollments } = useSqlAccountChildEnrollments(
    student?.branchName ?? null,
    Boolean(student?.branchName)
  );
  const [events, setEvents] = useState<ErpCalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [assignments, setAssignments] = useState<PortalAssignment[]>([]);
  const [submissions, setSubmissions] = useState<PortalHomework[]>([]);
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [workLoading, setWorkLoading] = useState(false);
  const [notifyItems, setNotifyItems] = useState<Announcement[]>([]);

  const handleFeedLoaded = useCallback((items: Announcement[]) => {
    setNotifyItems(items);
  }, []);

  useParentLeaveNotifyToasts(notifyItems, user?.role === 'Student' || user?.role === 'Parent');

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

  useEffect(() => {
    if (!student?.branchName) {
      setAssignments([]);
      setSubmissions([]);
      setNotes([]);
      return;
    }
    setWorkLoading(true);
    Promise.all([
      assignmentsApi.getMine(student.branchName),
      homeworkApi.getMine(student.branchName),
      lessonNotesApi.getForBranch(student.branchName).catch(() => []),
    ])
      .then(([asg, hw, lessonNotes]) => {
        setAssignments(asg);
        setSubmissions(hw);
        setNotes(lessonNotes);
      })
      .catch(() => {
        setAssignments([]);
        setSubmissions([]);
        setNotes([]);
      })
      .finally(() => setWorkLoading(false));
  }, [student?.branchName]);

  const next = useMemo(() => nextEventForBranch(events), [events]);

  const todayCount = useMemo(() => {
    const today = new Date();
    return events.filter(
      (e) => e.status !== 'Cancelled' && isSameDay(new Date(e.sessionDate), today)
    ).length;
  }, [events]);

  const submissionByAssignment = useMemo(() => {
    const map = new Map<string, PortalHomework>();
    for (const row of submissions) {
      if (row.assignmentId) map.set(row.assignmentId, row);
    }
    return map;
  }, [submissions]);

  const todoAssignments = useMemo(
    () =>
      assignments
        .filter((a) => isAssignmentAssigned(a, submissionByAssignment.get(a.id)))
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [assignments, submissionByAssignment]
  );

  const dueThisWeek = useMemo(() => {
    const now = new Date();
    const week = new Date(now);
    week.setDate(week.getDate() + 7);
    return todoAssignments.filter((a) => {
      const d = new Date(a.dueDate);
      return d >= now && d <= week;
    }).length;
  }, [todoAssignments]);

  const recentFeedback = useMemo(() => {
    const yearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
    return [...notes]
      .filter((n) => new Date(n.createdAt).getTime() >= yearAgo)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [notes]);

  const openClassPath = useMemo(() => {
    if (!next) return '/student/courses';
    const match = enrollments.find(
      (e) =>
        e.className.toLowerCase() === next.className.toLowerCase() ||
        (e.linkedClassName &&
          e.linkedClassName.toLowerCase() === next.className.toLowerCase()) ||
        (next.itemCode && e.itemCode && e.itemCode === next.itemCode)
    );
    return match
      ? `/student/classes/${encodeURIComponent(enrollmentClassKey(match))}`
      : '/student/courses';
  }, [next, enrollments]);

  const summary = [
    { label: "Today's Classes", value: String(todayCount), hint: 'scheduled today' },
    {
      label: 'To Do',
      value: String(todoAssignments.length),
      hint: todoAssignments.length === 1 ? 'assignment' : 'assignments',
    },
    { label: 'Due This Week', value: String(dueThisWeek), hint: 'coming up' },
    {
      label: 'Teacher Feedback',
      value: String(recentFeedback.length),
      hint: recentFeedback.length ? 'recent' : 'none yet',
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description={user?.fullName ? `Welcome, ${user.fullName}` : 'Welcome'}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {summary.map((card) => (
          <Card key={card.label} className="p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
            <p className="mt-0.5 text-xs text-slate-500">{card.hint}</p>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Next class
        </h2>
        {loading || eventsLoading ? (
          <SkeletonCard />
        ) : !student ? (
          <EmptyState
            icon={BookOpenCheck}
            title="No student linked"
            description="Sign in with a customer email linked in SQL Account."
            compact
          />
        ) : next ? (
          <Card>
            <CardContent className="p-4 pt-4 sm:p-5 sm:pt-5">
              <p className="text-lg font-semibold text-slate-900">{next.className ?? 'Class'}</p>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600">
                {next.teacherName && (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-4 w-4 text-primary-500" />
                    {next.teacherName}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-primary-500" />
                  {formatDateDDMMYYYY(next.sessionDate)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary-500" />
                  {formatTimeRange(next.startTime, next.endTime)}
                </span>
              </div>
              <Link
                to={openClassPath}
                className="mt-4 inline-flex rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Open class
              </Link>
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={CalendarDays}
            title="No upcoming class"
            description="Nothing is scheduled right now."
            compact
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">To do</h2>
          <Link to="/student/todo" className="text-sm font-medium text-primary-600 hover:underline">
            View all
          </Link>
        </div>
        {workLoading ? (
          <SkeletonCard />
        ) : todoAssignments.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="You're all caught up!"
            description="No assignments are waiting for submission."
            compact
          />
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {todoAssignments.slice(0, 4).map((a) => (
              <li
                key={a.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{a.title}</p>
                  <p className="text-sm text-slate-500">{a.className}</p>
                  <p className="text-xs text-slate-500">{dueLabel(a.dueDate)}</p>
                </div>
                <Link
                  to={`/student/assignments/${encodeURIComponent(a.id)}`}
                  className="shrink-0 rounded-lg bg-primary-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-primary-700"
                >
                  View work
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Recent announcements
        </h2>
        <DashboardNotifyFeed
          role="Student"
          onFeedLoaded={handleFeedLoaded}
          autoMarkReadOnView
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Recent feedback
        </h2>
        {recentFeedback.length === 0 ? (
          <EmptyState
            icon={MessageSquareText}
            title="No teacher feedback yet"
            description="Feedback will appear after your teacher reviews your work."
            compact
          />
        ) : (
          <div className="space-y-2">
            {recentFeedback.map((n) => (
              <TeacherFeedbackCard key={n.id} note={n} compact />
            ))}
          </div>
        )}
      </section>

      <StudentFeesSection />
      <DashboardCentreFooter />
    </div>
  );
}
