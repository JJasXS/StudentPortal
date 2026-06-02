import { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowDownAZ,
  ArrowUp,
  ArrowUpAZ,
  ArrowUpDown,
} from 'lucide-react';
import { cn } from '@/utils/cn';

export type SortDirection = 'asc' | 'desc';
export type ColumnSortType = 'text' | 'number' | 'date';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  sortType?: ColumnSortType;
  getSortValue?: (item: T) => string | number | null | undefined;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: keyof T;
  emptyMessage?: string;
  /** Omit outer border when nested inside a parent card shell */
  embedded?: boolean;
  /** Center-align headers and cells */
  centered?: boolean;
}

function compareSortValues(
  a: unknown,
  b: unknown,
  sortType: ColumnSortType,
  direction: SortDirection
): number {
  const aEmpty = a == null || a === '';
  const bEmpty = b == null || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  let cmp = 0;
  if (sortType === 'date') {
    cmp = new Date(String(a)).getTime() - new Date(String(b)).getTime();
  } else if (sortType === 'number') {
    cmp = Number(a) - Number(b);
  } else {
    cmp = String(a).localeCompare(String(b), undefined, { sensitivity: 'base' });
  }
  return direction === 'asc' ? cmp : -cmp;
}

function sortHint(sortType: ColumnSortType, direction: SortDirection): string {
  if (sortType === 'text') {
    return direction === 'asc' ? 'A–Z' : 'Z–A';
  }
  return direction === 'asc' ? 'Lowest first' : 'Highest first';
}

function SortHeaderIcon({
  sortType,
  direction,
  active,
}: {
  sortType: ColumnSortType;
  direction: SortDirection;
  active: boolean;
}) {
  if (!active) {
    return <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />;
  }
  if (sortType === 'text') {
    return direction === 'asc' ? (
      <ArrowUpAZ className="h-3.5 w-3.5 shrink-0 text-primary-600" aria-hidden />
    ) : (
      <ArrowDownAZ className="h-3.5 w-3.5 shrink-0 text-primary-600" aria-hidden />
    );
  }
  return direction === 'asc' ? (
    <ArrowUp className="h-3.5 w-3.5 shrink-0 text-primary-600" aria-hidden />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 shrink-0 text-primary-600" aria-hidden />
  );
}

export function DataTable<T extends object>({
  columns,
  data,
  keyField = 'id' as keyof T,
  emptyMessage = 'No records found.',
  embedded = false,
  centered = false,
}: DataTableProps<T>) {
  const alignClass = centered ? 'text-center' : 'text-left';
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortable) return data;

    const sortType = col.sortType ?? 'text';
    const getValue =
      col.getSortValue ??
      ((item: T) => (item as Record<string, unknown>)[col.key] as string | number | null | undefined);

    return [...data].sort((a, b) =>
      compareSortValues(getValue(a), getValue(b), sortType, sortDirection)
    );
  }, [columns, data, sortDirection, sortKey]);

  const handleSort = (key: string) => {
    const col = columns.find((c) => c.key === key);
    if (!col?.sortable) return;
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  if (data.length === 0) {
    return (
      <div
        className={cn(
          'p-8 text-center text-slate-500',
          embedded ? 'border-t border-dashed border-slate-200' : 'rounded-lg border border-dashed border-slate-300'
        )}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', !embedded && 'rounded-lg border border-slate-200')}>
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((col) => {
              const active = sortKey === col.key;
              const sortType = col.sortType ?? 'text';
              const hint = active ? sortHint(sortType, sortDirection) : 'Click to sort';

              if (!col.sortable) {
                return (
                  <th
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600',
                      alignClass,
                      col.className
                    )}
                  >
                    {col.header}
                  </th>
                );
              }

              return (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600',
                    alignClass,
                    col.className
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    title={hint}
                    aria-label={`${col.header}: ${active ? hint : 'sort'}`}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md transition-colors hover:text-primary-700',
                      active && 'text-primary-700',
                      centered && 'mx-auto'
                    )}
                  >
                    <span>{col.header}</span>
                    <SortHeaderIcon
                      sortType={sortType}
                      direction={sortDirection}
                      active={active}
                    />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {sortedData.map((item) => (
            <tr key={String(item[keyField])} className="hover:bg-slate-50">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn('whitespace-nowrap px-4 py-3 text-sm text-slate-700', alignClass, col.className)}
                >
                  {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
