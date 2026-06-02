import { getTodayDateKey } from '@/utils/teacherSchedule';
import type { ClassItem, ClassSession } from '@/types';

/** Ensure each class has a session row for today (uses the class fixed schedule). */
export function ensureTodaySessions(classes: ClassItem[], sessions: ClassSession[]) {
  const today = getTodayDateKey();
  const result = [...sessions];
  for (const c of classes) {
    const hasToday = result.some(
      (s) => s.classId === c.id && s.sessionDate.slice(0, 10) === today
    );
    if (!hasToday) {
      result.push({
        id: `today-${c.id}`,
        classId: c.id,
        className: c.className,
        sessionDate: today,
        startTime: c.startTime,
        endTime: c.endTime,
        status: 'Scheduled',
      });
    }
  }
  return result;
}

export function getTodaySession(
  sessions: ClassSession[],
  classId: string
): ClassSession | undefined {
  const today = getTodayDateKey();
  return sessions.find(
    (s) => s.classId === classId && s.sessionDate.slice(0, 10) === today
  );
}

export function formatClassSchedule(c: ClassItem) {
  const parts = [`${c.dayOfWeek} · ${c.startTime}–${c.endTime}`];
  if (c.location) parts.push(c.location);
  return parts.join(' · ');
}
