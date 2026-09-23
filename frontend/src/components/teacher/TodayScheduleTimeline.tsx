import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonListRows } from '@/components/ui/Skeleton';
import { cn } from '@/utils/cn';
import {
  scheduleStatusLabel,
  type ScheduleStatusLabel,
  type TodayClassItem,
} from '@/utils/teacherSchedule';

interface TodayScheduleTimelineProps {
  items: TodayClassItem[];
  loading?: boolean;
}

const STATUS_STYLES: Record<ScheduleStatusLabel, string> = {
  'Up Next': 'bg-sky-100 text-sky-800',
  'In Progress': 'bg-primary-600 text-white',
  Completed: 'bg-slate-100 text-slate-600',
  Cancelled: 'bg-red-100 text-red-700',
  Scheduled: 'bg-emerald-50 text-emerald-800',
};

function formatTimeLabel(time: string) {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h)) return time;
  const d = new Date();
  d.setHours(h, m || 0, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function TodayScheduleTimeline({ items, loading }: TodayScheduleTimelineProps) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Today&apos;s schedule</h2>
        {!loading && items.length > 0 && (
          <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
            {items.length} class{items.length === 1 ? '' : 'es'}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="p-4">
            <SkeletonListRows rows={3} />
          </div>
        ) : items.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={CalendarDays}
              title="No sessions today"
              description="You have no classes scheduled for today."
              compact
              actions={[
                { label: 'Open calendar', href: '/teacher/calendar' },
                { label: 'My classes', href: '/teacher/classes', variant: 'outline' },
              ]}
            />
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const status = scheduleStatusLabel(item);
              return (
                <li
                  key={item.id}
                  className={cn(
                    'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4',
                    status === 'In Progress' && 'bg-primary-50/40'
                  )}
                >
                  <div className="w-20 shrink-0 sm:text-right">
                    <p className="text-sm font-semibold tabular-nums text-slate-900">
                      {formatTimeLabel(item.startTime)}
                    </p>
                  </div>
                  <div className="hidden h-10 w-px shrink-0 bg-slate-200 sm:block" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{item.className}</h3>
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold sm:text-xs',
                          STATUS_STYLES[status]
                        )}
                      >
                        {status}
                      </span>
                    </div>
                    {item.courseName && (
                      <p className="mt-0.5 text-sm text-slate-500">{item.courseName}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {item.startTime} – {item.endTime}
                      </span>
                      {item.location && item.location !== '—' && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {item.location}
                        </span>
                      )}
                      {item.enrolledCount != null && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-slate-400" />
                          {item.enrolledCount} student{item.enrolledCount === 1 ? '' : 's'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 sm:pl-2">
                    <Link
                      to={`/teacher/classes/${encodeURIComponent(item.classId)}`}
                      className="inline-flex h-9 w-full items-center justify-center rounded-lg bg-primary-600 px-3.5 text-sm font-medium text-white hover:bg-primary-700 sm:w-auto"
                    >
                      Open class
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
