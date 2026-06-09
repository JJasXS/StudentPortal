import type { Announcement, ClassItem, ClassSession } from '@/types';

function parseDateKey(value: string) {
  return value.slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function matchesDayOfWeek(dayOfWeek: string, date: Date) {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const short = date.toLocaleDateString('en-US', { weekday: 'short' });
  return (
    weekday.toLowerCase() === dayOfWeek.trim().toLowerCase() ||
    short.toLowerCase() === dayOfWeek.trim().toLowerCase()
  );
}

export function collectHolidayDates(announcements: Announcement[]) {
  return new Set(
    announcements
      .filter((a) => a.holidayDate)
      .map((a) => parseDateKey(a.holidayDate!))
  );
}

export function generateSessionsForClasses(
  classes: ClassItem[],
  fromDate: string,
  toDate: string,
  existingSessions: ClassSession[],
  holidayDates: Set<string> = new Set()
): { sessions: ClassSession[]; createdCount: number; skippedCount: number } {
  const from = new Date(`${fromDate}T12:00:00`);
  const to = new Date(`${toDate}T12:00:00`);
  const activeClasses = classes.filter((c) => c.isActive);

  const existingKeys = new Set(
    existingSessions.map((s) => `${s.classId}|${parseDateKey(s.sessionDate)}`)
  );

  const created: ClassSession[] = [];
  let skipped = 0;

  for (let cursor = new Date(from); cursor <= to; cursor = addDays(cursor, 1)) {
    const dateKey = toDateKey(cursor);
    if (holidayDates.has(dateKey)) {
      skipped++;
      continue;
    }

    for (const cls of activeClasses.filter((c) => matchesDayOfWeek(c.dayOfWeek, cursor))) {
      const key = `${cls.id}|${dateKey}`;
      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      created.push({
        id: crypto.randomUUID(),
        classId: cls.id,
        className: cls.className,
        sessionDate: dateKey,
        startTime: cls.startTime,
        endTime: cls.endTime,
        status: 'Scheduled',
      });
      existingKeys.add(key);
    }
  }

  return { sessions: created, createdCount: created.length, skippedCount: skipped };
}

export function sessionsForClass(sessions: ClassSession[], classId: string) {
  return sessions
    .filter((s) => s.classId === classId)
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
}

export function sessionsInRange(sessions: ClassSession[], fromDate: string, toDate: string) {
  return sessions.filter((s) => {
    const key = parseDateKey(s.sessionDate);
    return key >= fromDate && key <= toDate && s.status !== 'Cancelled';
  });
}

export function weekRange(anchor: Date) {
  const day = anchor.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const start = addDays(anchor, diffToMonday);
  const end = addDays(start, 6);
  return { start: toDateKey(start), end: toDateKey(end), startDate: start };
}

export function weekDayKeys(anchor: Date) {
  const { startDate } = weekRange(anchor);
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(startDate, i)));
}
