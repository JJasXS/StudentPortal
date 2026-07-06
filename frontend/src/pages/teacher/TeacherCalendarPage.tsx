import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { CalendarSessionDetailModal } from '@/components/calendar/CalendarSessionDetailModal';
import { MonthCalendar } from '@/components/calendar/MonthCalendar';
import type { CalendarEvent } from '@/components/calendar/WeekCalendar';
import { classesApi, calendarApi, classSessionsApi } from '@/api/resources';
import { mockClasses, mockClassSessions } from '@/utils/mockData';
import { erpEventToCalendarEvent, erpEventsInRange } from '@/utils/erpCalendar';
import { generateMockSessions, loadAllSessions } from '@/utils/mockSessionStore';
import { monthRange, sessionsInRange } from '@/utils/sessionGeneration';
import { mergeTeacherClasses } from '@/utils/teacherClasses';
import type { ClassItem, ClassSession } from '@/types';
import type { ErpCalendarEvent } from '@/types/sqlAccount';

function seedTeacherCalendarSessions(classes: ClassItem[]) {
  const active = classes.filter((c) => c.isActive);
  const now = new Date();

  for (const monthOffset of [-1, 0, 1]) {
    const anchor = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    generateMockSessions(active, from, to);
  }
}

export default function TeacherCalendarPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [erpEvents, setErpEvents] = useState<ErpCalendarEvent[]>([]);
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  const loadData = useCallback(() => {
    if (!user?.id) return;

    classesApi
      .getAll()
      .catch(() => mockClasses)
      .then(async (classList) => {
        const mine = mergeTeacherClasses(classList, user);
        setClasses(mine);
        const classIds = new Set(mine.map((c) => c.id));

        if (isMock) {
          seedTeacherCalendarSessions(mine);
          setSessions(loadAllSessions().filter((s) => classIds.has(s.classId)));
          setErpEvents([]);
          return;
        }

        const [all, erpAll] = await Promise.all([
          classSessionsApi.getAll().catch(() => mockClassSessions),
          calendarApi.getEvents().catch(() => [] as ErpCalendarEvent[]),
        ]);
        setSessions(all.filter((s) => classIds.has(s.classId)));
        const teacherName = user.fullName?.toLowerCase();
        setErpEvents(
          erpAll.filter(
            (e) =>
              (e.teacherUserId && e.teacherUserId === user.id) ||
              (teacherName && e.teacherName?.toLowerCase() === teacherName) ||
              (e.classId && classIds.has(e.classId))
          )
        );
      });
  }, [user, isMock]);

  useEffect(() => {
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

  const monthErpEvents = useMemo(
    () => erpEventsInRange(erpEvents, monthStart, monthEnd),
    [erpEvents, monthStart, monthEnd]
  );

  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);

  const events: CalendarEvent[] = useMemo(() => {
    if (!isMock && erpEvents.length > 0) {
      return monthErpEvents.map((erp) => {
        const event = erpEventToCalendarEvent(erp, classById);
        return {
          ...event,
          teacherName: event.teacherName ?? user?.fullName,
          subtitle: event.studentName ?? event.courseName,
          href: erp.classId ? `/teacher/classes/${erp.classId}/sessions` : event.href,
        };
      });
    }

    return monthSessions.map((session) => {
      const cls = classById.get(session.classId);
      return {
        id: session.id,
        session,
        courseName: cls?.courseName,
        className: cls?.className ?? session.className,
        teacherName: cls?.teacherName ?? user?.fullName,
        location: cls?.location,
        subtitle: cls?.courseName,
        href: `/teacher/classes/${session.classId}/sessions`,
      };
    });
  }, [isMock, erpEvents.length, monthErpEvents, monthSessions, classById, user?.fullName]);

  return (
    <div>
      <PageHeader
        title="My calendar"
        description="Your teaching schedule — sessions are created automatically from class templates"
      />

      <MonthCalendar
        anchorDate={anchorDate}
        onAnchorChange={setAnchorDate}
        events={events}
        onEventClick={setSelectedEvent}
        emptyMessage="No sessions this month for your classes."
      />

      <CalendarSessionDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}
