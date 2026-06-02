import type { SkillTrendPoint, WeeklyAttendancePoint } from '@/types/progress';

const tooltipShell =
  'rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-lg';

type ChartTooltipProps = {
  active?: boolean;
  payload?: { payload?: unknown }[];
  label?: string;
};

export function WeeklyAttendanceTooltip({
  active,
  payload,
  label,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const week = payload[0]?.payload as WeeklyAttendancePoint | undefined;
  if (!week) return null;

  const total = week.present + week.absent + week.late + week.excused;
  const rows = [
    { label: 'Present', value: week.present, className: 'text-emerald-600' },
    { label: 'Late', value: week.late, className: 'text-amber-600' },
    { label: 'Excused', value: week.excused, className: 'text-slate-600' },
    { label: 'Absent', value: week.absent, className: 'text-red-500' },
  ];

  return (
    <div className={tooltipShell}>
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="text-xs text-slate-500">{total} attendance record{total === 1 ? '' : 's'}</p>
      <ul className="mt-2 space-y-0.5">
        {rows.map((r) => (
          <li key={r.label} className={`flex justify-between gap-6 ${r.className}`}>
            <span>{r.label}</span>
            <span className="font-medium">{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SkillTrendTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as SkillTrendPoint | undefined;
  if (!point) return null;

  return (
    <div className={tooltipShell}>
      <p className="font-semibold text-slate-900">{point.month}</p>
      <p className="mt-1 text-primary-700">
        Avg skill: <span className="font-semibold">{point.avgScore}/100</span>
      </p>
      <p className="mt-1 text-xs text-slate-500">Class average for this month</p>
    </div>
  );
}

export function StudentSkillTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload as { name: string; score: number } | undefined;
  if (!row) return null;

  return (
    <div className={tooltipShell}>
      <p className="font-semibold text-slate-900">{row.name}</p>
      <p className="mt-1 text-primary-700">
        Skill score: <span className="font-semibold">{row.score}/100</span>
      </p>
    </div>
  );
}
