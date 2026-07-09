import { cn } from '@/utils/cn';

export interface ScheduleLessonItem {
  id: string;
  sessionDate: string;
  startTime: string;
  endTime?: string;
  title: string;
  className?: string;
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

function formatTimeShort(time: string) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

interface ScheduleLessonCardProps {
  item: ScheduleLessonItem;
  className?: string;
}

export function ScheduleLessonCard({ item, className }: ScheduleLessonCardProps) {
  const { weekday, day, month } = parseDateParts(item.sessionDate);
  const displayStatus =
    item.isMakeup && item.status !== 'Cancelled' ? 'Scheduled' : item.status;
  const classLabel = item.className ?? item.title;
  const timeLabel = formatTimeShort(item.startTime);

  return (
    <article
      className={cn(
        'relative flex min-w-0 overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(15,23,42,0.08)]',
        className
      )}
    >
      <div className="flex w-16 shrink-0 flex-col items-center justify-center border-r border-slate-100 py-4 text-center sm:w-[4.25rem] sm:py-5">
        <span className="text-[10px] font-medium tracking-wide text-slate-400 sm:text-[11px]">{weekday}</span>
        <span className="text-2xl font-bold leading-none text-[#9B6B4F] sm:text-[1.75rem]">{day}</span>
        <span className="mt-0.5 text-[10px] font-bold text-[#9B6B4F] sm:text-[11px]">{month}</span>
      </div>

      <div className="min-w-0 flex-1 px-3 py-3 sm:px-4 sm:py-3.5">
        <span
          className={cn(
            'inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold sm:px-3 sm:text-[11px]',
            STATUS_STYLES[displayStatus]
          )}
        >
          {displayStatus}
        </span>
        <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-slate-900 sm:mt-2.5 sm:text-[15px]">
          {classLabel} | {timeLabel}
        </h3>
        {item.teacherName && (
          <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">{item.teacherName}</p>
        )}
      </div>

      {item.isMakeup && (
        <div className="flex w-8 shrink-0 items-center justify-center bg-emerald-600 text-[9px] font-bold uppercase tracking-wider text-white [writing-mode:vertical-rl] sm:w-9 sm:text-[10px]">
          Make-up
        </div>
      )}
    </article>
  );
}
