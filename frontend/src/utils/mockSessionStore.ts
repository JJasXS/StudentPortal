import { mockAnnouncements, mockClassSessions } from '@/utils/mockData';
import { collectHolidayDates, generateSessionsForClasses } from '@/utils/sessionGeneration';
import type { ClassItem, ClassSession } from '@/types';

const STORAGE_KEY = 'mtp_generated_sessions';

function loadExtra(): ClassSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ClassSession[]) : [];
  } catch {
    return [];
  }
}

function saveExtra(sessions: ClassSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function loadAllSessions(): ClassSession[] {
  const extra = loadExtra();
  const byId = new Map<string, ClassSession>();
  for (const s of [...mockClassSessions, ...extra]) {
    byId.set(s.id, s);
  }
  return [...byId.values()];
}

export function generateMockSessions(
  classes: ClassItem[],
  fromDate: string,
  toDate: string,
  classId?: string
) {
  const existing = loadAllSessions();
  const targetClasses = classId ? classes.filter((c) => c.id === classId) : classes;
  const holidays = collectHolidayDates(mockAnnouncements);
  const { sessions: created, createdCount, skippedCount } = generateSessionsForClasses(
    targetClasses,
    fromDate,
    toDate,
    existing,
    holidays
  );

  if (created.length > 0) {
    saveExtra([...loadExtra(), ...created]);
  }

  return {
    createdCount,
    skippedCount,
    sessions: loadAllSessions(),
  };
}

/** Append a single ad-hoc session to the mock store (used for non-repeat assignment). */
export function addMockSession(session: ClassSession) {
  saveExtra([...loadExtra(), session]);
}

/** Seed demo sessions for admin calendar (prev, current, next month). */
export function seedAdminCalendarSessions(classes: ClassItem[]) {
  const active = classes.filter((c) => c.isActive);
  const now = new Date();

  for (const monthOffset of [-1, 0, 1]) {
    const anchor = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
    const year = anchor.getFullYear();
    const month = anchor.getMonth();
    const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const to = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    generateMockSessions(active, from, to);
  }
}

export function getOrCreateMockTodaySession(classItem: ClassItem): ClassSession {
  const today = new Date();
  const dateKey = today.toISOString().slice(0, 10);
  const all = loadAllSessions();
  const existing = all.find(
    (s) => s.classId === classItem.id && s.sessionDate.slice(0, 10) === dateKey
  );
  if (existing) return existing;

  const created: ClassSession = {
    id: crypto.randomUUID(),
    classId: classItem.id,
    className: classItem.className,
    sessionDate: dateKey,
    startTime: classItem.startTime,
    endTime: classItem.endTime,
    status: 'Scheduled',
  };
  saveExtra([...loadExtra(), created]);
  return created;
}
