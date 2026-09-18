import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { CalendarSessionDetailModal } from '@/components/calendar/CalendarSessionDetailModal';
import {
  ClassSessionActionModal,
  type ClassSessionActionMode,
} from '@/components/ClassSessionActionModal';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import type { CalendarEvent } from '@/components/calendar/WeekCalendar';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { classesApi, calendarApi, classSessionsApi, coursesApi, enrollmentsApi, sqlAccountApi, teachersApi } from '@/api/resources';
import { mockClasses, mockCourses, mockTeachers } from '@/utils/mockData';
import { erpEventToCalendarEvent, erpEventsInRange } from '@/utils/erpCalendar';
import { loadMockEnrollments } from '@/utils/mockEnrollmentStore';
import { loadAllSessions, seedAdminCalendarSessions } from '@/utils/mockSessionStore';
import { monthRange, sessionsInRange } from '@/utils/sessionGeneration';
import type { ClassItem, ClassSession, Course, Enrollment } from '@/types';
import type { ErpCalendarEvent, SqlAccountCalendarTeacher } from '@/types/sqlAccount';

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
      : classSessionsApi.getAll().catch(() => [] as ClassSession[]);

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
      : teachersApi.getCalendarFilter().catch(() => [] as SqlAccountCalendarTeacher[]);

    const enrollmentsSource = isMock
      ? Promise.resolve(loadMockEnrollments())
      : enrollmentsApi.getAll().catch(() => [] as Enrollment[]);

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
      isMock ? classesApi.getAll().catch(() => mockClasses) : classesApi.getAll().catch(() => []),
      isMock ? coursesApi.getAll().catch(() => mockCourses) : coursesApi.getAll().catch(() => []),
      teachersSource,
      enrollmentsSource,
      branchesSource,
      sessionsSource,
      erpEventsSource,
    ]).then(([classList, courseList, teacherList, enrollmentList, branchList, sessionList, erpList]) => {
      if (isMock) {
        setClasses(classList.length >= mockClasses.length ? classList : mockClasses);
        setCourses(courseList.length >= mockCourses.length ? courseList : mockCourses);
        setEnrollments(enrollmentList.length ? enrollmentList : loadMockEnrollments());
      } else {
        setClasses(classList);
        setCourses(courseList);
        setEnrollments(enrollmentList);
      }
      setTeachers(teacherList);
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
      setMessage('Session cancelled. Class start date cleared and logged.');
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
    if (!isMock) {
      return teachers
        .map((teacher) => ({
          id: teacher.portalUserId ?? teacher.erpUserId,
          name: teacher.fullName,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const byId = new Map<string, string>();
    for (const cls of classes) {
      if (cls.teacherUserId && cls.teacherName) {
        byId.set(cls.teacherUserId, cls.teacherName);
      }
    }
    for (const teacher of teachers) {
      const id = teacher.portalUserId ?? teacher.erpUserId;
      if (id) byId.set(id, teacher.fullName);
    }
    return [...byId.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [classes, isMock, teachers]);

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
      if (teacherFilter) {
        const matchesTeacherId = event.teacherUserId === teacherFilter;
        const selectedTeacher = teachers.find(
          (t) => (t.portalUserId ?? t.erpUserId) === teacherFilter
        );
        const matchesTeacherName =
          selectedTeacher != null &&
          event.teacherName?.localeCompare(selectedTeacher.fullName, undefined, {
            sensitivity: 'base',
          }) === 0;
        if (!matchesTeacherId && !matchesTeacherName) {
          return false;
        }
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
  }, [events, teacherFilter, studentFilter, classIdsForStudent, studentOptions, teachers]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Monthly class schedule"
        actions={
          <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-end">
            <div className="min-w-0 flex-1 space-y-1 sm:min-w-[12rem] sm:flex-none">
              <label htmlFor="teacherFilter" className="text-sm font-medium text-slate-600">
                Teacher
              </label>
              <Select
                id="teacherFilter"
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className="w-full sm:w-52 md:w-56"
              >
                <option value="">All teachers</option>
                {teacherOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="min-w-0 flex-1 space-y-1 sm:min-w-[12rem] sm:flex-none">
              <label htmlFor="studentFilter" className="text-sm font-medium text-slate-600">
                Student
              </label>
              <Select
                id="studentFilter"
                value={studentFilter}
                onChange={(e) => setStudentFilter(e.target.value)}
                className="w-full sm:w-52 md:w-56"
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
        }
      />

      {message && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}

      <MonthCalendar
        anchorDate={anchorDate}
        onAnchorChange={setAnchorDate}
        events={filteredEvents}
        onEventClick={setSelectedEvent}
        emptyMessage={
          teacherFilter || studentFilter
            ? 'No sessions match the selected filters this month.'
            : 'No sessions this month. Run FdbUdfUpdate or generate sessions to populate the portal schedule.'
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
    </div>
  );
}
