import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ClassItem } from '@/types';

interface TeacherClassCardProps {
  classItem: ClassItem;
  className?: string;
}

export function TeacherClassCard({ classItem, className }: TeacherClassCardProps) {
  const enrolled = classItem.enrolledCount ?? 0;
  const max = classItem.maxStudents || 0;
  const isFull = max > 0 && enrolled >= max;
  const nearFull = max > 0 && !isFull && max - enrolled === 1;
  const pct = max > 0 ? Math.min(100, Math.round((enrolled / max) * 100)) : 0;
  const showCourse =
    Boolean(classItem.courseName) &&
    classItem.courseName!.trim().toLowerCase() !== classItem.className.trim().toLowerCase();

  return (
    <article
      className={cn(
        'flex min-h-[17.5rem] flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-slate-300 hover:shadow-md',
        className
      )}
    >
      <div className="border-b border-slate-100 px-4 pb-3 pt-4">
        {showCourse && (
          <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {classItem.courseName}
          </p>
        )}
        <h3
          className={cn(
            'line-clamp-3 text-[15px] font-semibold leading-snug text-slate-900',
            showCourse ? 'mt-1' : undefined
          )}
        >
          {classItem.className}
        </h3>
      </div>

      <div className="flex flex-1 flex-col gap-3 px-4 py-3">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              {enrolled}
              {max > 0 ? ` / ${max}` : ''}
            </span>
            {isFull && (
              <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Full
              </span>
            )}
            {nearFull && (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 ring-1 ring-amber-200">
                1 left
              </span>
            )}
          </div>
          {max > 0 && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn('h-full rounded-full', isFull ? 'bg-slate-600' : 'bg-primary-500')}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>

        <ul className="space-y-1.5 text-xs text-slate-600">
          <li className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {classItem.dayOfWeek}
          </li>
          <li className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            {classItem.startTime} – {classItem.endTime}
          </li>
          {classItem.location && classItem.location !== '—' && (
            <li className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="truncate">{classItem.location}</span>
            </li>
          )}
        </ul>

        <div className="mt-auto pt-2">
          <Link
            to={`/teacher/classes/${encodeURIComponent(classItem.id)}`}
            className="block rounded-lg bg-primary-600 px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            Open class
          </Link>
        </div>
      </div>
    </article>
  );
}
