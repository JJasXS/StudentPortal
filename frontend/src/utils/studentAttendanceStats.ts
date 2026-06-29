import type { Attendance, Enrollment } from '@/types';

const COUNTED_STATUSES = new Set<Attendance['status']>(['Present', 'Late']);

export interface ClassAttendanceSummary {
  classId: string;
  className: string;
  courseName?: string;
  attendedCount: number;
  totalRecords: number;
}

export function isCountedAttendance(status: Attendance['status']) {
  return COUNTED_STATUSES.has(status);
}

/** Present + Late sessions per enrolled class. */
export function buildClassAttendanceSummaries(
  enrollments: Enrollment[],
  attendance: Attendance[],
  studentUserId: string,
  classMeta?: Map<string, { courseName?: string }>
): ClassAttendanceSummary[] {
  const active = enrollments.filter(
    (e) => e.studentUserId === studentUserId && e.status === 'Active'
  );

  const byClassName = new Map<string, Attendance[]>();
  for (const record of attendance) {
    if (record.studentUserId !== studentUserId || !record.className) continue;
    const list = byClassName.get(record.className) ?? [];
    list.push(record);
    byClassName.set(record.className, list);
  }

  return active.map((enrollment) => {
    const className = enrollment.className ?? 'Class';
    const records = byClassName.get(className) ?? [];
    const attendedCount = records.filter((r) => isCountedAttendance(r.status)).length;
    return {
      classId: enrollment.classId,
      className,
      courseName: classMeta?.get(enrollment.classId)?.courseName,
      attendedCount,
      totalRecords: records.length,
    };
  });
}

export function attendedCountForClass(
  attendance: Attendance[],
  studentUserId: string,
  className: string
): number {
  return attendance.filter(
    (a) =>
      a.studentUserId === studentUserId &&
      a.className === className &&
      isCountedAttendance(a.status)
  ).length;
}
