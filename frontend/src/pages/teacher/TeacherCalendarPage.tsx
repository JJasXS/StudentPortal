import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { WeekCalendar, type CalendarEvent } from '@/components/calendar/WeekCalendar';
import { classesApi, classSessionsApi } from '@/api/resources';
import { mockClasses, mockClassSessions } from '@/utils/mockData';
import { loadAllSessions } from '@/utils/mockSessionStore';
import { sessionsInRange } from '@/utils/sessionGeneration';
import { mergeTeacherClasses } from '@/utils/teacherClasses';
import type { ClassSession } from '@/types';

export default function TeacherCalendarPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  const loadData = useCallback(() => {
    if (!user?.id) return;
    Promise.all([
      classesApi.getAll().catch(() => mockClasses),
      isMock
        ? Promise.resolve(loadAllSessions())
        : classSessionsApi.getAll().catch(() => mockClassSessions),
    ]).then(([classList, sessionList]) => {
      const mine = user ? mergeTeacherClasses(classList, user) : [];
      const classIds = new Set(mine.map((c) => c.id));
      setSessions(sessionList.filter((s) => classIds.has(s.classId)));
    });
  }, [user, isMock]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const weekStart = useMemo(() => {
    const day = anchorDate.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(anchorDate);
    start.setDate(start.getDate() + diff);
    return start.toISOString().slice(0, 10);
  }, [anchorDate]);

  const weekEnd = useMemo(() => {
    const end = new Date(`${weekStart}T12:00:00`);
    end.setDate(end.getDate() + 6);
    return end.toISOString().slice(0, 10);
  }, [weekStart]);

  const weekSessions = useMemo(
    () => sessionsInRange(sessions, weekStart, weekEnd),
    [sessions, weekStart, weekEnd]
  );

  const events: CalendarEvent[] = useMemo(
    () =>
      weekSessions.map((session) => ({
        id: session.id,
        session,
        href: `/teacher/classes/${session.classId}/sessions`,
      })),
    [weekSessions]
  );

  return (
    <div>
      <PageHeader
        title="My calendar"
        description="Your teaching schedule — sessions are created automatically from class templates"
      />

      <WeekCalendar
        anchorDate={anchorDate}
        onAnchorChange={setAnchorDate}
        events={events}
        emptyMessage="No sessions scheduled this week for your classes."
      />
    </div>
  );
}
