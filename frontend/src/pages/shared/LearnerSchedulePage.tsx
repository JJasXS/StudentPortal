import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { ScheduleLessonCard } from '@/components/schedule/ScheduleLessonCard';
import type { ScheduleLessonItem } from '@/components/schedule/ScheduleLessonCard';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useSqlAccountChildren } from '@/hooks/useSqlAccountChildren';
import { useStudentPortalData } from '@/hooks/useStudentPortalData';
import { parentsApi } from '@/api/resources';
import { cn } from '@/utils/cn';
import { generateMockSessions, loadAllSessions } from '@/utils/mockSessionStore';
import { erpEventToScheduleItem, sessionToScheduleItem } from '@/utils/learnerSchedule';
import type { ClassItem, ClassSession } from '@/types';
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

/** Monday-based week start (ISO date). */
function startOfWeekMonday(date: Date): string {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

function addDaysToIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const next = new Date(y, m - 1, d);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function weekRangeFromMonday(mondayIso: string): MonthWeek {
  return {
    weekNum: 1,
    from: mondayIso,
    to: addDaysToIso(mondayIso, 6),
  };
}

function isCurrentWeek(mondayIso: string): boolean {
  return mondayIso === startOfWeekMonday(new Date());
}

function ChildFilterMenu({
  childOptions,
  childFilter,
  onSelect,
}: {
  childOptions: string[];
  childFilter: string;
  onSelect: (branch: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const label = childFilter || 'Students';

  return (
    <div className="relative mb-4 flex justify-end" ref={menuRef}>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
        <MoreVertical className="mr-1.5 h-4 w-4" />
        {label}
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[10rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            className={cn(
              'block w-full px-3 py-2 text-left text-sm hover:bg-slate-50',
              childFilter === '' && 'font-medium text-primary-700'
            )}
            onClick={() => {
              onSelect('');
              setOpen(false);
            }}
          >
            Students
          </button>
          {childOptions.map((branch) => (
            <button
              key={branch}
              type="button"
              className={cn(
                'block w-full px-3 py-2 text-left text-sm capitalize hover:bg-slate-50',
                childFilter === branch && 'font-medium text-primary-700'
              )}
              onClick={() => {
                onSelect(branch);
                setOpen(false);
              }}
            >
              {branch}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ensureMockSessionsForMonth(
  classes: ClassItem[],
  classIds: Set<string>,
  year: number,
  month: number
) {
  const enrolledClasses = classes.filter((c) => classIds.has(c.id));
  if (enrolledClasses.length === 0) return;
  const { from, to } = monthRange(year, month);
  generateMockSessions(enrolledClasses, from, to);
}

export default function LearnerSchedulePage() {
  const { user } = useAuth();
  const isParent = user?.role === 'Parent';
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';
  const { children, loading: childrenLoading, error: childrenError } = useSqlAccountChildren(isParent);
  const {
    classIds,
    classes: studentClasses,
    sessions: portalSessions,
    loading: portalLoading,
    error: portalError,
    isMock: portalMock,
  } = useStudentPortalData(!isParent);
  const [anchor, setAnchor] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [weekStart, setWeekStart] = useState(() => startOfWeekMonday(new Date()));
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [erpEvents, setErpEvents] = useState<ErpCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeWeek, setActiveWeek] = useState<number | null>(null);
  const [childFilter, setChildFilter] = useState('');
  const [parentView, setParentView] = useState<'week' | 'month'>('week');

  const loadStudentSchedule = useCallback(() => {
    setLoading(true);
    ensureMockSessionsForMonth(studentClasses, classIds, anchor.year, anchor.month);
    setSessions(loadAllSessions().filter((s) => classIds.has(s.classId)));
    setLoading(false);
  }, [anchor.month, anchor.year, classIds, studentClasses]);

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
    if (portalMock) {
      loadStudentSchedule();
      return;
    }
    setSessions(portalSessions);
    setLoading(portalLoading);
    setError(portalError);
  }, [
    isParent,
    loadParentSchedule,
    loadStudentSchedule,
    portalMock,
    portalSessions,
    portalLoading,
    portalError,
  ]);

  const classById = useMemo(
    () => new Map(studentClasses.map((c) => [c.id, c])),
    [studentClasses]
  );

  const parentWeekRange = useMemo(() => weekRangeFromMonday(weekStart), [weekStart]);

  const parentWeekItems = useMemo(() => {
    const { from, to } = parentWeekRange;
    return erpEvents
      .filter((e) => {
        const d = e.sessionDate.slice(0, 10);
        return d >= from && d <= to;
      })
      .map((e) => erpEventToScheduleItem(e, { showBranch: !childFilter }))
      .sort((a, b) => {
        const cmp = a.sessionDate.localeCompare(b.sessionDate);
        return cmp !== 0 ? cmp : a.startTime.localeCompare(b.startTime);
      });
  }, [erpEvents, parentWeekRange, childFilter]);

  const parentMonthItems = useMemo(() => {
    const { from, to } = monthRange(anchor.year, anchor.month);
    return erpEvents
      .filter((e) => {
        const d = e.sessionDate.slice(0, 10);
        return d >= from && d <= to;
      })
      .map((e) => erpEventToScheduleItem(e, { showBranch: !childFilter }))
      .sort((a, b) => {
        const cmp = a.sessionDate.localeCompare(b.sessionDate);
        return cmp !== 0 ? cmp : a.startTime.localeCompare(b.startTime);
      });
  }, [erpEvents, anchor.year, anchor.month, childFilter]);

  const parentDisplayItems =
    parentView === 'week' ? parentWeekItems : parentMonthItems;

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

  const prevWeek = () => setWeekStart((w) => addDaysToIso(w, -7));
  const nextWeek = () => setWeekStart((w) => addDaysToIso(w, 7));
  const showingCurrentWeek = isCurrentWeek(weekStart);

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
            {childFilter ? `Showing ${childFilter}'s lessons` : 'Students'}
          </p>
        )}
      </div>

      {isParent && childOptions.length > 0 && (
        <ChildFilterMenu
          childOptions={childOptions}
          childFilter={childFilter}
          onSelect={setChildFilter}
        />
      )}

      {(error || childrenError || (!isParent && portalError)) && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:px-4">
          {error || childrenError || portalError}
        </p>
      )}

      {isParent ? (
        <>
          <div className="mb-4 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={parentView === 'week' ? 'default' : 'outline'}
              onClick={() => setParentView('week')}
            >
              Week
            </Button>
            <Button
              type="button"
              size="sm"
              variant={parentView === 'month' ? 'default' : 'outline'}
              onClick={() => setParentView('month')}
            >
              Month
            </Button>
          </div>

          <div className="mb-4 flex items-center justify-between gap-1 sm:mb-5 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={parentView === 'week' ? prevWeek : prevMonth}
              aria-label={parentView === 'week' ? 'Previous week' : 'Previous month'}
              className="h-11 w-11 shrink-0 touch-manipulation sm:h-9 sm:w-auto"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1">
              <span className="max-w-full truncate rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 sm:px-4 sm:text-sm">
                {parentView === 'week'
                  ? showingCurrentWeek
                    ? 'This week'
                    : formatWeekRange(parentWeekRange.from, parentWeekRange.to)
                  : isCurrentMonth
                    ? 'This month'
                    : monthLabel(anchor.year, anchor.month)}
              </span>
              {parentView === 'week' && showingCurrentWeek && (
                <span className="text-xs text-slate-500">
                  {formatWeekRange(parentWeekRange.from, parentWeekRange.to)}
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={parentView === 'week' ? nextWeek : nextMonth}
              aria-label={parentView === 'week' ? 'Next week' : 'Next month'}
              className="h-11 w-11 shrink-0 touch-manipulation sm:h-9 sm:w-auto"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          {pageLoading ? (
            <p className="text-sm text-slate-500">Loading schedule…</p>
          ) : parentDisplayItems.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              No lessons scheduled this {parentView}.
            </p>
          ) : (
            <div className="space-y-3">
              {parentDisplayItems.map((item) => (
                <ScheduleLessonCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
