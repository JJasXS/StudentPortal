import { cn } from '@/utils/cn';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
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

export function DataTable<T extends object>({
  columns,
  data,
  keyField = 'id' as keyof T,
  emptyMessage = 'No records found.',
  embedded = false,
  centered = false,
}: DataTableProps<T>) {
  const alignClass = centered ? 'text-center' : 'text-left';
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
            {columns.map((col) => (
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
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {data.map((item) => (
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
