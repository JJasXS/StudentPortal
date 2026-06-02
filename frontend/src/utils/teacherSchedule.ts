import type { ClassItem, ClassSession } from '@/types';

export interface TodayClassItem {
  id: string;
  classId: string;
  className: string;
  courseName?: string;
  startTime: string;
  endTime: string;
  location: string;
  enrolledCount?: number;
  topic?: string;
  status: string;
  sessionId?: string;
}

export function getTodayWeekdayName(date = new Date()): string {
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

export function getTodayDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatTodayHeading(date = new Date()): string {
  return date.toLocaleDateString('en-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function sessionDateKey(sessionDate: string) {
  return sessionDate.slice(0, 10);
}

function compareTime(a: string, b: string) {
  return a.localeCompare(b);
}

export function buildTodaySchedule(
  myClasses: ClassItem[],
  sessions: ClassSession[],
  today = new Date()
): TodayClassItem[] {
  const weekday = getTodayWeekdayName(today);
  const dateKey = getTodayDateKey(today);

  const activeClasses = myClasses.filter((c) => c.isActive);
  const classById = new Map(activeClasses.map((c) => [c.id, c]));

  const todaySessions = sessions.filter(
    (s) => sessionDateKey(s.sessionDate) === dateKey && s.status !== 'Cancelled'
  );
  const sessionByClassId = new Map(todaySessions.map((s) => [s.classId, s]));
  const items: TodayClassItem[] = [];
  const usedClassIds = new Set<string>();

  for (const cls of activeClasses.filter((c) => c.dayOfWeek === weekday)) {
    const session = sessionByClassId.get(cls.id);
    usedClassIds.add(cls.id);
    items.push({
      id: session?.id ?? cls.id,
      classId: cls.id,
      className: cls.className,
      courseName: cls.courseName,
      startTime: session?.startTime ?? cls.startTime,
      endTime: session?.endTime ?? cls.endTime,
      location: cls.location,
      enrolledCount: cls.enrolledCount,
      topic: session?.topic,
      status: session?.status ?? 'Scheduled',
      sessionId: session?.id,
    });
  }

  for (const session of todaySessions) {
    if (usedClassIds.has(session.classId)) continue;
    const cls = classById.get(session.classId);
    items.push({
      id: session.id,
      classId: session.classId,
      className: session.className ?? cls?.className ?? 'Class',
      courseName: cls?.courseName,
      startTime: session.startTime,
      endTime: session.endTime,
      location: cls?.location ?? '—',
      enrolledCount: cls?.enrolledCount,
      topic: session.topic,
      status: session.status,
      sessionId: session.id,
    });
  }

  return items.sort((a, b) => compareTime(a.startTime, b.startTime));
}

export function isUpcomingToday(startTime: string, now = new Date()): boolean {
  const [h, m] = startTime.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return false;
  const start = new Date(now);
  start.setHours(h, m, 0, 0);
  return start.getTime() > now.getTime();
}

export function isInProgressToday(startTime: string, endTime: string, now = new Date()): boolean {
  const parse = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };
  const start = parse(startTime);
  const end = parse(endTime);
  const t = now.getTime();
  return t >= start && t <= end;
}
