import { cn } from '@/utils/cn';

interface StatusTabsProps {
  statuses: readonly string[];
  value: string;
  onChange: (value: string) => void;
  includeAll?: boolean;
  counts?: Record<string, number>;
  className?: string;
}

export function StatusTabs({
  statuses,
  value,
  onChange,
  includeAll = true,
  counts,
  className,
}: StatusTabsProps) {
  const tabs = includeAll ? (['All', ...statuses] as string[]) : [...statuses];

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {tabs.map((tab) => {
        const count =
          tab === 'All'
            ? itemsTotal(counts, statuses)
            : counts?.[tab];

        return (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              value === tab
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            )}
          >
            {tab}
            {count !== undefined && (
              <span className={cn('ml-1.5 text-xs', value === tab ? 'text-primary-100' : 'text-slate-400')}>
                ({count})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function itemsTotal(counts: Record<string, number> | undefined, statuses: readonly string[]) {
  if (!counts) return undefined;
  return statuses.reduce((sum, s) => sum + (counts[s] ?? 0), 0);
}
