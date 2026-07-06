import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ScheduleLessonCard } from '@/components/schedule/ScheduleLessonCard';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useLearnerContext } from '@/hooks/useLearnerContext';
import { useSqlAccountChildren } from '@/hooks/useSqlAccountChildren';
import { parentsApi } from '@/api/resources';
import { cn } from '@/utils/cn';
import { mockClasses, mockEnrollments } from '@/utils/mockData';
import { generateMockSessions, loadAllSessions } from '@/utils/mockSessionStore';
import {
  erpEventToScheduleItem,
  resolveMockStudentUserId,
  sessionToScheduleItem,
} from '@/utils/learnerSchedule';
import type { ScheduleLessonItem } from '@/components/schedule/ScheduleLessonCard';
import type { ClassSession } from '@/types';
import type { ErpCalendarEvent } from '@/types/sqlAccount';

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
  const { user } = useAuth();
  const { user: learnerUser } = useLearnerContext();
  const isParent = user?.role === 'Parent';
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';
  const { children, loading: childrenLoading, error: childrenError } = useSqlAccountChildren(isParent);

  const mockStudentId = useMemo(
    () => resolveMockStudentUserId(learnerUser?.email),
    [learnerUser?.email]
  );
  const [anchor, setAnchor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [erpEvents, setErpEvents] = useState<ErpCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeWeek, setActiveWeek] = useState<number | null>(null);
  const [childFilter, setChildFilter] = useState('');

  const classIds = useMemo(() => {
    const ids = new Set<string>();
    for (const e of mockEnrollments) {
      if (e.studentUserId === mockStudentId && e.status === 'Active') {
        ids.add(e.classId);
      }
    }
    return ids;
  }, [mockStudentId]);

  const loadStudentSchedule = useCallback(() => {
    setLoading(true);
    ensureMockSessionsForMonth(classIds, anchor.year, anchor.month);
    setSessions(loadAllSessions());
    setLoading(false);
  }, [anchor.month, anchor.year, classIds]);

  const loadParentSchedule = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const events = isMock
        ? []
        : await parentsApi.getMyCalendarEvents(childFilter || undefined);
      setErpEvents(events);
    } catch {
      setError('Could not load schedule from SQL Account.');
      setErpEvents([]);
    } finally {
      setLoading(false);
    }
  }, [childFilter, isMock]);

  useEffect(() => {
    if (isParent) {
      void loadParentSchedule();
      return;
    }
    loadStudentSchedule();
  }, [isParent, loadParentSchedule, loadStudentSchedule]);

  const classById = useMemo(() => new Map(mockClasses.map((c) => [c.id, c])), []);

  const monthItems = useMemo(() => {
    const { from: start, to: end } = monthRange(anchor.year, anchor.month);

    if (isParent) {
      return erpEvents
        .filter((e) => e.sessionDate >= start && e.sessionDate <= end)
        .map((e) => erpEventToScheduleItem(e, { showBranch: !childFilter }))
        .sort((a, b) => {
          const cmp = a.sessionDate.localeCompare(b.sessionDate);
          return cmp !== 0 ? cmp : a.startTime.localeCompare(b.startTime);
        });
    }

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
  }, [sessions, classIds, classById, anchor, isParent, erpEvents, childFilter]);

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

  const childOptions = useMemo(() => {
    return children
      .map((child) => child.branchName?.trim())
      .filter((branch): branch is string => Boolean(branch));
  }, [children]);

  const pageLoading = loading || (isParent && childrenLoading);

  const activeWeekData = useMemo(
    () => weeks.find((w) => w.weekNum === activeWeek) ?? weeks[0],
    [weeks, activeWeek]
  );

  const activeWeekItems = useMemo(
    () => (activeWeekData ? itemsInWeek(monthItems, activeWeekData) : []),
    [monthItems, activeWeekData]
  );

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="mb-4 sm:mb-5">
        <h1 className="text-xl font-bold text-[#5C4033] sm:text-2xl">Schedule</h1>
        {isParent && (
          <p className="mt-1 text-sm text-slate-500">
            {childFilter ? `Showing ${childFilter}'s lessons` : 'All children'}
          </p>
        )}
      </div>

      {isParent && (
        <div className="-mx-4 mb-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-1 sm:px-1 [&::-webkit-scrollbar]:hidden">
          <div className="flex min-w-min snap-x snap-mandatory gap-2">
            <button
              type="button"
              onClick={() => setChildFilter('')}
              className={cn(
                'min-h-11 shrink-0 snap-start rounded-full border px-4 py-2.5 text-sm font-medium transition touch-manipulation',
                childFilter === ''
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-slate-200 bg-white text-slate-600 active:bg-slate-50'
              )}
            >
              All
            </button>
            {childOptions.map((branch) => (
              <button
                key={branch}
                type="button"
                onClick={() => setChildFilter(branch)}
                className={cn(
                  'min-h-11 shrink-0 snap-start rounded-full border px-4 py-2.5 text-sm font-medium capitalize transition touch-manipulation',
                  childFilter === branch
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-slate-200 bg-white text-slate-600 active:bg-slate-50'
                )}
              >
                {branch}
              </button>
            ))}
          </div>
        </div>
      )}

      {(error || childrenError) && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:px-4">
          {error || childrenError}
        </p>
      )}

      <div className="mb-4 flex items-center justify-between gap-1 sm:mb-5 sm:gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={prevMonth}
          aria-label="Previous month"
          className="h-11 w-11 shrink-0 touch-manipulation sm:h-9 sm:w-auto"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1">
          <span className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 sm:px-4 sm:text-sm">
            {isCurrentMonth ? 'This Month' : monthLabel(anchor.year, anchor.month)}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={nextMonth}
          aria-label="Next month"
          className="h-11 w-11 shrink-0 touch-manipulation sm:h-9 sm:w-auto"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="-mx-4 mb-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-1 sm:px-1 [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-min snap-x snap-mandatory gap-2">
          {weeks.map((week) => {
            const selected = activeWeek === week.weekNum;
            const count = itemsInWeek(monthItems, week).length;
            return (
              <button
                key={week.weekNum}
                type="button"
                onClick={() => setActiveWeek(week.weekNum)}
                className={cn(
                  'min-h-[4.5rem] min-w-[5.5rem] shrink-0 snap-start rounded-xl border px-3 py-2 text-left transition touch-manipulation sm:min-h-0 sm:min-w-0',
                  selected
                    ? 'border-primary-300 bg-primary-50 shadow-sm'
                    : 'border-slate-200 bg-white active:bg-slate-50'
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
                <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
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

      {pageLoading ? (
        <p className="text-sm text-slate-500">Loading schedule…</p>
      ) : monthItems.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          No lessons scheduled this month.
        </p>
      ) : (
        <>
          {/* Mobile: single active week */}
          <div className="sm:hidden">
            {activeWeekData && (
              <section className="scroll-mt-4">
                <div className="mb-3 flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                  <h2 className="text-sm font-semibold text-slate-800">
                    Week {activeWeekData.weekNum}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {formatWeekRange(activeWeekData.from, activeWeekData.to)}
                  </p>
                </div>
                {activeWeekItems.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                    No lessons this week.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeWeekItems.map((item) => (
                      <ScheduleLessonCard key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Tablet/desktop: all weeks */}
          <div className="hidden space-y-6 sm:block">
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
                    <h2 className="text-sm font-semibold text-slate-800">Week {week.weekNum}</h2>
                    <p className="shrink-0 text-xs text-slate-500">
                      {formatWeekRange(week.from, week.to)}
                    </p>
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
        </>
      )}
    </div>
  );
}
