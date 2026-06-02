import { Link } from 'react-router-dom';
import { teacherAttendanceHubUrl } from '@/utils/attendanceLinks';
import { Calendar, Clock, ClipboardCheck, BookOpen } from 'lucide-react';
import { cn } from '@/utils/cn';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { ClassSession } from '@/types';

const statusAccent: Record<string, string> = {
  Scheduled: 'from-sky-500 to-blue-600',
  Completed: 'from-emerald-500 to-teal-600',
  Cancelled: 'from-slate-500 to-slate-600',
  Rescheduled: 'from-violet-500 to-purple-600',
};

function formatSessionDate(dateStr: string) {
  const d = new Date(`${dateStr.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString('en-MY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface TeacherSessionCardProps {
  session: ClassSession;
  className?: string;
}

export function TeacherSessionCard({ session, className }: TeacherSessionCardProps) {
  const accent = statusAccent[session.status] ?? 'from-primary-500 to-primary-700';

  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg',
        className
      )}
    >
      <div className={cn('relative h-24 bg-gradient-to-br p-4', accent)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-end">
          <p className="text-xs font-medium uppercase tracking-wider text-white/75">
            {formatSessionDate(session.sessionDate)}
          </p>
          <h3 className="text-lg font-semibold leading-tight text-white">
            {session.className ?? 'Class session'}
          </h3>
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-white/20 p-2 backdrop-blur-sm">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={session.status} />
        </div>

        {session.topic ? (
          <p className="text-sm font-medium text-slate-800">{session.topic}</p>
        ) : (
          <p className="text-sm italic text-slate-400">No topic set</p>
        )}

        {session.notes && (
          <p className="line-clamp-2 text-sm text-slate-600">{session.notes}</p>
        )}

        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            {session.sessionDate.slice(0, 10)}
          </li>
          <li className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-slate-400" />
            {session.startTime} – {session.endTime}
          </li>
        </ul>

        <div className="mt-auto flex gap-2 border-t border-slate-100 pt-3">
          <Link
            to={teacherAttendanceHubUrl()}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary-50 px-3 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
          >
            <ClipboardCheck className="h-4 w-4" />
            Check-in
          </Link>
          <Link
            to="/teacher/lesson-notes"
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <BookOpen className="h-4 w-4" />
            Notes
          </Link>
        </div>
      </div>
    </article>
  );
}
