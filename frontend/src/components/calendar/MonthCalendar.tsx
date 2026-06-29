import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CalendarEventChip } from '@/components/calendar/CalendarSessionDetailModal';
import { cn } from '@/utils/cn';
import { monthGridDays, monthRange } from '@/utils/sessionGeneration';
import type { CalendarEvent } from '@/components/calendar/WeekCalendar';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface MonthCalendarProps {
  anchorDate: Date;
  onAnchorChange: (date: Date) => void;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  emptyMessage?: string;
  maxEventsPerDay?: number;
}

export function MonthCalendar({
  anchorDate,
  onAnchorChange,
  events,
  onEventClick,
  emptyMessage = 'No sessions this month.',
  maxEventsPerDay = 2,
}: MonthCalendarProps) {
  const { label } = monthRange(anchorDate);
  const cells = monthGridDays(anchorDate);
  const todayKey = new Date().toISOString().slice(0, 10);

  const eventsByDay = cells.reduce<Record<string, CalendarEvent[]>>((acc, cell) => {
    acc[cell.dateKey] = events.filter((e) => e.session.sessionDate.slice(0, 10) === cell.dateKey);
    return acc;
  }, {});

  const shiftMonth = (delta: number) => {
    const next = new Date(anchorDate);
    next.setMonth(next.getMonth() + delta);
    onAnchorChange(next);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Month view</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => shiftMonth(-1)} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onAnchorChange(new Date())}>
            Today
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => shiftMonth(1)} aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
        {DAY_LABELS.map((d) => (
          <div key={d} className="px-1 py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const dayEvents = eventsByDay[cell.dateKey] ?? [];
          const isToday = cell.dateKey === todayKey;
          const visible = dayEvents.slice(0, maxEventsPerDay);
          const overflow = dayEvents.length - visible.length;

          return (
            <div
              key={cell.dateKey}
              className={cn(
                'min-h-[8.5rem] border-b border-r border-slate-100 p-1.5 last:border-r-0',
                !cell.inMonth && 'bg-slate-50/80',
                isToday && cell.inMonth && 'bg-primary-50/30'
              )}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={cn(
                    'inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs font-medium',
                    isToday && cell.inMonth
                      ? 'bg-primary-600 text-white'
                      : cell.inMonth
                        ? 'text-slate-700'
                        : 'text-slate-300'
                  )}
                >
                  {cell.day}
                </span>
              </div>
              <div className="space-y-0.5">
                {visible.map((event) => (
                  <CalendarEventChip
                    key={event.id}
                    event={event}
                    onClick={onEventClick ? () => onEventClick(event) : undefined}
                  />
                ))}
                {overflow > 0 && (
                  <p className="px-0.5 text-[10px] font-medium text-slate-500">+{overflow} more</p>
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
