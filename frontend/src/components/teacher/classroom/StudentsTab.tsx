import { Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import type { Enrollment } from '@/types';

interface StudentsTabProps {
  enrollments: Enrollment[];
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

export function StudentsTab({ enrollments, enrolledCount, maxStudents }: StudentsTabProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-700">
        Students{' '}
        {maxStudents > 0 ? `${enrolledCount} / ${maxStudents}` : `${enrolledCount}`}
      </p>

      {enrollments.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No students enrolled yet"
          description="Enrolled students for this class will appear here."
        />
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {enrollments.map((e) => {
            const name = e.studentName || 'Student';
            return (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700">
                  {initials(name) || '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{name}</p>
                  <p className="text-xs text-slate-500">
                    Enrolled {e.enrollmentDate ? new Date(e.enrollmentDate).toLocaleDateString() : '—'}
                  </p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                  {e.status}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
