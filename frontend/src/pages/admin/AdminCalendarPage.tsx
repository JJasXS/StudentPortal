import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { WeekCalendar, type CalendarEvent } from '@/components/calendar/WeekCalendar';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { classesApi, classSessionsApi } from '@/api/resources';
import { mockClasses, mockClassSessions } from '@/utils/mockData';
import { generateMockSessions, loadAllSessions } from '@/utils/mockSessionStore';
import { sessionsInRange } from '@/utils/sessionGeneration';
import type { ClassItem, ClassSession } from '@/types';

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export default function AdminCalendarPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  const loadData = useCallback(() => {
    Promise.all([
      classesApi.getAll().catch(() => mockClasses),
      isMock
        ? Promise.resolve(loadAllSessions())
        : classSessionsApi.getAll().catch(() => mockClassSessions),
    ]).then(([classList, sessionList]) => {
      setClasses(classList.length >= mockClasses.length ? classList : mockClasses);
      setSessions(sessionList);
    });
  }, [isMock]);

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

  const weekEnd = useMemo(() => addDays(new Date(`${weekStart}T12:00:00`), 6), [weekStart]);

  const weekSessions = useMemo(
    () => sessionsInRange(sessions, weekStart, weekEnd),
    [sessions, weekStart, weekEnd]
  );

  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);

  const events: CalendarEvent[] = useMemo(
    () =>
      weekSessions.map((session) => {
        const cls = classById.get(session.classId);
        return {
          id: session.id,
          session,
          subtitle: cls?.teacherName,
          href: cls
            ? `/admin/courses/${cls.courseId}/classes/${cls.id}?tab=sessions`
            : undefined,
        };
      }),
    [weekSessions, classById]
  );

  const handleGenerate = async (weeks: number) => {
    setGenerating(true);
    setMessage('');
    const from = new Date().toISOString().slice(0, 10);
    const to = addDays(new Date(), weeks * 7);

    try {
      if (isMock) {
        const result = generateMockSessions(classes, from, to);
        setSessions(result.sessions);
        setMessage(`Generated ${result.createdCount} sessions (${result.skippedCount} skipped — already exist or holidays).`);
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
    <div>
      <PageHeader
        title="Class calendar"
        description="Weekly schedule with auto-generated sessions from class templates"
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
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Active classes</p>
            <p className="text-2xl font-bold text-slate-900">{classes.filter((c) => c.isActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">This week</p>
            <p className="text-2xl font-bold text-slate-900">{weekSessions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Upcoming sessions</p>
            <p className="text-2xl font-bold text-slate-900">{upcomingCount}</p>
          </CardContent>
        </Card>
      </div>

      <WeekCalendar
        anchorDate={anchorDate}
        onAnchorChange={setAnchorDate}
        events={events}
        emptyMessage="No sessions this week. Generate sessions from class weekly schedules."
      />
    </div>
  );
}
