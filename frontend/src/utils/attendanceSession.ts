import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { getTodayDateKey } from '@/utils/teacherSchedule';
import type { ClassItem, ClassSession } from '@/types';

/** @deprecated Prefer resolveTodaySession for persisted session ids */
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

export async function resolveTodaySession(
  classItem: ClassItem,
  sessions: ClassSession[]
): Promise<ClassSession> {
  const today = getTodayDateKey();
  const existing = sessions.find(
    (s) =>
      s.classId === classItem.id &&
      s.sessionDate.slice(0, 10) === today &&
      !s.id.startsWith('today-')
  );
  if (existing) return existing;

  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const { getOrCreateMockTodaySession } = await import('@/utils/mockSessionStore');
    return getOrCreateMockTodaySession(classItem);
  }

  try {
    const { classSessionsApi } = await import('@/api/resources');
    return await classSessionsApi.getOrCreateToday(classItem.id);
  } catch {
    const { getOrCreateMockTodaySession } = await import('@/utils/mockSessionStore');
    return getOrCreateMockTodaySession(classItem);
  }
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

export function formatSessionSchedule(session: ClassSession) {
  const parts = [
    formatDateDDMMYYYY(session.sessionDate),
    `${session.startTime}–${session.endTime}`,
  ];
  if (session.topic) parts.push(session.topic);
  return parts.join(' · ');
}

export function formatSessionBreadcrumb(session: ClassSession) {
  const date = formatDateDDMMYYYY(session.sessionDate);
  return session.topic ? `${date} — ${session.topic}` : date;
}
