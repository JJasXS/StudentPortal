import type { Attendance, ClassSession } from '@/types';

export function attendanceForClass(
  allAttendance: Attendance[],
  sessions: ClassSession[],
  classId: string,
  className?: string
): Attendance[] {
  const sessionIds = new Set(sessions.filter((s) => s.classId === classId).map((s) => s.id));
  return allAttendance.filter(
    (a) =>
      sessionIds.has(a.classSessionId) || (className != null && a.className === className)
  );
}

export function sessionDateKey(value?: string): string {
  if (!value) return '';
  return value.slice(0, 10);
}
