import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  CalendarEventChip,
} from '@/components/calendar/CalendarSessionDetailModal';
import { cn } from '@/utils/cn';
import { monthGridDays, monthRange } from '@/utils/sessionGeneration';
import type { CalendarEvent } from '@/components/calendar/WeekCalendar';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDayLabel(dateKey: string) {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

interface DaySelection {
  dateKey: string;
  events: CalendarEvent[];
}

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
  const [selectedDay, setSelectedDay] = useState<DaySelection | null>(null);

  const eventsByDay = cells.reduce<Record<string, CalendarEvent[]>>((acc, cell) => {
    acc[cell.dateKey] = events.filter((e) => e.session.sessionDate.slice(0, 10) === cell.dateKey);
    return acc;
  }, {});

  const shiftMonth = (delta: number) => {
    const next = new Date(anchorDate);
    next.setMonth(next.getMonth() + delta);
    onAnchorChange(next);
  };

  const openDay = (dateKey: string, dayEvents: CalendarEvent[]) => {
    if (dayEvents.length === 0) return;
    setSelectedDay({ dateKey, events: dayEvents });
  };

  const handleEventPick = (event: CalendarEvent) => {
    setSelectedDay(null);
    onEventClick?.(event);
  };

  return (
    <>
      <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-3 sm:gap-3 sm:px-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Month view</p>
            <p className="truncate text-xs text-slate-500">{label}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => shiftMonth(-1)} aria-label="Previous month" className="h-10 w-10 p-0 sm:h-8 sm:w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onAnchorChange(new Date())}>
              Today
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => shiftMonth(1)} aria-label="Next month" className="h-10 w-10 p-0 sm:h-8 sm:w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
          {DAY_LABELS.map((d) => (
            <div key={d} className="px-0.5 py-1.5 sm:px-1 sm:py-2">
              <span className="sm:hidden">{d.charAt(0)}</span>
              <span className="hidden sm:inline">{d}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((cell) => {
            const dayEvents = eventsByDay[cell.dateKey] ?? [];
            const isToday = cell.dateKey === todayKey;
            const visible = dayEvents.slice(0, maxEventsPerDay);
            const overflow = dayEvents.length - visible.length;
            const hasEvents = dayEvents.length > 0;

            return (
              <div
                key={cell.dateKey}
                role={hasEvents ? 'button' : undefined}
                tabIndex={hasEvents ? 0 : undefined}
                onClick={() => openDay(cell.dateKey, dayEvents)}
                onKeyDown={(e) => {
                  if (hasEvents && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    openDay(cell.dateKey, dayEvents);
                  }
                }}
                className={cn(
                  'min-h-[3.25rem] border-b border-r border-slate-100 p-1 last:border-r-0 sm:min-h-[6.5rem] sm:p-1.5 md:min-h-[8.5rem]',
                  !cell.inMonth && 'bg-slate-50/80',
                  isToday && cell.inMonth && 'bg-primary-50/30',
                  hasEvents && 'cursor-pointer transition hover:bg-slate-50/90'
                )}
              >
                <div className="mb-0.5 flex items-center justify-between gap-0.5 sm:mb-1 sm:justify-end">
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
                  {hasEvents && (
                    <span className="inline-flex items-center gap-0.5 sm:hidden">
                      {dayEvents.slice(0, 3).map((event) => (
                        <span
                          key={event.id}
                          className="h-1.5 w-1.5 rounded-full bg-primary-500"
                          aria-hidden
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[9px] font-semibold text-primary-600">
                          +{dayEvents.length - 3}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className="hidden space-y-0.5 sm:block">
                  {visible.map((event) => (
                    <div key={event.id} onClick={(e) => e.stopPropagation()} className="min-w-0">
                      <CalendarEventChip
                        event={event}
                        onClick={onEventClick ? () => onEventClick(event) : undefined}
                      />
                    </div>
                  ))}
                  {overflow > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDay(cell.dateKey, dayEvents);
                      }}
                      className="w-full px-0.5 text-left text-[10px] font-semibold text-primary-600 hover:underline"
                    >
                      +{overflow} more
                    </button>
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

      <Modal
        open={Boolean(selectedDay)}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? formatDayLabel(selectedDay.dateKey) : 'Sessions'}
        className="max-w-3xl"
      >
        {selectedDay && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">
              {selectedDay.events.length} class{selectedDay.events.length === 1 ? '' : 'es'} this day
            </p>
            <ul className="max-h-[min(24rem,50dvh)] space-y-2 overflow-y-auto">
              {selectedDay.events.map((event) => (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => handleEventPick(event)}
                    className="block w-full text-left"
                  >
                    <CalendarEventChip event={event} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </>
  );
}
