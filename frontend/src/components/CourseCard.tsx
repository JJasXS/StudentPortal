import { Clock, Music2, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { activeRecordStatus } from '@/utils/statusFilter';
import type { Course } from '@/types';

const categoryAccent: Record<string, string> = {
  Piano: 'from-violet-500 to-purple-600',
  Guitar: 'from-amber-500 to-orange-600',
  Violin: 'from-rose-500 to-pink-600',
  Vocal: 'from-sky-500 to-blue-600',
  Drums: 'from-emerald-500 to-teal-600',
};

interface CourseCardProps {
  course: Course;
  className?: string;
  onEdit?: (course: Course) => void;
  onDelete?: (course: Course) => void;
}

export function CourseCard({ course, className, onEdit, onDelete }: CourseCardProps) {
  const accent = categoryAccent[course.category] ?? 'from-primary-500 to-primary-700';
  const status = activeRecordStatus(course.isActive);

  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      <div className={cn('relative flex h-28 items-end bg-gradient-to-br p-4', accent)}>
        <div className="absolute right-3 top-3 rounded-full bg-white/20 p-2 backdrop-blur-sm">
          <Music2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-white/80">{course.category}</p>
          <h3 className="text-lg font-semibold leading-tight text-white">{course.courseName}</h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {course.description && (
          <p className="line-clamp-2 flex-1 text-sm text-slate-600">{course.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={course.level} />
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            <Clock className="h-3 w-3" />
            {course.defaultDurationMinutes} min
          </span>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <StatusBadge status={status} />
          {(onEdit || onDelete) && (
            <div className="flex gap-1">
              {onEdit && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(course)}
                  aria-label={`Edit ${course.courseName}`}
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
              {onDelete && course.isActive && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(course)}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  aria-label={`Deactivate ${course.courseName}`}
                  title="Deactivate"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
