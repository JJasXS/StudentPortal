import { SESSION_STATUSES } from '@/utils/constants';
import { isErpEventForTeacher } from '@/utils/erpCalendar';
import { mockClasses, mockClassSessions } from '@/utils/mockData';
import type { ClassItem, ClassSession, User } from '@/types';
import type { ErpCalendarEvent } from '@/types/sqlAccount';

const SESSION_STATUS_SET = new Set<string>(SESSION_STATUSES);

export function normalizeClassSession(session: ClassSession): ClassSession {
  const raw = session as ClassSession & { Status?: string };
  let status = (session.status ?? raw.Status ?? 'Scheduled').trim();
  if (!SESSION_STATUS_SET.has(status)) {
    const match = SESSION_STATUSES.find(
      (s) => s.toLowerCase() === status.toLowerCase()
    );
    status = match ?? 'Scheduled';
  }
  return { ...session, status: status as ClassSession['status'] };
}

const DEMO_TEACHER_MOCK_ID: Record<string, string> = {
  'sarah.chen@demo.com': '2',
  'david.wong@demo.com': '3',
};

/** Mock data uses short ids; API login may return a GUID for the same demo teacher. */
export function mockTeacherUserId(user: Pick<User, 'id' | 'email'>): string {
  return DEMO_TEACHER_MOCK_ID[user.email] ?? user.id;
}

export function mockClassesForTeacher(user: Pick<User, 'id' | 'email'>): ClassItem[] {
  const key = mockTeacherUserId(user);
  return mockClasses.filter((c) => c.teacherUserId === key);
}

export type TeacherUserRef = Pick<User, 'id' | 'email' | 'fullName'>;

export function mergeTeacherClasses(
  apiClasses: ClassItem[],
  user: TeacherUserRef
): ClassItem[] {
  const key = mockTeacherUserId(user);
  const name = user.fullName?.trim().toLowerCase();
  const fromApi = apiClasses.filter(
    (c) =>
      c.teacherUserId === user.id ||
      c.teacherUserId === key ||
      (name != null && name.length > 0 && c.teacherName?.trim().toLowerCase() === name)
  );
  const fromMock = mockClassesForTeacher(user);
  if (fromApi.length >= fromMock.length) return fromApi;
  return fromMock;
}

/** Stable id for ERP teaching groups that are not linked to a portal class row. */
export function erpTeacherClassId(className: string): string {
  return `name:${className.trim()}`;
}

