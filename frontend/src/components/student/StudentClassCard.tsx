import { Calendar, CheckCircle2, Clock, MapPin, User } from 'lucide-react';
import { cn } from '@/utils/cn';

const categoryAccent: Record<string, string> = {
  Piano: 'from-violet-500 to-purple-600',
  Guitar: 'from-amber-500 to-orange-600',
  Violin: 'from-rose-500 to-pink-600',
  Vocal: 'from-sky-500 to-blue-600',
  Drums: 'from-emerald-500 to-teal-600',
};

export interface StudentClassCardData {
  id: string;
  className: string;
  courseName?: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  teacherName?: string;
  attendedCount?: number;
}

interface StudentClassCardProps {
  item: StudentClassCardData;
  className?: string;
}

export function StudentClassCard({ item, className }: StudentClassCardProps) {
  const category = item.courseName?.split(' ')[0] ?? 'Music';
  const accent = categoryAccent[category] ?? 'from-primary-500 to-primary-700';

  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      <div className={cn('relative h-24 bg-gradient-to-br p-4', accent)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.2),transparent_55%)]" />
        <p className="relative text-xs font-medium uppercase tracking-wide text-white/80">
          {item.courseName ?? 'Class'}
        </p>
        <h3 className="relative text-lg font-semibold leading-tight text-white">
          {item.className}
        </h3>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 text-sm text-slate-600">
        {item.teacherName && (
          <p className="inline-flex items-center gap-1.5 font-medium text-slate-800">
            <User className="h-4 w-4 text-slate-400" />
            {item.teacherName}
          </p>
        )}
        {item.dayOfWeek && (
          <p className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            {item.dayOfWeek}
          </p>
        )}
        {item.startTime && item.endTime && (
          <p className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-400" />
            {item.startTime} – {item.endTime}
          </p>
        )}
        {item.location && (
          <p className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-slate-400" />
            {item.location}
          </p>
        )}
        {item.attendedCount !== undefined && (
          <p className="mt-auto inline-flex items-center gap-1.5 border-t border-slate-100 pt-3 text-sm font-medium text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            {item.attendedCount} {item.attendedCount === 1 ? 'session' : 'sessions'} attended
          </p>
        )}
      </div>
    </article>
  );
}
