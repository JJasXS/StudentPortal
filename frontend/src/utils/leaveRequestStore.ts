import type { LeaveRequest, LeaveRequestStatus } from '@/types/leaveRequest';

const STORAGE_KEY = 'mtp_leave_requests';

export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: 'lr1',
    studentUserId: '4',
    studentName: 'Emily Tan',
    classId: 'cl1',
    className: 'Piano Mon AM',
    courseName: 'Piano Beginner',
    sessionDate: '2026-06-16',
    reason: 'Family trip — unable to attend Monday class.',
    status: 'Pending',
    needsReplacement: false,
    createdAt: '2026-06-10T09:00:00',
    updatedAt: '2026-06-10T09:00:00',
  },
  {
    id: 'lr2',
    studentUserId: '5',
    studentName: 'James Lim',
    classId: 'cl2',
    className: 'Guitar Wed PM',
    courseName: 'Guitar Beginner',
    sessionDate: '2026-06-11',
    reason: 'School exam on the same day.',
    status: 'AwaitingTeacher',
    needsReplacement: true,
    adminNote: 'Approved — replacement class required.',
    replacement: {
      teacherUserId: '3',
      teacherName: 'David Wong',
      proposedDate: '2026-06-14',
      proposedStartTime: '15:00',
      proposedEndTime: '16:00',
      teacherResponse: 'Pending',
    },
    createdAt: '2026-06-08T11:00:00',
    updatedAt: '2026-06-09T14:30:00',
  },
  {
    id: 'lr3',
    studentUserId: '8',
    studentName: 'Sophia Lee',
    classId: 'cl1',
    className: 'Piano Mon AM',
    courseName: 'Piano Beginner',
    sessionDate: '2026-06-09',
    reason: 'Medical appointment.',
    status: 'TeacherCountered',
    needsReplacement: true,
    replacement: {
      teacherUserId: '2',
      teacherName: 'Sarah Chen',
      proposedDate: '2026-06-17',
      proposedStartTime: '10:00',
      proposedEndTime: '11:00',
      teacherResponse: 'Countered',
      teacherCounterDate: '2026-06-18',
      teacherCounterStartTime: '14:00',
      teacherCounterEndTime: '15:00',
      teacherMessage: 'Morning slot full — Thu afternoon works better.',
    },
    createdAt: '2026-06-05T08:00:00',
    updatedAt: '2026-06-07T16:00:00',
  },
  {
    id: 'lr4',
    studentUserId: '4',
    studentName: 'Emily Tan',
    classId: 'cl3',
    className: 'Piano Sat AM',
    courseName: 'Piano Beginner',
    sessionDate: '2026-06-06',
    reason: 'Competition rehearsal.',
    status: 'Confirmed',
    needsReplacement: true,
    adminNote: 'Replacement confirmed with teacher.',
    replacement: {
      teacherUserId: '2',
      teacherName: 'Sarah Chen',
      proposedDate: '2026-06-13',
      proposedStartTime: '09:00',
      proposedEndTime: '10:00',
      teacherResponse: 'Accepted',
      confirmedAt: '2026-06-07T10:00:00',
    },
    createdAt: '2026-06-01T12:00:00',
    updatedAt: '2026-06-07T10:00:00',
  },
];

function readAll(): LeaveRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LeaveRequest[];
  } catch {
    /* ignore */
  }
  return [...mockLeaveRequests];
}

