import { useEffect, useRef, useState } from 'react';
import { ListTodo } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import {
  isTeacherTodoListEnabled,
  setTeacherTodoListEnabled,
  TEACHER_TODO_PREF_UPDATED,
} from '@/utils/teacherTodoPreferences';
import { cn } from '@/utils/cn';

export function TeacherTodoToggleBubble() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(() => isTeacherTodoListEnabled(user?.id));
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setEnabled(isTeacherTodoListEnabled(user?.id));
  }, [user?.id]);

  useEffect(() => {
    const onPrefUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (!detail?.userId || detail.userId === user?.id) {
        setEnabled(isTeacherTodoListEnabled(user?.id));
      }
    };
    window.addEventListener(TEACHER_TODO_PREF_UPDATED, onPrefUpdate);
    return () => window.removeEventListener(TEACHER_TODO_PREF_UPDATED, onPrefUpdate);
  }, [user?.id]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (user?.role !== 'Teacher') return null;

  const handleToggle = (checked: boolean) => {
    if (!user?.id) return;
    setTeacherTodoListEnabled(user.id, checked);
    setEnabled(checked);
  };

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-label="To-do list settings"
        aria-expanded={open}
        className={cn(
          'relative h-9 w-9 rounded-full p-0',
          enabled ? 'bg-primary-50 text-primary-700 hover:bg-primary-100' : 'text-slate-500'
        )}
      >
        <ListTodo className="h-4 w-4" />
        {enabled && (
          <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-white bg-emerald-500" />
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">To-do list</p>
            <p className="mt-0.5 text-xs text-slate-500">Show or hide on your dashboard</p>
          </div>
          <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-slate-50">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => handleToggle(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-slate-900">Show on dashboard</span>
              <span className="mt-0.5 block text-xs text-slate-500">
                Personal tasks for lesson prep and follow-ups.
              </span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
