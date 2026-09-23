import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Enrollment } from '@/types';

export interface ClassStudentRow {
  id: string;
  name: string;
  subtitle?: string;
  status?: string;
}

interface StudentsTabProps {
  enrollments: Enrollment[];
  /** ERP / schedule roster when portal enrollments are empty */
  scheduleStudents?: ClassStudentRow[];
  enrolledCount: number;
  maxStudents: number;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function rowsFromEnrollments(enrollments: Enrollment[]): ClassStudentRow[] {
  return enrollments.map((e) => ({
    id: e.id,
    name: e.studentName || 'Student',
  }));
}

export function StudentsTab({
  enrollments,
  scheduleStudents = [],
  enrolledCount,
  maxStudents,
}: StudentsTabProps) {
  const rows =
    enrollments.length > 0 ? rowsFromEnrollments(enrollments) : scheduleStudents;
  const displayCount = Math.max(enrolledCount, rows.length);

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-700">
        Students{' '}
        {maxStudents > 0 ? `${displayCount} / ${maxStudents}` : `${displayCount}`}
      </p>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students enrolled yet"
          description="Enrolled students for this class will appear here."
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 px-4 py-3">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700">
                {initials(row.name) || '?'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{row.name}</p>
                {row.subtitle && <p className="text-xs text-slate-500">{row.subtitle}</p>}
              </div>
              {row.status && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  {row.status}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
