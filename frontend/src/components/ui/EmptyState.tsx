import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'outline';
  external?: boolean;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: EmptyStateAction[];
  children?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actions = [],
  children,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-slate-200 bg-slate-50/80 text-center',
        compact ? 'px-4 py-6' : 'px-6 py-10',
        className
      )}
    >
      <div
        className={cn(
          'mx-auto flex items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80',
          compact ? 'mb-3 h-12 w-12' : 'mb-4 h-14 w-14'
        )}
      >
        <Icon className={cn('text-primary-600', compact ? 'h-6 w-6' : 'h-7 w-7')} />
      </div>
      <h3 className={cn('font-semibold text-slate-900', compact ? 'text-sm' : 'text-base')}>
        {title}
      </h3>
      {description && (
        <p className={cn('mx-auto mt-1 max-w-sm text-slate-500', compact ? 'text-xs' : 'text-sm')}>
          {description}
        </p>
      )}
      {children}
      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {actions.map((action) => {
            const variant = action.variant === 'outline' ? 'outline' : 'default';
            if (action.href) {
              if (action.external) {
                return (
                  <a key={action.label} href={action.href}>
                    <Button type="button" variant={variant} size={compact ? 'sm' : 'md'}>
                      {action.label}
                    </Button>
                  </a>
                );
              }
              return (
                <Link key={action.label} to={action.href}>
                  <Button type="button" variant={variant} size={compact ? 'sm' : 'md'}>
                    {action.label}
                  </Button>
                </Link>
              );
            }
            return (
              <Button
                key={action.label}
                type="button"
                variant={variant}
                size={compact ? 'sm' : 'md'}
                onClick={action.onClick}
              >
                {action.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