function writeAll(requests: LeaveRequest[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

function touch(request: LeaveRequest): LeaveRequest {
  return { ...request, updatedAt: new Date().toISOString() };
}

function updateById(id: string, patch: Partial<LeaveRequest>): LeaveRequest | null {
  const all = readAll();
  const index = all.findIndex((r) => r.id === id);
  if (index < 0) return null;
  all[index] = touch({ ...all[index], ...patch });
  writeAll(all);
  return all[index];
}

export function ensureLeaveSeeded() {
  if (!localStorage.getItem(STORAGE_KEY)) {
    writeAll(mockLeaveRequests);
  }
}

export function loadLeaveRequests(): LeaveRequest[] {
  ensureLeaveSeeded();
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getLeaveRequestsForStudent(studentUserId: string): LeaveRequest[] {
  return loadLeaveRequests().filter((r) => r.studentUserId === studentUserId);
}

export function getReplacementRequestsForTeacher(teacherUserId: string): LeaveRequest[] {
  return loadLeaveRequests().filter(
    (r) =>
      r.replacement?.teacherUserId === teacherUserId &&
      ['AwaitingTeacher', 'TeacherCountered', 'Confirmed'].includes(r.status)
  );
}

export function submitLeaveRequest(input: {
  studentUserId: string;
  studentName: string;
  classId: string;
  className: string;
  courseName: string;
  sessionDate: string;
  reason: string;
}): LeaveRequest {
  const all = loadLeaveRequests();
  const created: LeaveRequest = {
    id: crypto.randomUUID(),
    ...input,
    status: 'Pending',
    needsReplacement: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeAll([created, ...all]);
  return created;
}

export function adminReviewLeave(
  id: string,
  decision: 'approve' | 'reject',
  options: { adminNote?: string; needsReplacement?: boolean }
): LeaveRequest | null {
  if (decision === 'reject') {
    return updateById(id, {
      status: 'Rejected',
      adminNote: options.adminNote,
      needsReplacement: false,
    });
  }
  const needsReplacement = Boolean(options.needsReplacement);
  return updateById(id, {
    status: needsReplacement ? 'ReplacementNeeded' : 'Approved',
    adminNote: options.adminNote,
    needsReplacement,
  });
}

export function adminProposeReplacement(
  id: string,
  slot: {
    teacherUserId: string;
    teacherName: string;
    proposedDate: string;
    proposedStartTime: string;
    proposedEndTime: string;
  }
): LeaveRequest | null {
  return updateById(id, {
    status: 'AwaitingTeacher',
    needsReplacement: true,
    replacement: {
      ...slot,
      teacherResponse: 'Pending',
    },
  });
}

export function teacherAcceptReplacement(id: string): LeaveRequest | null {
  const req = readAll().find((r) => r.id === id);
  if (!req?.replacement) return null;
  return updateById(id, {
    replacement: {
      ...req.replacement,
      teacherResponse: 'Accepted',
    },
  });
}

export function teacherCounterReplacement(
  id: string,
  counter: {
    teacherCounterDate: string;
    teacherCounterStartTime: string;
    teacherCounterEndTime: string;
    teacherMessage?: string;
  }
): LeaveRequest | null {
  const req = readAll().find((r) => r.id === id);
  if (!req?.replacement) return null;
  return updateById(id, {
    status: 'TeacherCountered',
    replacement: {
      ...req.replacement,
      teacherResponse: 'Countered',
      ...counter,
    },
  });
}

export function adminConfirmReplacement(id: string): LeaveRequest | null {
  const req = readAll().find((r) => r.id === id);
  if (!req?.replacement) return null;
  return updateById(id, {
    status: 'Confirmed',
    replacement: {
      ...req.replacement,
      confirmedAt: new Date().toISOString(),
    },
  });
}

export function leaveStatusLabel(status: LeaveRequestStatus): string {
  const labels: Record<LeaveRequestStatus, string> = {
    Pending: 'Pending review',
    Rejected: 'Rejected',
    Approved: 'Approved',
    ReplacementNeeded: 'Needs replacement',
    AwaitingTeacher: 'Awaiting teacher',
    TeacherCountered: 'Teacher suggested time',
    Confirmed: 'Replacement confirmed',
  };
  return labels[status];
}

export function formatSlotDate(date: string, start: string, end: string) {
  const d = new Date(`${date}T${start}`);
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const x = new Date();
    x.setHours(h, m, 0, 0);
    return x.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  return `${day} · ${fmt(start)} – ${fmt(end)}`;
}

export function workflowStep(status: LeaveRequestStatus): number {
  switch (status) {
    case 'Pending':
      return 2;
    case 'Rejected':
    case 'Approved':
      return 3;
    case 'ReplacementNeeded':
      return 4;
    case 'AwaitingTeacher':
      return 6;
    case 'TeacherCountered':
      return 7;
    case 'Confirmed':
      return 9;
    default:
      return 1;
  }
}
