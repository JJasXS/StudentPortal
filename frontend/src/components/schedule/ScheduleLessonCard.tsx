import { cn } from '@/utils/cn';

export interface ScheduleLessonItem {
  id: string;
  sessionDate: string;
  startTime: string;
  endTime?: string;
  title: string;
  teacherName?: string;
  courseLabel?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';
  isMakeup?: boolean;
}

const STATUS_STYLES: Record<ScheduleLessonItem['status'], string> = {
  Scheduled: 'bg-orange-500 text-white',
  Completed: 'bg-emerald-500 text-white',
  Cancelled: 'bg-slate-400 text-white',
  Rescheduled: 'bg-sky-500 text-white',
};

function parseDateParts(isoDate: string) {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  return {
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
    day: d.getDate().toString().padStart(2, '0'),
    month: d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
  };
}

interface ScheduleLessonCardProps {
  item: ScheduleLessonItem;
  className?: string;
}

export function ScheduleLessonCard({ item, className }: ScheduleLessonCardProps) {
  const { weekday, day, month } = parseDateParts(item.sessionDate);
  const displayStatus =
    item.isMakeup && item.status !== 'Cancelled' ? 'Scheduled' : item.status;

  return (
    <article
      className={cn(
        'relative flex overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(15,23,42,0.08)]',
        className
      )}
    >
      <div className="flex w-[4.25rem] shrink-0 flex-col items-center justify-center border-r border-slate-100 py-5 text-center">
        <span className="text-[11px] font-medium tracking-wide text-slate-400">{weekday}</span>
        <span className="text-[1.75rem] font-bold leading-none text-[#9B6B4F]">{day}</span>
        <span className="mt-0.5 text-[11px] font-bold text-[#9B6B4F]">{month}</span>
      </div>

      <div className="min-w-0 flex-1 px-4 py-3.5">
        <span
          className={cn(
            'inline-block rounded-full px-3 py-0.5 text-[11px] font-semibold',
            STATUS_STYLES[displayStatus]
          )}
        >
          {displayStatus}
        </span>
        <h3 className="mt-2.5 text-[15px] font-bold leading-snug text-slate-900">{item.title}</h3>
        {item.teacherName && (
          <p className="mt-1 text-sm text-slate-500">{item.teacherName}</p>
        )}
        {item.courseLabel && (
          <p className="mt-0.5 text-sm text-slate-500">{item.courseLabel}</p>
        )}
      </div>

      {item.isMakeup && (
        <div className="flex w-9 shrink-0 items-center justify-center bg-emerald-600 text-[10px] font-bold uppercase tracking-wider text-white [writing-mode:vertical-rl]">
          Make-up
        </div>
      )}
    </article>
  );
}
