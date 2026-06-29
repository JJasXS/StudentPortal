import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface SlidingTabsProps {
  tabs: readonly string[];
  value: string;
  onChange: (value: string) => void;
  counts?: Record<string, number>;
  /** Display text per tab value (defaults to tab string) */
  labels?: Record<string, string>;
  className?: string;
  /** Shown on the right (e.g. "5 of 10") */
  trailing?: ReactNode;
}

/** Underline tabs with a sliding blue indicator (embedded above table content). */
export function SlidingTabs({
  tabs,
  value,
  onChange,
  counts,
  labels,
  className,
  trailing,
}: SlidingTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const update = () => {
      const el = tabRefs.current.get(value);
      const container = containerRef.current;
      if (!el || !container) return;
      setIndicator({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [value, tabs, counts]);

  return (
    <div className={cn('w-full border-b border-slate-200 bg-white', className)}>
      <div className="flex items-stretch">
        <div
          ref={containerRef}
          className="relative flex min-w-0 flex-1 overflow-x-auto"
          role="tablist"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute bottom-0 h-0.5 rounded-full bg-primary-600 transition-[left,width] duration-300 ease-out"
            style={{ left: indicator.left, width: indicator.width }}
          />
          {tabs.map((tab) => {
            const active = value === tab;
            const count = counts?.[tab];
            return (
              <button
                key={tab}
                ref={(node) => {
                  if (node) tabRefs.current.set(tab, node);
                  else tabRefs.current.delete(tab);
                }}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange(tab)}
                className={cn(
                  'relative shrink-0 whitespace-nowrap px-4 pb-3 pt-3 text-center text-sm font-medium transition-colors',
                  active
                    ? 'text-primary-600 hover:text-primary-700'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {labels?.[tab] ?? tab}
                {count !== undefined && (
                  <span
                    className={cn(
                      'ml-1 text-xs font-normal',
                      active ? 'text-primary-500' : 'text-slate-400'
                    )}
                  >
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {trailing != null && (
          <div className="flex shrink-0 items-center border-l border-slate-100 px-4 text-xs text-slate-500">
            {trailing}
          </div>
        )}
      </div>
    </div>
  );
}
