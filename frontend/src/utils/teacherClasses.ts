import { SESSION_STATUSES } from '@/utils/constants';
import { mockClasses, mockClassSessions } from '@/utils/mockData';
import type { ClassItem, ClassSession, User } from '@/types';

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

export function mergeTeacherClasses(apiClasses: ClassItem[], user: Pick<User, 'id' | 'email'>): ClassItem[] {
  const key = mockTeacherUserId(user);
  const fromApi = apiClasses.filter(
    (c) => c.teacherUserId === user.id || c.teacherUserId === key
  );
  const fromMock = mockClassesForTeacher(user);
  if (fromApi.length >= fromMock.length) return fromApi;
  return fromMock;
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
  user: Pick<User, 'id' | 'email'>
): ClassItem | null {
  const merged = mergeTeacherClasses(classes, user);
  return merged.find((c) => c.id === classId) ?? null;
}
