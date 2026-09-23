import { cn } from '@/utils/cn';

interface WeekOverviewStripProps {
  days: { label: string; count: number; isToday: boolean }[];
  loading?: boolean;
}

export function WeekOverviewStrip({ days, loading }: WeekOverviewStripProps) {
  return (
    <section>
      <h2 className="text-base font-semibold text-slate-900 sm:text-lg">This week</h2>
      <div className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((day) => (
          <div
            key={day.label}
            className={cn(
              'rounded-lg border px-1 py-2.5 text-center sm:px-2 sm:py-3',
              day.isToday
                ? 'border-primary-200 bg-primary-50'
                : 'border-slate-200/80 bg-white'
            )}
          >
            <p
              className={cn(
                'text-[10px] font-medium uppercase tracking-wide sm:text-xs',
                day.isToday ? 'text-primary-700' : 'text-slate-500'
              )}
            >
              {day.label}
            </p>
            <p
              className={cn(
                'mt-1 text-base font-semibold tabular-nums sm:text-lg',
                day.isToday ? 'text-primary-800' : 'text-slate-900'
              )}
            >
              {loading ? '—' : day.count}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
