import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface SquareIconTab<T extends string> {
  id: T;
  label: string;
  icon: LucideIcon;
  description?: string;
  href?: string;
}

interface SquareIconTabsProps<T extends string> {
  tabs: SquareIconTab<T>[];
  value: T;
  onChange?: (value: T) => void;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function SquareIconTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  orientation = 'horizontal',
}: SquareIconTabsProps<T>) {
  const isVertical = orientation === 'vertical';

  return (
    <nav
      className={cn(
        isVertical ? 'flex flex-col gap-2' : 'flex flex-wrap gap-2',
        className
      )}
      aria-label="Settings sections"
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = value === tab.id;
        const className = cn(
          'flex shrink-0 flex-col items-center justify-center gap-1 rounded-xl border text-center transition',
          isVertical ? 'h-[4.5rem] w-full max-w-[5.5rem]' : 'h-[4.5rem] w-[4.5rem]',
          active
            ? 'border-primary-500 bg-primary-50 text-primary-700 shadow-sm'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
        );

        const content = (
          <>
            <Icon className={cn('h-5 w-5', active ? 'text-primary-600' : 'text-slate-500')} />
            <span className="max-w-full truncate px-1 text-[10px] font-semibold leading-tight">
              {tab.label}
            </span>
          </>
        );

        if (tab.href) {
          return (
            <Link
              key={tab.id}
              to={tab.href}
              title={tab.description ?? tab.label}
              className={className}
              aria-current={active ? 'page' : undefined}
            >
              {content}
            </Link>
          );
        }

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange?.(tab.id)}
            title={tab.description ?? tab.label}
            className={className}
            aria-current={active ? 'page' : undefined}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}
