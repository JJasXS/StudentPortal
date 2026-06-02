import type { Attendance, Enrollment } from '@/types';

export type AttendanceStatus = Attendance['status'];

export interface AttendanceRosterRow {
  id?: string;
  studentUserId: string;
  studentName: string;
  phoneNumber?: string;
  status: AttendanceStatus | '';
  remarks: string;
}

export function enrichRosterWithPhones(
  rows: AttendanceRosterRow[],
  phoneByUserId: Record<string, string | undefined>
): AttendanceRosterRow[] {
  return rows.map((r) => ({
    ...r,
    phoneNumber: phoneByUserId[r.studentUserId] ?? r.phoneNumber ?? '',
  }));
}

export function buildAttendanceRoster(
  sessionId: string,
  classId: string,
  enrollments: Enrollment[],
  existing: Attendance[]
): AttendanceRosterRow[] {
  const byStudent = new Map<string, AttendanceRosterRow>();

  for (const e of enrollments.filter((x) => x.classId === classId && x.status === 'Active')) {
    byStudent.set(e.studentUserId, {
      studentUserId: e.studentUserId,
      studentName: e.studentName ?? 'Student',
      status: '',
      remarks: '',
    });
  }

  for (const a of existing.filter((x) => x.classSessionId === sessionId)) {
    byStudent.set(a.studentUserId, {
      id: a.id,
      studentUserId: a.studentUserId,
      studentName: a.studentName ?? 'Student',
      status: a.status,
      remarks: a.remarks ?? '',
    });
  }

  return Array.from(byStudent.values()).sort((a, b) =>
    a.studentName.localeCompare(b.studentName)
  );
}

export function isPresentStatus(status: AttendanceRosterRow['status']) {
  return status === 'Present';
}