export function parseErpTeacherClassName(classId: string): string | null {
  if (!classId.startsWith('name:')) return null;
  const raw = classId.slice(5);
  try {
    // Tolerate once- or twice-encoded legacy links.
    let decoded = raw;
    for (let i = 0; i < 2; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
    return decoded.trim() || null;
  } catch {
    return raw.trim() || null;
  }
}

/** Normalize route param / stored id so name:… ids compare equal. */
export function normalizeTeacherClassId(classId: string): string {
  const name = parseErpTeacherClassName(classId);
  if (name) return erpTeacherClassId(name);
  try {
    return decodeURIComponent(classId);
  } catch {
    return classId;
  }
}

function mostCommon(values: string[]): string {
  if (values.length === 0) return '';
  const counts = new Map<string, number>();
  for (const v of values) {
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best = values[0];
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function weekdayLabel(isoDate: string): string {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Portal Classes are sparse; the schedule is driven by ERP occurrences.
 * Build the teacher's class list from both so My Classes matches the calendar.
 */
export function buildTeacherClassList(
  portalClasses: ClassItem[],
  erpEvents: ErpCalendarEvent[],
  user: TeacherUserRef
): ClassItem[] {
  const fromPortal = mergeTeacherClasses(portalClasses, user);
  const byName = new Map(
    fromPortal.map((c) => [c.className.trim().toLowerCase(), c] as const)
  );
  const byId = new Map(fromPortal.map((c) => [c.id, c] as const));

  type Acc = {
    className: string;
    courseName?: string | null;
    classId?: string | null;
    courseId?: string | null;
    teacherName?: string | null;
    teacherUserId?: string | null;
    days: string[];
    starts: string[];
    ends: string[];
    students: Set<string>;
  };

  const groups = new Map<string, Acc>();

  for (const event of erpEvents) {
    if (!isErpEventForTeacher(event, user)) continue;
    if (event.status === 'Cancelled') continue;

    const nameKey = event.className.trim().toLowerCase();
    if (!nameKey) continue;

    if (event.classId && byId.has(event.classId)) continue;
    if (byName.has(nameKey)) continue;

    const groupKey = event.classId?.trim() || nameKey;
    let acc = groups.get(groupKey);
    if (!acc) {
      acc = {
        className: event.className.trim(),
        courseName: event.courseName,
        classId: event.classId,
        courseId: event.courseId,
        teacherName: event.teacherName,
        teacherUserId: event.teacherUserId,
        days: [],
        starts: [],
        ends: [],
        students: new Set(),
      };
      groups.set(groupKey, acc);
    }

    if (event.sessionDate) acc.days.push(weekdayLabel(event.sessionDate));
    if (event.startTime) acc.starts.push(event.startTime.slice(0, 5));
    if (event.endTime) acc.ends.push(event.endTime.slice(0, 5));
    if (event.studentName?.trim()) acc.students.add(event.studentName.trim().toLowerCase());
    if (!acc.courseName && event.courseName) acc.courseName = event.courseName;
  }

  const fromErp: ClassItem[] = [...groups.values()].map((acc) => {
    const enrolled = acc.students.size;
    return {
      id: acc.classId?.trim() || erpTeacherClassId(acc.className),
      courseId: acc.courseId?.trim() || '',
      courseName: acc.courseName?.trim() || acc.className,
      teacherUserId: acc.teacherUserId?.trim() || user.id,
      teacherName: acc.teacherName?.trim() || user.fullName,
      className: acc.className,
      dayOfWeek: mostCommon(acc.days) || '—',
      startTime: mostCommon(acc.starts) || '—',
      endTime: mostCommon(acc.ends) || '—',
      maxStudents: Math.max(8, enrolled),
      enrolledCount: enrolled,
      location: '—',
      isActive: true,
    };
  });

  return [...fromPortal, ...fromErp].sort((a, b) =>
    a.className.localeCompare(b.className, undefined, { sensitivity: 'base' })
  );
}

export function mergeClassSessions(apiSessions: ClassSession[], classId: string): ClassSession[] {
  const fromMock = mockClassSessions.filter((s) => s.classId === classId).map(normalizeClassSession);
  const fromApi = apiSessions
    .filter((s) => s.classId === classId)
    .map(normalizeClassSession);
  if (fromApi.length >= fromMock.length) return fromApi;
  return fromMock;
}

export function findTeacherClass(
  classes: ClassItem[],
  classId: string,
  user: TeacherUserRef
): ClassItem | null {
  const merged = mergeTeacherClasses(classes, user);
  return merged.find((c) => c.id === classId) ?? null;
}

/** Distinct student names from ERP calendar for a teacher class (portal or name: id). */
export function erpStudentsForClass(
  erpEvents: ErpCalendarEvent[],
  classItem: Pick<ClassItem, 'id' | 'className'>,
  user: TeacherUserRef
): { id: string; name: string }[] {
  const wantedName = classItem.className.trim().toLowerCase();
  const wantedId = normalizeTeacherClassId(classItem.id);
  const names = new Map<string, string>();

  for (const event of erpEvents) {
    if (!isErpEventForTeacher(event, user)) continue;
    if (event.status === 'Cancelled') continue;
    const eventName = event.className?.trim().toLowerCase() ?? '';
    const eventClassId = event.classId?.trim()
      ? normalizeTeacherClassId(event.classId)
      : null;
    const matches =
      (eventName && eventName === wantedName) ||
      (eventClassId != null && eventClassId === wantedId);
    if (!matches) continue;
    const name = event.studentName?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!names.has(key)) names.set(key, name);
  }

  return [...names.entries()]
    .sort((a, b) => a[1].localeCompare(b[1], undefined, { sensitivity: 'base' }))
    .map(([key, name]) => ({ id: `erp:${key}`, name }));
}
