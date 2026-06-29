import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, GraduationCap, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { CalendarSessionDetailModal } from '@/components/calendar/CalendarSessionDetailModal';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import type { CalendarEvent } from '@/components/calendar/WeekCalendar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { classesApi, classSessionsApi, coursesApi } from '@/api/resources';
import { mockClasses, mockCourses } from '@/utils/mockData';
import { generateMockSessions, loadAllSessions, seedAdminCalendarSessions } from '@/utils/mockSessionStore';
import { monthRange, sessionsInRange } from '@/utils/sessionGeneration';
import type { ClassItem, ClassSession, Course } from '@/types';

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export default function AdminCalendarPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  const loadData = useCallback(() => {
    Promise.all([
      classesApi.getAll().catch(() => mockClasses),
      coursesApi.getAll().catch(() => mockCourses),
    ]).then(([classList, courseList]) => {
      setClasses(classList.length >= mockClasses.length ? classList : mockClasses);
      setCourses(courseList.length >= mockCourses.length ? courseList : mockCourses);
      setSessions(loadAllSessions());
    });
  }, []);

  useEffect(() => {
    seedAdminCalendarSessions(mockClasses);
    loadData();
  }, [loadData]);

  const { start: monthStart, end: monthEnd } = useMemo(
    () => monthRange(anchorDate),
    [anchorDate]
  );

  const monthSessions = useMemo(
    () => sessionsInRange(sessions, monthStart, monthEnd),
    [sessions, monthStart, monthEnd]
  );

  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const events: CalendarEvent[] = useMemo(
    () =>
      monthSessions.map((session) => {
        const cls = classById.get(session.classId);
        const course = cls ? courseById.get(cls.courseId) : undefined;
        return {
          id: session.id,
          session,
          courseName: cls?.courseName ?? course?.courseName,
          className: cls?.className ?? session.className,
          teacherName: cls?.teacherName,
          location: cls?.location,
          subtitle: cls?.teacherName,
          href: cls
            ? `/admin/courses/${cls.courseId}/classes/${cls.id}?tab=sessions`
            : undefined,
        };
      }),
    [monthSessions, classById, courseById]
  );

  const courseSummaries = useMemo(() => {
    return courses
      .map((course) => {
        const courseClasses = classes.filter((c) => c.courseId === course.id);
        const activeClasses = courseClasses.filter((c) => c.isActive);
        const monthClassIds = new Set(courseClasses.map((c) => c.id));
        const sessionsThisMonth = monthSessions.filter((s) => monthClassIds.has(s.classId)).length;
        return {
          course,
          classCount: activeClasses.length,
          sessionsThisMonth,
        };
      })
      .sort((a, b) => a.course.courseName.localeCompare(b.course.courseName));
  }, [courses, classes, monthSessions]);

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
      }
    } catch {
      setMessage('Could not generate sessions — try again or use mock mode.');
    } finally {
      setGenerating(false);
    }
  };

  const upcomingCount = sessions.filter((s) => s.status === 'Scheduled').length;

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
            <p className="text-2xl font-bold text-slate-900">{monthSessions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Upcoming sessions</p>
            <p className="text-2xl font-bold text-slate-900">{upcomingCount}</p>
          </CardContent>
        </Card>
      </div>

      <MonthCalendar
        anchorDate={anchorDate}
        onAnchorChange={setAnchorDate}
        events={events}
        onEventClick={setSelectedEvent}
        emptyMessage="No sessions this month. Generate sessions from class weekly schedules."
      />

      <CalendarSessionDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />

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
