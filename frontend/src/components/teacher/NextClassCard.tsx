import { Link } from 'react-router-dom';
import { Clock, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  formatStartsIn,
  isInProgressToday,
  type TodayClassItem,
} from '@/utils/teacherSchedule';
import { cn } from '@/utils/cn';

interface NextClassCardProps {
  item: TodayClassItem | null;
  loading?: boolean;
}

const shell =
  'flex h-full min-h-[16.5rem] flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm';

export function NextClassCard({ item, loading }: NextClassCardProps) {
  if (loading) {
    return (
      <div className={shell}>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Next class</p>
        <p className="mt-4 text-sm text-slate-500">Loading…</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className={cn(shell, 'border-dashed bg-slate-50/50')}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next class</p>
        <div className="flex flex-1 flex-col justify-center">
          <p className="text-sm font-medium text-slate-700">Nothing left today</p>
          <p className="mt-1 text-sm text-slate-500">You&apos;re clear for the rest of the day.</p>
          <Link
            to="/teacher/calendar"
            className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            View schedule
          </Link>
        </div>
      </div>
    );
  }

  const inProgress = isInProgressToday(item.startTime, item.endTime);
  const showCourse =
    Boolean(item.courseName) &&
    item.courseName!.trim().toLowerCase() !== item.className.trim().toLowerCase();

  return (
    <div className={cn(shell, 'border-primary-100 bg-gradient-to-br from-primary-50/70 to-white')}>
      <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Next class</p>
      <h3 className="mt-3 text-lg font-semibold leading-snug text-slate-900">{item.className}</h3>
      {showCourse && <p className="mt-1 text-sm text-slate-500">{item.courseName}</p>}
      <p className="mt-3 text-sm font-medium text-primary-700">
        {inProgress ? 'In Progress' : formatStartsIn(item.startTime)}
      </p>
      <ul className="mt-4 space-y-1.5 text-sm text-slate-600">
        <li className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-slate-400" />
          {item.startTime} – {item.endTime}
        </li>
        {item.location && item.location !== '—' && (
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            {item.location}
          </li>
        )}
        {item.enrolledCount != null && (
          <li className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-slate-400" />
            {item.enrolledCount} student{item.enrolledCount === 1 ? '' : 's'}
          </li>
        )}
      </ul>
      <div className="mt-auto pt-5">
        <Link to={`/teacher/classes/${encodeURIComponent(item.classId)}`}>
          <Button className="w-full sm:w-auto">Open class</Button>
        </Link>
      </div>
    </div>
  );
}
