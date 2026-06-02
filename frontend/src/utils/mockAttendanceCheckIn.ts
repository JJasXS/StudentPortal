import type { Attendance, ClassSession, Enrollment } from '@/types';
import { classHasNotEnded, isWithinClassWindow } from '@/utils/classSessionWindow';

export interface AttendanceCheckInInfo {
  classSessionId: string;
  className?: string;
  code: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  classStartAt?: string;
  classEndAt?: string;
}

const STORAGE_KEY = 'mtp_attendance_check_ins';

function load(): Record<string, AttendanceCheckInInfo> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(all: Record<string, AttendanceCheckInInfo>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function generateCode(): string {
  return String(Math.floor(10000 + Math.random() * 90000));
}

function entryActive(entry: AttendanceCheckInInfo) {
  return classHasNotEnded(entry.sessionDate, entry.endTime);
}

export function getMockCheckIn(classSessionId: string): AttendanceCheckInInfo | null {
  const all = load();
  const entry = all[classSessionId];
  if (!entry || !entryActive(entry)) {
    if (entry) {
      delete all[classSessionId];
      save(all);
    }
    return null;
  }
  return entry;
}

export function generateMockCheckIn(session: ClassSession, className?: string): AttendanceCheckInInfo {
  const all = load();
  const entry: AttendanceCheckInInfo = {
    classSessionId: session.id,
    className: className ?? session.className,
    code: generateCode(),
    sessionDate: session.sessionDate,
    startTime: session.startTime,
    endTime: session.endTime,
  };
  all[session.id] = entry;
  save(all);
  return entry;
}

const EXTRA_ATTENDANCE_KEY = 'mtp_mock_extra_attendance';

export function loadExtraMockAttendance(): Attendance[] {
  try {
    const raw = localStorage.getItem(EXTRA_ATTENDANCE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveExtraMockAttendance(list: Attendance[]) {
  localStorage.setItem(EXTRA_ATTENDANCE_KEY, JSON.stringify(list));
}

export function mockRedeemCheckIn(
  code: string,
  studentUserId: string,
  studentName: string,
  sessions: ClassSession[],
  enrollments: Enrollment[]
): Attendance | null {
  const normalized = code.trim();
  const all = load();
  const entry = Object.values(all).find((e) => e.code === normalized);
  if (!entry) return null;

  const session = sessions.find((s) => s.id === entry.classSessionId);
  if (!session) return null;

  if (!isWithinClassWindow(session.sessionDate, session.startTime, session.endTime)) {
    return null;
  }

  const enrolled = enrollments.some(
    (e) => e.classId === session.classId && e.studentUserId === studentUserId && e.status === 'Active'
  );
  if (!enrolled) return null;

  const extras = loadExtraMockAttendance();
  const existing = extras.find(
    (a) => a.classSessionId === session.id && a.studentUserId === studentUserId
  );
  if (existing) {
    existing.status = 'Present';
    existing.remarks = 'Checked in with code';
    saveExtraMockAttendance(extras);
    return existing;
  }

  const record: Attendance = {
    id: crypto.randomUUID(),
    classSessionId: session.id,
    sessionDate: session.sessionDate.slice(0, 10),
    className: session.className ?? entry.className,
    studentUserId,
    studentName,
    status: 'Present',
    remarks: 'Checked in with code',
  };
  extras.push(record);
  saveExtraMockAttendance(extras);
  return record;
}
