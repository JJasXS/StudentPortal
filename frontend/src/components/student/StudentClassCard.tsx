import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { cn } from '@/utils/cn';
import { enrollmentClassKey, enrollmentDisplay } from '@/utils/studentLearning';
import type { SqlAccountChildEnrollment } from '@/types/sqlAccount';

interface StudentClassCardProps {
  enrollment: SqlAccountChildEnrollment;
  className?: string;
}

export function StudentClassCard({ enrollment, className }: StudentClassCardProps) {
  const d = enrollmentDisplay(enrollment);
  const key = enrollmentClassKey(enrollment);

  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-slate-200 border-l-4 border-l-primary-400 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md',
        className
      )}
    >
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3.5">
        <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {d.eyebrow}
        </p>
        <h3 className="mt-1 line-clamp-2 text-base font-semibold leading-snug text-slate-900">
          {d.title}
        </h3>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <ul className="space-y-1.5 text-sm text-slate-600">
          {d.teacher && (
            <li className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              Teacher: {d.teacher}
            </li>
          )}
          {d.day && (
            <li className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {d.day}
            </li>
          )}
          {d.time && (
            <li className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {d.time}
            </li>
          )}
          {d.room && (
            <li className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {d.room}
            </li>
          )}
        </ul>

        <div className="mt-auto border-t border-slate-100 pt-3">
          <Link
            to={`/student/classes/${encodeURIComponent(key)}`}
            className="block rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-center text-sm font-medium text-primary-700 transition-colors hover:border-primary-200 hover:bg-primary-50"
          >
            Open class
          </Link>
        </div>
      </div>
    </article>
  );
}
