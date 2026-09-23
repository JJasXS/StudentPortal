import { useMemo, useState } from 'react';
import { BookOpen, Check, Download, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { cn } from '@/utils/cn';
import type { LessonNote } from '@/types';
import type { PortalAssignment, PortalHomework } from '@/types/portal';
import { lessonNotesForHomework } from '@/utils/homeworkLessonNotes';

interface HomeworkTabProps {
  assignments: PortalAssignment[];
  homework: PortalHomework[];
  notes: LessonNote[];
  assignmentTitles: Map<string, string>;
  onAssign: () => void;
  onReview: (entry: PortalHomework) => void;
}

function dueBadge(dueDate: string): { label: string; className: string } {
  const due = new Date(dueDate);
  const now = new Date();
  const days = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (Number.isNaN(days)) return { label: 'Active', className: 'bg-sky-50 text-sky-800 ring-sky-200' };
  if (days < 0) return { label: 'Past due', className: 'bg-rose-50 text-rose-800 ring-rose-200' };
  if (days <= 3) return { label: 'Due soon', className: 'bg-amber-50 text-amber-800 ring-amber-200' };
  return { label: 'Active', className: 'bg-sky-50 text-sky-800 ring-sky-200' };
}

export function HomeworkTab({
  assignments,
  homework,
  notes,
  assignmentTitles,
  onAssign,
  onReview,
}: HomeworkTabProps) {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredAssignments = useMemo(() => {
    const q = query.trim().toLowerCase();
    return assignments.filter((a) => !q || a.title.toLowerCase().includes(q));
  }, [assignments, query]);

  const filteredHomework = useMemo(() => {
    const q = query.trim().toLowerCase();
    return homework.filter((h) => {
      if (statusFilter !== 'all' && (h.status ?? 'Pending') !== statusFilter) return false;
      if (!q) return true;
      const title = h.assignmentId ? assignmentTitles.get(h.assignmentId) ?? '' : '';
      return (
        h.submittedBy.toLowerCase().includes(q) ||
        title.toLowerCase().includes(q) ||
        (h.fileName ?? '').toLowerCase().includes(q)
      );
    });
  }, [homework, query, statusFilter, assignmentTitles]);

  const empty = assignments.length === 0 && homework.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search homework…"
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
          >
            <option value="all">All statuses</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
        <Button type="button" size="sm" onClick={onAssign}>
          <Plus className="mr-1 h-4 w-4" />
          Add Homework
        </Button>
      </div>

      {empty ? (
        <EmptyState
          icon={BookOpen}
          title="No homework assigned yet"
          description="Add practice work, assignments, or preparation tasks for students."
          actions={[{ label: '+ Add Homework', onClick: onAssign }]}
        />
      ) : (
        <div className="space-y-6">
          {filteredAssignments.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Assignments</h3>
              <ul className="grid gap-3 sm:grid-cols-2">
                {filteredAssignments.map((assignment) => {
                  const badge = dueBadge(assignment.dueDate);
                  return (
                    <li
                      key={assignment.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-900">{assignment.title}</h4>
                        <span
                          className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1',
                            badge.className
                          )}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        Due {formatDateDDMMYYYY(assignment.dueDate)}
                      </p>
                      {assignment.instructions && (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                          {assignment.instructions}
                        </p>
                      )}
                      <div className="mt-3">
                        {assignment.hasSubmission ? (
                          <StatusBadge status={assignment.submissionStatus ?? 'Pending'} />
                        ) : (
                          <span className="text-xs text-slate-400">No submission yet</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {filteredHomework.length > 0 && (
            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Submissions</h3>
              <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {filteredHomework.map((entry) => {
                  const feedback =
                    lessonNotesForHomework(entry, notes).length > 0
                      ? 'Feedback complete'
                      : 'Pending feedback';
                  return (
                    <li key={entry.id}>
                      <button
                        type="button"
                        onClick={() => onReview(entry)}
                        className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">
                            {entry.submittedBy}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {entry.assignmentId
                              ? assignmentTitles.get(entry.assignmentId) ?? 'Assignment'
                              : 'Free-form'}{' '}
                            · {formatDateDDMMYYYY(entry.createdAt)} · {feedback}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={entry.status ?? 'Pending'} />
                          {entry.status === 'Completed' && (
                            <Check className="h-4 w-4 text-emerald-600" aria-label="Completed" />
                          )}
                          {(entry.hasFile || entry.filePath) && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <Download className="h-3.5 w-3.5" />
                              File
                            </span>
                          )}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {filteredAssignments.length === 0 && filteredHomework.length === 0 && (
            <EmptyState
              icon={BookOpen}
              title="No homework matches your filters"
              description="Try clearing search or status filter."
              compact
            />
          )}
        </div>
      )}
    </div>
  );
}
