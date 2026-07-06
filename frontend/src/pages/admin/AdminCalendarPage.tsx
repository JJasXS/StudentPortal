import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, GraduationCap, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { CalendarSessionDetailModal } from '@/components/calendar/CalendarSessionDetailModal';
import {
  ClassSessionActionModal,
  type ClassSessionActionMode,
} from '@/components/ClassSessionActionModal';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import type { CalendarEvent } from '@/components/calendar/WeekCalendar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { classesApi, calendarApi, classSessionsApi, coursesApi, enrollmentsApi, sqlAccountApi, teachersApi } from '@/api/resources';
import { mockClasses, mockClassSessions, mockCourses, mockEnrollments, mockTeachers } from '@/utils/mockData';
import { erpEventToCalendarEvent, erpEventsInRange } from '@/utils/erpCalendar';
import { loadMockEnrollments } from '@/utils/mockEnrollmentStore';
import { generateMockSessions, loadAllSessions, seedAdminCalendarSessions } from '@/utils/mockSessionStore';
import { monthRange, sessionsInRange } from '@/utils/sessionGeneration';
import type { ClassItem, ClassSession, Course, Enrollment } from '@/types';
import type { ErpCalendarEvent, SqlAccountCalendarTeacher } from '@/types/sqlAccount';

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export default function AdminCalendarPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<SqlAccountCalendarTeacher[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [erpBranches, setErpBranches] = useState<string[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [erpEvents, setErpEvents] = useState<ErpCalendarEvent[]>([]);
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CalendarEvent | null>(null);
  const [cancelSaving, setCancelSaving] = useState(false);
  const [teacherFilter, setTeacherFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  const loadData = useCallback(() => {
    const sessionsSource = isMock
      ? Promise.resolve(loadAllSessions())
      : classSessionsApi.getAll().catch(() => mockClassSessions);

    const erpEventsSource = isMock
      ? Promise.resolve([] as ErpCalendarEvent[])
      : calendarApi.getEvents().catch(() => [] as ErpCalendarEvent[]);

    const teachersSource = isMock
      ? Promise.resolve(
          mockTeachers.map((t) => ({
            erpUserId: t.id,
            fullName: t.fullName,
            email: t.email,
            portalUserId: t.userId,
          }))
        )
      : teachersApi.getCalendarFilter().catch(() => []);

    const enrollmentsSource = isMock
      ? Promise.resolve(loadMockEnrollments())
      : enrollmentsApi.getAll().catch(() => mockEnrollments);

    const branchesSource = isMock
      ? Promise.resolve([] as string[])
      : sqlAccountApi
          .getParentChildren()
          .then((parents) => [
            ...new Set(
              parents.flatMap((p) =>
                p.children.map((c) => c.branchName?.trim()).filter((b): b is string => Boolean(b))
              )
            ),
          ])
          .catch(() => [] as string[]);

    Promise.all([
      classesApi.getAll().catch(() => mockClasses),
      coursesApi.getAll().catch(() => mockCourses),
      teachersSource,
      enrollmentsSource,
      branchesSource,
      sessionsSource,
      erpEventsSource,
    ]).then(([classList, courseList, teacherList, enrollmentList, branchList, sessionList, erpList]) => {
      setClasses(classList.length >= mockClasses.length ? classList : mockClasses);
      setCourses(courseList.length >= mockCourses.length ? courseList : mockCourses);
      setTeachers(teacherList);
      setEnrollments(enrollmentList.length ? enrollmentList : isMock ? loadMockEnrollments() : mockEnrollments);
      setErpBranches(branchList);
      setSessions(sessionList);
      setErpEvents(erpList);
    });
  }, [isMock]);

  useEffect(() => {
    if (isMock) seedAdminCalendarSessions(mockClasses);
    loadData();
  }, [loadData, isMock]);

  useEffect(() => {
    const navMessage = (location.state as { message?: string } | null)?.message;
    if (navMessage) {
      setMessage(navMessage);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const handleReplaceEvent = (event: CalendarEvent) => {
    navigate(`/admin/calendar/events/${encodeURIComponent(event.id)}/edit`, { state: { event } });
  };

  const handleCancelEvent = (event: CalendarEvent) => {
    setCancelTarget(event);
  };

  const handleCancelConfirm = async (payload: { reason: string }) => {
    if (!cancelTarget) return;
    setCancelSaving(true);
    setMessage('');
    try {
      await calendarApi.cancelEvent(cancelTarget.id, { reason: payload.reason });
      setMessage('Session cancelled. UDF_CLASSDATE cleared and logged.');
      setCancelTarget(null);
      loadData();
    } catch {
      setMessage('Could not cancel session.');
    } finally {
      setCancelSaving(false);
    }
  };

  const cancelModalMode: ClassSessionActionMode = 'cancel';

  const { start: monthStart, end: monthEnd } = useMemo(
    () => monthRange(anchorDate),
    [anchorDate]
  );

  const monthSessions = useMemo(
    () => sessionsInRange(sessions, monthStart, monthEnd),
    [sessions, monthStart, monthEnd]
  );

  const monthErpEvents = useMemo(
    () => erpEventsInRange(erpEvents, monthStart, monthEnd),
    [erpEvents, monthStart, monthEnd]
  );

  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const events: CalendarEvent[] = useMemo(() => {
    if (!isMock && erpEvents.length > 0) {
      return monthErpEvents.map((erp) => erpEventToCalendarEvent(erp, classById));
    }

    return monthSessions.map((session) => {
      const cls = classById.get(session.classId);
      const course = cls ? courseById.get(cls.courseId) : undefined;
      return {
        id: session.id,
        session,
        courseName: cls?.courseName ?? course?.courseName,
        className: cls?.className ?? session.className,
        teacherName: cls?.teacherName,
        teacherUserId: cls?.teacherUserId,
        location: cls?.location,
        subtitle: cls?.teacherName,
        href: cls
          ? `/admin/courses/${cls.courseId}/classes/${cls.id}?tab=sessions`
          : undefined,
      };
    });
  }, [isMock, erpEvents.length, monthErpEvents, monthSessions, classById, courseById]);

  const teacherOptions = useMemo(() => {
    const byId = new Map<string, string>();
    for (const cls of classes) {
      if (cls.teacherUserId && cls.teacherName) {
        byId.set(cls.teacherUserId, cls.teacherName);
      }
    }
    for (const teacher of teachers) {
      if (teacher.portalUserId) {
        byId.set(teacher.portalUserId, teacher.fullName);
      }
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classes, teachers]);

  const studentOptions = useMemo(() => {
    const branches = new Set<string>();
    for (const branch of erpBranches) {
      if (branch.trim()) branches.add(branch.trim());
    }
    for (const event of erpEvents) {
      if (event.branchName?.trim()) branches.add(event.branchName.trim());
    }

    if (branches.size > 0) {
      return [...branches]
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
        .map((branch) => ({ id: branch, name: branch }));
    }

    // Mock / fallback: portal enrollments
    const byId = new Map<string, string>();
    for (const enrollment of enrollments) {
      if (enrollment.status === 'Active' && enrollment.studentUserId) {
        byId.set(enrollment.studentUserId, enrollment.studentName ?? 'Student');
      }
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [erpBranches, erpEvents, enrollments]);

  const classIdsForStudent = useMemo(() => {
    if (!studentFilter || erpBranches.length > 0 || erpEvents.some((e) => e.branchName)) {
      return null;
    }
    return new Set(
      enrollments
        .filter((e) => e.studentUserId === studentFilter && e.status === 'Active')
        .map((e) => e.classId)
    );
  }, [enrollments, studentFilter, erpBranches, erpEvents]);

  const filteredEvents = useMemo(() => {
    const filteredBranch = studentFilter.trim().toLowerCase();
    const filteredStudentName = studentFilter
      ? studentOptions.find((s) => s.id === studentFilter)?.name?.toLowerCase()
      : null;

    return events.filter((event) => {
      if (teacherFilter && event.teacherUserId !== teacherFilter) {
        return false;
      }
      if (studentFilter) {
        if (event.branchName) {
          if (event.branchName.trim().toLowerCase() !== filteredBranch) {
            return false;
          }
        } else {
          const byClass =
            Boolean(event.session.classId) && classIdsForStudent?.has(event.session.classId);
          const byName =
            filteredStudentName != null &&
            event.studentName?.toLowerCase() === filteredStudentName;
          if (!byClass && !byName) {
            return false;
          }
        }
      }
      return true;
    });
  }, [events, teacherFilter, studentFilter, classIdsForStudent, studentOptions]);

  const courseSummaries = useMemo(() => {
    return courses
      .map((course) => {
        const courseClasses = classes.filter((c) => c.courseId === course.id);
        const activeClasses = courseClasses.filter((c) => c.isActive);
        const monthClassIds = new Set(courseClasses.map((c) => c.id));
        const sessionsThisMonth = isMock
          ? monthSessions.filter((s) => monthClassIds.has(s.classId)).length
          : monthErpEvents.filter((e) => e.classId && monthClassIds.has(e.classId)).length;
        return {
          course,
          classCount: activeClasses.length,
          sessionsThisMonth,
        };
      })
      .sort((a, b) => a.course.courseName.localeCompare(b.course.courseName));
  }, [courses, classes, monthSessions, monthErpEvents, isMock]);

  const displayMonthCount = isMock ? monthSessions.length : monthErpEvents.length;
  const upcomingCount = isMock
    ? sessions.filter((s) => s.status === 'Scheduled').length
    : erpEvents.filter((e) => e.status === 'Scheduled').length;

  const handleGenerate = async (weeks: number) => {
    setGenerating(true);
    setMessage('');
    const from = new Date().toISOString().slice(0, 10);
    const to = addDays(new Date(), weeks * 7);

    try {
      if (isMock) {
        const result = generateMockSessions(classes, from, to);
        setSessions(result.sessions);
        setMessage(
          `Generated ${result.createdCount} sessions (${result.skippedCount} skipped — already exist or holidays).`
        );
      } else {
        const result = await classSessionsApi.generate({ fromDate: from, toDate: to });
        setSessions((prev) => {
          const byId = new Map(prev.map((s) => [s.id, s]));
          for (const s of result.sessions) byId.set(s.id, s);
          return [...byId.values()];
        });
        setMessage(`Generated ${result.createdCount} sessions (${result.skippedCount} skipped).`);
        loadData();
      }
    } catch {
      setMessage('Could not generate sessions — try again or use mock mode.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar & Courses"
        description="Monthly class schedule and course management in one place"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={generating} onClick={() => handleGenerate(4)}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Generate 4 weeks
            </Button>
            <Button type="button" disabled={generating} onClick={() => handleGenerate(8)}>
              <CalendarDays className="mr-1.5 h-4 w-4" />
              Generate 8 weeks
            </Button>
          </div>
        }
      />

      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Active classes</p>
            <p className="text-2xl font-bold text-slate-900">{classes.filter((c) => c.isActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">This month</p>
            <p className="text-2xl font-bold text-slate-900">{displayMonthCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Upcoming sessions</p>
            <p className="text-2xl font-bold text-slate-900">{upcomingCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1">
          <label htmlFor="teacherFilter" className="text-sm font-medium text-slate-600">
            Teacher
          </label>
          <Select
            id="teacherFilter"
            value={teacherFilter}
            onChange={(e) => setTeacherFilter(e.target.value)}
            className="w-64"
          >
            <option value="">All teachers</option>
            {teacherOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1">
          <label htmlFor="studentFilter" className="text-sm font-medium text-slate-600">
            Student
          </label>
          <Select
            id="studentFilter"
            value={studentFilter}
            onChange={(e) => setStudentFilter(e.target.value)}
            className="w-64"
          >
            <option value="">All students</option>
            {studentOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        {(teacherFilter || studentFilter) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setTeacherFilter('');
              setStudentFilter('');
            }}
          >
            Clear filters
          </Button>
        )}

      </div>

      <MonthCalendar
        anchorDate={anchorDate}
        onAnchorChange={setAnchorDate}
        events={filteredEvents}
        onEventClick={setSelectedEvent}
        emptyMessage={
          teacherFilter || studentFilter
            ? 'No sessions match the selected filters this month.'
            : 'No sessions this month. Run FdbUdfUpdate or generate sessions to populate UDF_CLASSDATE.'
        }
      />

      <CalendarSessionDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onReplace={!isMock && erpEvents.length > 0 ? handleReplaceEvent : undefined}
        onCancel={!isMock && erpEvents.length > 0 ? handleCancelEvent : undefined}
      />

      <ClassSessionActionModal
        open={Boolean(cancelTarget)}
        mode={cancelModalMode}
        session={cancelTarget?.session ?? null}
        saving={cancelSaving}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-slate-500" />
            <CardTitle className="text-base">Courses</CardTitle>
          </div>
          <p className="text-sm text-slate-500">{courses.length} total</p>
        </CardHeader>
        <CardContent className="divide-y divide-slate-100 p-0 pt-0">
          {courseSummaries.map(({ course, classCount, sessionsThisMonth }) => (
            <Link
              key={course.id}
              to={`/admin/courses/${course.id}`}
              className="flex items-center justify-between gap-3 px-6 py-3.5 transition hover:bg-slate-50"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-900">{course.courseName}</p>
                  <StatusBadge status={course.isActive ? 'Active' : 'Inactive'} />
                </div>
                <p className="text-sm text-slate-500">
                  {course.category} · {course.level} · {classCount} class{classCount === 1 ? '' : 'es'}
                  {sessionsThisMonth > 0 && ` · ${sessionsThisMonth} sessions this month`}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
