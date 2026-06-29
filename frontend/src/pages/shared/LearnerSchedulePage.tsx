import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { ScheduleLessonCard } from '@/components/schedule/ScheduleLessonCard';
import { Button } from '@/components/ui/Button';
import { useLearnerContext } from '@/hooks/useLearnerContext';
import { mockClasses, mockEnrollments } from '@/utils/mockData';
import { generateMockSessions, loadAllSessions } from '@/utils/mockSessionStore';
import {
  resolveMockStudentUserId,
  sessionToScheduleItem,
} from '@/utils/learnerSchedule';
import type { ClassSession } from '@/types';

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

      {loading ? (
        <p className="text-sm text-slate-500">Loading schedule…</p>
      ) : monthItems.length === 0 ? (
        <p className="text-sm text-slate-500">No lessons scheduled this month.</p>
      ) : (
        <div className="space-y-3">
          {monthItems.map((item) => (
            <ScheduleLessonCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
