import { isErpEventForTeacher } from '@/utils/erpCalendar';
import { erpTeacherClassId } from '@/utils/teacherClasses';
import type { ClassItem, ClassSession, User } from '@/types';
import type { ErpCalendarEvent } from '@/types/sqlAccount';

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

export type ScheduleStatusLabel = 'Up Next' | 'In Progress' | 'Completed' | 'Cancelled' | 'Scheduled';

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

function normalizeTime(time: string) {
  return time.slice(0, 5);
}

function addDaysKey(dateKey: string, days: number) {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() + days);
  return getTodayDateKey(d);
}

function mondayOfWeek(date = new Date()) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function matchClassForErp(event: ErpCalendarEvent, classes: ClassItem[]): ClassItem | undefined {
  if (event.classId) {
    const byId = classes.find((c) => c.id === event.classId);
    if (byId) return byId;
  }
  const name = event.className.trim().toLowerCase();
  return classes.find((c) => c.className.trim().toLowerCase() === name);
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
      startTime: normalizeTime(session?.startTime ?? cls.startTime),
      endTime: normalizeTime(session?.endTime ?? cls.endTime),
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
      startTime: normalizeTime(session.startTime),
      endTime: normalizeTime(session.endTime),
      location: cls?.location ?? '—',
      enrolledCount: cls?.enrolledCount,
      topic: session.topic,
      status: session.status,
      sessionId: session.id,
    });
  }

  return items.sort((a, b) => compareTime(a.startTime, b.startTime));
}

export function buildTodayScheduleFromErp(
  events: ErpCalendarEvent[],
  myClasses: ClassItem[],
  user: Pick<User, 'id' | 'fullName'>,
  today = new Date()
): TodayClassItem[] {
  const dateKey = getTodayDateKey(today);
  const items: TodayClassItem[] = [];

  for (const event of events) {
    if (!isErpEventForTeacher(event, user)) continue;
    if (sessionDateKey(event.sessionDate) !== dateKey) continue;

    const cls = matchClassForErp(event, myClasses);
    const classId = event.classId?.trim() || cls?.id || erpTeacherClassId(event.className);

    items.push({
      id: event.id,
      classId,
      className: event.className,
      courseName: event.courseName ?? cls?.courseName,
      startTime: normalizeTime(event.startTime),
      endTime: normalizeTime(event.endTime),
      location: cls?.location && cls.location !== '—' ? cls.location : '—',
      enrolledCount: cls?.enrolledCount,
      status: event.status || 'Scheduled',
      sessionId: event.id,
    });
  }

  return items.sort((a, b) => compareTime(a.startTime, b.startTime));
}

/** Prefer ERP when events exist; otherwise portal sessions. */
export function resolveTeacherTodaySchedule(
  myClasses: ClassItem[],
  sessions: ClassSession[],
  erpEvents: ErpCalendarEvent[],
  user: Pick<User, 'id' | 'fullName'>,
  today = new Date()
): TodayClassItem[] {
  const fromErp = buildTodayScheduleFromErp(erpEvents, myClasses, user, today);
  if (fromErp.length > 0) return fromErp;
  return buildTodaySchedule(myClasses, sessions, today);
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

export function scheduleStatusLabel(
  item: TodayClassItem,
  now = new Date()
): ScheduleStatusLabel {
  if (item.status === 'Cancelled') return 'Cancelled';
  if (isInProgressToday(item.startTime, item.endTime, now)) return 'In Progress';
  if (isUpcomingToday(item.startTime, now)) return 'Up Next';
  const [h, m] = item.endTime.split(':').map(Number);
  if (!Number.isNaN(h) && !Number.isNaN(m)) {
    const end = new Date(now);
    end.setHours(h, m, 0, 0);
    if (now.getTime() > end.getTime()) return 'Completed';
  }
  return 'Scheduled';
}

export function findNextClassItem(
  items: TodayClassItem[],
  now = new Date()
): TodayClassItem | null {
  const active = items.filter((i) => i.status !== 'Cancelled');
  const inProgress = active.find((i) => isInProgressToday(i.startTime, i.endTime, now));
  if (inProgress) return inProgress;
  const upcoming = active
    .filter((i) => isUpcomingToday(i.startTime, now))
    .sort((a, b) => compareTime(a.startTime, b.startTime));
  return upcoming[0] ?? null;
}

export function formatStartsIn(startTime: string, now = new Date()): string {
  const [h, m] = startTime.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return '';
  const start = new Date(now);
  start.setHours(h, m, 0, 0);
  const mins = Math.round((start.getTime() - now.getTime()) / 60000);
  if (mins <= 0) return 'Starting now';
  if (mins < 60) return `Starts in ${mins} minute${mins === 1 ? '' : 's'}`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  if (rem === 0) return `Starts in ${hours} hour${hours === 1 ? '' : 's'}`;
  return `Starts in ${hours}h ${rem}m`;
}

export function countUpcomingInDays(
  erpEvents: ErpCalendarEvent[],
  sessions: ClassSession[],
  myClasses: ClassItem[],
  user: Pick<User, 'id' | 'fullName'>,
  days = 7,
  today = new Date()
): number {
  const from = getTodayDateKey(today);
  const to = addDaysKey(from, days);
  const classIds = new Set(myClasses.map((c) => c.id));

  const erpCount = erpEvents.filter((e) => {
    if (!isErpEventForTeacher(e, user)) return false;
    if (e.status === 'Cancelled') return false;
    const d = sessionDateKey(e.sessionDate);
    return d >= from && d <= to;
  }).length;

  if (erpCount > 0) return erpCount;

  return sessions.filter((s) => {
    if (!classIds.has(s.classId) || s.status === 'Cancelled') return false;
    const d = sessionDateKey(s.sessionDate);
    return d >= from && d <= to;
  }).length;
}

export function sumEnrolledStudents(classes: ClassItem[]): number {
  return classes.reduce((sum, c) => sum + (c.enrolledCount ?? 0), 0);
}

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function weekClassCounts(
  erpEvents: ErpCalendarEvent[],
  sessions: ClassSession[],
  myClasses: ClassItem[],
  user: Pick<User, 'id' | 'fullName'>,
  today = new Date()
): { label: string; count: number; isToday: boolean }[] {
  const monday = mondayOfWeek(today);
  const todayKey = getTodayDateKey(today);
  const classIds = new Set(myClasses.map((c) => c.id));

  const counts = WEEK_LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = getTodayDateKey(d);

    let count = erpEvents.filter((e) => {
      if (!isErpEventForTeacher(e, user)) return false;
      if (e.status === 'Cancelled') return false;
      return sessionDateKey(e.sessionDate) === key;
    }).length;

    if (count === 0) {
      count = sessions.filter(
        (s) =>
          classIds.has(s.classId) &&
          s.status !== 'Cancelled' &&
          sessionDateKey(s.sessionDate) === key
      ).length;
    }

    return { label, count, isToday: key === todayKey };
  });

  return counts;
}
