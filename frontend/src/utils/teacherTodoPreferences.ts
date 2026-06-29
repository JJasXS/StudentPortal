const STORAGE_KEY = 'mtp_teacher_todo_prefs';

type TeacherTodoPrefs = Record<string, { enabled: boolean }>;

function loadAll(): TeacherTodoPrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TeacherTodoPrefs) : {};
  } catch {
    return {};
  }
}

function saveAll(prefs: TeacherTodoPrefs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function isTeacherTodoListEnabled(userId?: string): boolean {
  if (!userId) return true;
  const prefs = loadAll()[userId];
  return prefs?.enabled !== false;
}

export const TEACHER_TODO_PREF_UPDATED = 'mtp:teacher-todo-pref-updated';

export function setTeacherTodoListEnabled(userId: string, enabled: boolean): void {
  const all = loadAll();
  all[userId] = { enabled };
  saveAll(all);
  window.dispatchEvent(
    new CustomEvent(TEACHER_TODO_PREF_UPDATED, { detail: { userId, enabled } })
  );
}
