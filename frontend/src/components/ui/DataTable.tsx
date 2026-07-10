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

export type ColumnAlign = 'left' | 'center' | 'right';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  align?: ColumnAlign;
  /** Fixed column width (e.g. `10rem`) — enables table-fixed layout when set on any column */
  colWidth?: string;
  /** Pin column to the right edge when table scrolls horizontally */
  sticky?: 'end';
  /** Allow cell text to wrap instead of truncating on one line */
  wrap?: boolean;
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
  onRowClick?: (item: T) => void;
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
  onRowClick,
}: DataTableProps<T>) {
  const defaultAlign: ColumnAlign = centered ? 'center' : 'left';

  const columnAlignClass = (col: Column<T>) => {
    const align = col.align ?? defaultAlign;
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  const sortButtonClass = (col: Column<T>) => {
    const align = col.align ?? defaultAlign;
    if (align === 'right') return 'ml-auto';
    if (align === 'center') return 'mx-auto';
    return undefined;
  };

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

  const useFixedLayout = columns.some((c) => c.colWidth);

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
    <div
      className={cn(
        'overflow-x-auto [scrollbar-gutter:stable]',
        !embedded && 'rounded-lg border border-slate-200'
      )}
    >
      <table
        className={cn(
          'w-full divide-y divide-slate-200',
          useFixedLayout ? 'table-fixed' : 'min-w-full'
        )}
      >
        {useFixedLayout && (
          <colgroup>
            {columns.map((col) => (
              <col key={col.key} style={col.colWidth ? { width: col.colWidth } : undefined} />
            ))}
          </colgroup>
        )}
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
                      columnAlignClass(col),
                      col.sticky === 'end' &&
                        'sticky right-0 z-20 bg-slate-50 pl-2 pr-3 shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.08)]',
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
                    columnAlignClass(col),
                    col.sticky === 'end' &&
                      'sticky right-0 z-20 bg-slate-50 pl-2 pr-3 shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.08)]',
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
                      sortButtonClass(col)
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
            <tr
              key={String(item[keyField])}
              className={cn('group hover:bg-slate-50', onRowClick && 'cursor-pointer')}
              onClick={onRowClick ? () => onRowClick(item) : undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'px-4 py-3 text-sm text-slate-700',
                    col.wrap ? 'min-w-0 whitespace-normal break-words' : 'whitespace-nowrap',
                    columnAlignClass(col),
                    col.sticky === 'end' &&
                      'sticky right-0 z-10 bg-white pl-2 pr-3 shadow-[-4px_0_8px_-4px_rgba(15,23,42,0.08)] group-hover:bg-slate-50',
                    col.className
                  )}
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
