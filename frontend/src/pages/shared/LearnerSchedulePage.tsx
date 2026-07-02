import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { ScheduleLessonCard } from '@/components/schedule/ScheduleLessonCard';
import { Button } from '@/components/ui/Button';
import { useLearnerContext } from '@/hooks/useLearnerContext';
import { cn } from '@/utils/cn';
import { mockClasses, mockEnrollments } from '@/utils/mockData';
import { generateMockSessions, loadAllSessions } from '@/utils/mockSessionStore';
import {
  resolveMockStudentUserId,
  sessionToScheduleItem,
} from '@/utils/learnerSchedule';
import type { ScheduleLessonItem } from '@/components/schedule/ScheduleLessonCard';
import type { ClassSession } from '@/types';

interface MonthWeek {
  weekNum: number;
  from: string;
  to: string;
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function monthRange(year: number, month: number) {
  const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const endDate = new Date(year, month + 1, 0);
  const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
  return { from, to };
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Split month into Week 1, Week 2, … (7-day blocks from the 1st through month end). */
function monthWeeks(year: number, month: number): MonthWeek[] {
  const lastDay = new Date(year, month + 1, 0).getDate();
  const weeks: MonthWeek[] = [];
  let startDay = 1;
  let weekNum = 1;

  while (startDay <= lastDay) {
    const endDay = Math.min(startDay + 6, lastDay);
    weeks.push({
      weekNum,
      from: dateKey(year, month, startDay),
      to: dateKey(year, month, endDay),
    });
    startDay = endDay + 1;
    weekNum += 1;
  }

  return weeks;
}

function formatWeekRange(from: string, to: string) {
  const fmt = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
    });
  };
  return `${fmt(from)} – ${fmt(to)}`;
}

function itemsInWeek(items: ScheduleLessonItem[], week: MonthWeek) {
  return items.filter((item) => {
    const d = item.sessionDate.slice(0, 10);
    return d >= week.from && d <= week.to;
  });
}

function weekContainingDate(weeks: MonthWeek[], isoDate: string) {
  return weeks.find((w) => isoDate >= w.from && isoDate <= w.to)?.weekNum ?? weeks[0]?.weekNum ?? 1;
}

function ensureMockSessionsForMonth(classIds: Set<string>, year: number, month: number) {
  const enrolledClasses = mockClasses.filter((c) => classIds.has(c.id));
  if (enrolledClasses.length === 0) return;
  const { from, to } = monthRange(year, month);
  generateMockSessions(enrolledClasses, from, to);
}

export default function LearnerSchedulePage() {
  const { user } = useLearnerContext();
  const mockStudentId = useMemo(
    () => resolveMockStudentUserId(user?.email),
    [user?.email]
  );
  const [anchor, setAnchor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeWeek, setActiveWeek] = useState<number | null>(null);

  const classIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of mockEnrollments) {
      if (e.studentUserId === mockStudentId && e.status === 'Active') {
        ids.add(e.classId);
      }
    }
    return ids;
  }, [mockStudentId]);

  const loadSchedule = useCallback(() => {
    setLoading(true);
    ensureMockSessionsForMonth(classIds, anchor.year, anchor.month);
    setSessions(loadAllSessions());
    setLoading(false);
  }, [anchor.month, anchor.year, classIds]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const classById = useMemo(() => new Map(mockClasses.map((c) => [c.id, c])), []);

  const monthItems = useMemo(() => {
    const { from: start, to: end } = monthRange(anchor.year, anchor.month);

    return sessions
      .filter((s) => {
        const d = s.sessionDate.slice(0, 10);
        return classIds.has(s.classId) && d >= start && d <= end;
      })
      .map((s) => sessionToScheduleItem(s, classById.get(s.classId)))
      .sort((a, b) => {
        const cmp = a.sessionDate.localeCompare(b.sessionDate);
        return cmp !== 0 ? cmp : a.startTime.localeCompare(b.startTime);
      });
  }, [sessions, classIds, classById, anchor]);

  const weeks = useMemo(
    () => monthWeeks(anchor.year, anchor.month),
    [anchor.year, anchor.month]
  );

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const inMonth =
      Number(today.slice(0, 4)) === anchor.year &&
      Number(today.slice(5, 7)) === anchor.month + 1;
    setActiveWeek(inMonth ? weekContainingDate(weeks, today) : weeks[0]?.weekNum ?? 1);
  }, [anchor.year, anchor.month, weeks]);

  const isCurrentMonth = useMemo(() => {
    const n = new Date();
    return anchor.year === n.getFullYear() && anchor.month === n.getMonth();
  }, [anchor]);

  const prevMonth = () => {
    setAnchor((a) => {
      if (a.month === 0) return { year: a.year - 1, month: 11 };
      return { ...a, month: a.month - 1 };
    });
  };

  const nextMonth = () => {
    setAnchor((a) => {
      if (a.month === 11) return { year: a.year + 1, month: 0 };
      return { ...a, month: a.month + 1 };
    });
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-5 flex items-start justify-between">
        <h1 className="text-2xl font-bold text-[#5C4033]">Schedule</h1>
        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Filter schedule"
        >
          <SlidersHorizontal className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-orange-500" />
        </button>
      </div>

      <div className="mb-5 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={prevMonth}
          aria-label="Previous month"
          className="shrink-0"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 flex-col items-center gap-1">
          <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700">
            {isCurrentMonth ? 'This Month' : monthLabel(anchor.year, anchor.month)}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={nextMonth}
          aria-label="Next month"
          className="shrink-0"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="mb-4 -mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex min-w-min gap-2">
          {weeks.map((week) => {
            const selected = activeWeek === week.weekNum;
            const count = itemsInWeek(monthItems, week).length;
            return (
              <button
                key={week.weekNum}
                type="button"
                onClick={() => {
                  setActiveWeek(week.weekNum);
                  document.getElementById(`schedule-week-${week.weekNum}`)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  });
                }}
                className={cn(
                  'shrink-0 rounded-xl border px-3 py-2 text-left transition',
                  selected
                    ? 'border-primary-300 bg-primary-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                <p
                  className={cn(
                    'text-xs font-semibold',
                    selected ? 'text-primary-700' : 'text-slate-700'
                  )}
                >
                  Week {week.weekNum}
                </p>
                <p className="mt-0.5 whitespace-nowrap text-[11px] text-slate-500">
                  {formatWeekRange(week.from, week.to)}
                </p>
                {count > 0 && (
                  <p className="mt-1 text-[10px] font-medium text-primary-600">
                    {count} lesson{count === 1 ? '' : 's'}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading schedule…</p>
      ) : monthItems.length === 0 ? (
        <p className="text-sm text-slate-500">No lessons scheduled this month.</p>
      ) : (
        <div className="space-y-6">
          {weeks.map((week) => {
            const weekItems = itemsInWeek(monthItems, week);
            const selected = activeWeek === week.weekNum;
            return (
              <section
                key={week.weekNum}
                id={`schedule-week-${week.weekNum}`}
                className={cn(selected && 'scroll-mt-4')}
              >
                  <div className="mb-3 flex items-baseline justify-between gap-2">
                    <h2 className="text-sm font-semibold text-slate-800">
                      Week {week.weekNum}
                    </h2>
                    <p className="text-xs text-slate-500">{formatWeekRange(week.from, week.to)}</p>
                  </div>
                  {weekItems.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                      No lessons this week.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {weekItems.map((item) => (
                        <ScheduleLessonCard key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
        </div>
      )}
    </div>
  );
}
