export interface TeacherTodo {
  id: string;
  userId: string;
  text: string;
  done: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'mtp_teacher_todos';

function loadAll(): TeacherTodo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TeacherTodo[]) : [];
  } catch {
    return [];
  }
}

function saveAll(todos: TeacherTodo[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

export function getTeacherTodos(userId: string): TeacherTodo[] {
  return loadAll()
    .filter((t) => t.userId === userId)
    .sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
}

export function addTeacherTodo(userId: string, text: string): TeacherTodo {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Todo text is required');

  const todo: TeacherTodo = {
    id: crypto.randomUUID(),
    userId,
    text: trimmed,
    done: false,
    createdAt: new Date().toISOString(),
  };

  const all = loadAll();
  all.push(todo);
  saveAll(all);
  return todo;
}

export function toggleTeacherTodo(userId: string, id: string): TeacherTodo | null {
  const all = loadAll();
  const index = all.findIndex((t) => t.id === id && t.userId === userId);
  if (index < 0) return null;

  all[index] = { ...all[index], done: !all[index].done };
  saveAll(all);
  return all[index];
}

export function deleteTeacherTodo(userId: string, id: string): void {
  saveAll(loadAll().filter((t) => !(t.id === id && t.userId === userId)));
}

export function clearCompletedTeacherTodos(userId: string): void {
  saveAll(loadAll().filter((t) => !(t.userId === userId && t.done)));
}
