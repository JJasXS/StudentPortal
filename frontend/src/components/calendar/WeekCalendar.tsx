import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { weekDayKeys, weekRange } from '@/utils/sessionGeneration';
import { teacherEventColor } from '@/components/calendar/calendarStyles';
import type { ClassSession } from '@/types';

export interface CalendarEvent {
  id: string;
  session: ClassSession;
  courseName?: string;
  className?: string;
  teacherName?: string;
  teacherUserId?: string;
  location?: string;
  subtitle?: string;
  studentName?: string;
  branchName?: string;
  href?: string;
}

interface WeekCalendarProps {
  anchorDate: Date;
  onAnchorChange: (date: Date) => void;
  events: CalendarEvent[];
  emptyMessage?: string;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeekCalendar({
  anchorDate,
  onAnchorChange,
  events,
  emptyMessage = 'No sessions this week.',
}: WeekCalendarProps) {
  const dayKeys = weekDayKeys(anchorDate);
  const { start, end } = weekRange(anchorDate);

  const eventsByDay = dayKeys.reduce<Record<string, CalendarEvent[]>>((acc, key) => {
    acc[key] = events.filter((e) => e.session.sessionDate.slice(0, 10) === key);
    return acc;
  }, {});

  const shiftWeek = (delta: number) => {
    const next = new Date(anchorDate);
    next.setDate(next.getDate() + delta * 7);
    onAnchorChange(next);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Week view</p>
          <p className="text-xs text-slate-500">
            {formatDateDDMMYYYY(start)} – {formatDateDDMMYYYY(end)}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => shiftWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onAnchorChange(new Date())}>
            Today
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => shiftWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 divide-y divide-slate-200 md:grid-cols-7 md:divide-x md:divide-y-0">
        {dayKeys.map((key, index) => {
          const dayEvents = eventsByDay[key] ?? [];
          const isToday = key === new Date().toISOString().slice(0, 10);
          return (
            <div key={key} className={cn('min-h-[140px] p-3', isToday && 'bg-primary-50/40')}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {DAY_LABELS[index]}
                </span>
                <span className={cn('text-sm font-medium', isToday ? 'text-primary-700' : 'text-slate-700')}>
                  {formatDateDDMMYYYY(key).slice(0, 5)}
                </span>
              </div>
              <div className="space-y-2">
                {dayEvents.length === 0 ? (
                  <p className="text-xs text-slate-400">—</p>
                ) : (
                  dayEvents.map((event) => {
                    const body = (
                      <div
                        className={cn(
                          'rounded-lg border px-2 py-1.5 text-xs',
                          teacherEventColor(event.teacherUserId, event.session.status)
                        )}
                      >
                        <p className="font-semibold">{event.session.className ?? 'Class'}</p>
                        <p>
                          {event.session.startTime}–{event.session.endTime}
                        </p>
                        {event.subtitle && <p className="mt-0.5 opacity-80">{event.subtitle}</p>}
                        {event.session.topic && (
                          <p className="mt-0.5 truncate opacity-80">{event.session.topic}</p>
                        )}
                      </div>
                    );
                    return event.href ? (
                      <Link key={event.id} to={event.href} className="block hover:opacity-90">
                        {body}
                      </Link>
                    ) : (
                      <div key={event.id}>{body}</div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {events.length === 0 && (
        <p className="border-t border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      )}
    </div>
  );
}
