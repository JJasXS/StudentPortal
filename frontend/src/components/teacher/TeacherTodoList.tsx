import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ListTodo, Plus, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  addTeacherTodo,
  clearCompletedTeacherTodos,
  deleteTeacherTodo,
  getTeacherTodos,
  toggleTeacherTodo,
  type TeacherTodo,
} from '@/utils/teacherTodos';
import { cn } from '@/utils/cn';

interface TeacherTodoListProps {
  userId?: string;
  className?: string;
}

export function TeacherTodoList({ userId, className }: TeacherTodoListProps) {
  const [todos, setTodos] = useState<TeacherTodo[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    if (!userId) {
      setTodos([]);
      return;
    }
    setTodos(getTeacherTodos(userId));
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (adding) {
      inputRef.current?.focus();
    }
  }, [adding]);

  const pending = useMemo(() => todos.filter((t) => !t.done), [todos]);
  const completed = useMemo(() => todos.filter((t) => t.done), [todos]);

  const closeAdd = () => {
    setAdding(false);
    setDraft('');
  };

  const handleAdd = () => {
    if (!userId) return;
    const value = draft.trim();
    if (!value) {
      closeAdd();
      return;
    }

    addTeacherTodo(userId, value);
    setDraft('');
    refresh();
    inputRef.current?.focus();
  };

  const handleToggle = (id: string) => {
    if (!userId) return;
    toggleTeacherTodo(userId, id);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (!userId) return;
    deleteTeacherTodo(userId, id);
    refresh();
  };

  const handleClearCompleted = () => {
    if (!userId || completed.length === 0) return;
    clearCompletedTeacherTodos(userId);
    refresh();
  };

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListTodo className="h-4 w-4 text-primary-600" />
            To-do list
          </CardTitle>
          <p className="mt-1 text-sm font-normal text-slate-500">
            {pending.length === 0
              ? 'Nothing pending'
              : `${pending.length} task${pending.length === 1 ? '' : 's'} remaining`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {completed.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={handleClearCompleted}>
              Clear done
            </Button>
          )}
          <Button
            type="button"
            variant={adding ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => (adding ? closeAdd() : setAdding(true))}
            aria-label={adding ? 'Cancel new task' : 'Add task'}
            className="h-8 w-8 shrink-0 p-0"
          >
            {adding ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {adding && (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleAdd();
            }}
          >
            <Input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') closeAdd();
              }}
              placeholder="What do you need to do?"
              aria-label="New task"
            />
          </form>
        )}

        {todos.length === 0 && !adding ? (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500 transition hover:border-primary-200 hover:bg-primary-50/50 hover:text-primary-700"
          >
            <Plus className="h-4 w-4" />
            Add a task
          </button>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className={cn(
                  'flex items-start gap-3 px-3 py-2.5',
                  todo.done && 'bg-slate-50/80'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(todo.id)}
                  aria-label={todo.done ? 'Mark as not done' : 'Mark as done'}
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition',
                    todo.done
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-slate-300 bg-white hover:border-primary-400'
                  )}
                >
                  {todo.done && <Check className="h-3 w-3" strokeWidth={3} />}
                </button>
                <span
                  className={cn(
                    'min-w-0 flex-1 text-sm leading-snug',
                    todo.done ? 'text-slate-400 line-through' : 'text-slate-800'
                  )}
                >
                  {todo.text}
                </span>
                <button
                  type="button"
                  onClick={() => handleDelete(todo.id)}
                  aria-label="Delete task"
                  className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {todos.length > 0 && !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-primary-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add task
          </button>
        )}

        {adding && (
          <p className="text-xs text-slate-400">Press Enter to add · Esc to cancel</p>
        )}
      </CardContent>
    </Card>
  );
}
