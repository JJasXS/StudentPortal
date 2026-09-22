import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';
import { ScheduleLessonCard } from '@/components/schedule/ScheduleLessonCard';
import type { ScheduleLessonItem } from '@/components/schedule/ScheduleLessonCard';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { useSqlAccountStudent } from '@/hooks/useSqlAccountStudent';
import { useStudentPortalData } from '@/hooks/useStudentPortalData';
import { studentsApi } from '@/api/resources';
import { isStudentPortalRole } from '@/utils/learnerPortal';
import { cn } from '@/utils/cn';
import { generateMockSessions, loadAllSessions } from '@/utils/mockSessionStore';
import { erpEventToScheduleItem, sessionToScheduleItem } from '@/utils/learnerSchedule';
import type { ClassItem, ClassSession } from '@/types';
import type { ErpCalendarEvent } from '@/types/sqlAccount';

type ScheduleViewMode = 'week' | 'month';

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
  const isErpLearner = isStudentPortalRole(user?.role);
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';
  const { student, loading: studentLoading, error: studentError } = useSqlAccountStudent(isErpLearner);
  const {
    classIds,
    classes: studentClasses,
    sessions: portalSessions,
    loading: portalLoading,
    error: portalError,
    isMock: portalMock,
  } = useStudentPortalData(!isErpLearner);
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
  const [parentView, setParentView] = useState<ScheduleViewMode>('week');
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const viewMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!viewMenuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setViewMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [viewMenuOpen]);

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
      const branch = childFilter || student?.branchName || undefined;
      const events = isMock ? [] : await studentsApi.getMyCalendarEvents(branch);
      setErpEvents(events);
    } catch {
      setError('Could not load schedule from SQL Account.');
      setErpEvents([]);
    } finally {
      setLoading(false);
    }
  }, [childFilter, isMock, student?.branchName]);

  useEffect(() => {
    if (student?.branchName) {
      setChildFilter(student.branchName);
    }
  }, [student?.branchName]);

  useEffect(() => {
    if (isErpLearner) {
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
    isErpLearner,
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

  const weeks = useMemo(
    () => monthWeeks(anchor.year, anchor.month),
    [anchor.year, anchor.month]
  );

  const activeWeekData = useMemo(
    () => weeks.find((w) => w.weekNum === activeWeek) ?? weeks[0],
    [weeks, activeWeek]
  );

  const parentWeekItems = useMemo(() => {
    if (!activeWeekData) return [];
    const { from, to } = activeWeekData;
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
  }, [erpEvents, activeWeekData, childFilter]);

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

  useEffect(() => {
    setActiveWeek((current) => {
      if (current != null && weeks.some((w) => w.weekNum === current)) return current;
      const today = new Date().toISOString().slice(0, 10);
      const inMonth =
        Number(today.slice(0, 4)) === anchor.year &&
        Number(today.slice(5, 7)) === anchor.month + 1;
      return inMonth ? weekContainingDate(weeks, today) : weeks[0]?.weekNum ?? 1;
    });
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

  const prevWeek = () => {
    const cur = activeWeek ?? 1;
    if (cur > 1) {
      setActiveWeek(cur - 1);
      return;
    }
    const prev =
      anchor.month === 0
        ? { year: anchor.year - 1, month: 11 }
        : { year: anchor.year, month: anchor.month - 1 };
    const prevWeeks = monthWeeks(prev.year, prev.month);
    setAnchor(prev);
    setActiveWeek(prevWeeks[prevWeeks.length - 1]?.weekNum ?? 1);
  };

  const nextWeek = () => {
    const cur = activeWeek ?? 1;
    const last = weeks[weeks.length - 1]?.weekNum ?? 1;
    if (cur < last) {
      setActiveWeek(cur + 1);
      return;
    }
    const next =
      anchor.month === 11
        ? { year: anchor.year + 1, month: 0 }
        : { year: anchor.year, month: anchor.month + 1 };
    setAnchor(next);
    setActiveWeek(1);
  };

  const pageLoading = loading || (isErpLearner && studentLoading);

  const activeWeekItems = useMemo(
    () => (activeWeekData ? itemsInWeek(monthItems, activeWeekData) : []),
    [monthItems, activeWeekData]
  );

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="relative mb-4 flex items-center justify-center sm:mb-5">
        <h1 className="text-xl font-bold text-[#5C4033] sm:text-2xl">Schedule</h1>
        {isErpLearner && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2" ref={viewMenuRef}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Schedule view"
              aria-haspopup="menu"
              aria-expanded={viewMenuOpen}
              onClick={() => setViewMenuOpen((v) => !v)}
              className="h-9 w-9 p-0"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
            {viewMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-30 mt-1 min-w-[10rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              >
                {(
                  [
                    { value: 'week', label: 'Weekly' },
                    { value: 'month', label: 'Monthly' },
                  ] as const
                ).map((choice) => {
                  const selected = parentView === choice.value;
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      role="menuitem"
                      className={cn(
                        'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50',
                        selected ? 'font-medium text-primary-700' : 'text-slate-700'
                      )}
                      onClick={() => {
                        setParentView(choice.value);
                        setViewMenuOpen(false);
                      }}
                    >
                      {choice.label}
                      {selected && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {(error || studentError || (!isErpLearner && portalError)) && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 sm:px-4">
          {error || studentError || portalError}
        </p>
      )}

      {isErpLearner ? (
        <>
          <div className="mb-4 flex items-center justify-between gap-1 sm:mb-5 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={parentView === 'week' ? prevWeek : prevMonth}
              aria-label={parentView === 'week' ? 'Previous week' : 'Previous month'}
              className="h-10 w-11 shrink-0 touch-manipulation sm:h-9 sm:w-auto"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            <div className="flex min-w-0 flex-1 items-center justify-center gap-2 px-1">
              <span className="max-w-[40%] truncate rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 sm:px-4 sm:text-sm">
                {monthLabel(anchor.year, anchor.month).replace(/\s+\d{4}$/, '')}
              </span>
              {parentView === 'week' && activeWeekData && (
                <span className="truncate text-xs text-slate-500 sm:text-sm">
                  {formatWeekRange(activeWeekData.from, activeWeekData.to)}
                </span>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={parentView === 'week' ? nextWeek : nextMonth}
              aria-label={parentView === 'week' ? 'Next week' : 'Next month'}
              className="h-10 w-11 shrink-0 touch-manipulation sm:h-9 sm:w-auto"
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
          <div className="mb-4 flex items-center gap-2 sm:mb-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={prevMonth}
              aria-label="Previous month"
              className="h-10 w-10 shrink-0 border-primary-200 p-0 text-primary-700 touch-manipulation hover:bg-primary-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex min-w-0 flex-1 justify-center px-1">
              <span className="max-w-full truncate rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700">
                {isCurrentMonth ? 'This Month' : monthLabel(anchor.year, anchor.month)}
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={nextMonth}
              aria-label="Next month"
              className="h-10 w-10 shrink-0 p-0 touch-manipulation"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="mb-4 flex gap-2">
            {weeks.map((week) => {
              const selected = activeWeek === week.weekNum;
              return (
                <button
                  key={week.weekNum}
                  type="button"
                  onClick={() => setActiveWeek(week.weekNum)}
                  className={cn(
                    'min-w-0 flex-1 rounded-xl border px-2 py-2 text-left transition touch-manipulation',
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
                  <p className="mt-0.5 text-[10px] leading-tight text-slate-500 sm:text-[11px]">
                    {formatWeekRange(week.from, week.to)}
                  </p>
                </button>
              );
            })}
          </div>

          {pageLoading ? (
            <p className="text-sm text-slate-500">Loading schedule…</p>
          ) : activeWeekData ? (
            <section>
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-800">
                  Week {activeWeekData.weekNum}
                </h2>
                <p className="text-xs text-slate-500">
                  {formatWeekRange(activeWeekData.from, activeWeekData.to)}
                </p>
              </div>
              {activeWeekItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-500">
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
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center text-sm text-slate-500">
              No lessons scheduled this month.
            </p>
          )}
        </>
      )}
    </div>
  );
}
