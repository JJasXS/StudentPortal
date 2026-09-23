import { BookOpen, CalendarDays, Bell, Users } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface DashboardSummaryStats {
  todayCount: number;
  todayHint: string;
  studentCount: number;
  upcomingCount: number;
  attentionCount: number;
}

interface DashboardSummaryCardsProps {
  stats: DashboardSummaryStats;
  loading?: boolean;
}

const CARDS = [
  {
    key: 'today',
    label: "Today's Classes",
    icon: BookOpen,
    iconBg: 'bg-primary-50 text-primary-700',
    value: (s: DashboardSummaryStats) => s.todayCount,
    hint: (s: DashboardSummaryStats) => s.todayHint,
  },
  {
    key: 'students',
    label: 'My Students',
    icon: Users,
    iconBg: 'bg-violet-50 text-violet-700',
    value: (s: DashboardSummaryStats) => s.studentCount,
    hint: () => 'Across your classes',
  },
  {
    key: 'upcoming',
    label: 'Upcoming',
    icon: CalendarDays,
    iconBg: 'bg-sky-50 text-sky-700',
    value: (s: DashboardSummaryStats) => s.upcomingCount,
    hint: () => 'Next 7 days',
  },
  {
    key: 'attention',
    label: 'Attention',
    icon: Bell,
    iconBg: 'bg-amber-50 text-amber-700',
    value: (s: DashboardSummaryStats) => s.attentionCount,
    hint: () => 'Items pending',
  },
] as const;

export function DashboardSummaryCards({ stats, loading }: DashboardSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {CARDS.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.key}
            className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm sm:p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-slate-500 sm:text-sm">{card.label}</p>
              <span
                className={cn(
                  'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  card.iconBg
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
              {loading ? '—' : card.value(stats)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">{loading ? '…' : card.hint(stats)}</p>
          </div>
        );
      })}
    </div>
  );
}
