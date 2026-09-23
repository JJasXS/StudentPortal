import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSqlAccountStudent } from '@/hooks/useSqlAccountStudent';
import { assignmentsApi, homeworkApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import {
  assignmentWorkStatus,
  dueLabel,
  isAssignmentAssigned,
  isAssignmentCompleted,
  isAssignmentMissing,
  workStatusBadgeClass,
} from '@/utils/studentLearning';
import { cn } from '@/utils/cn';
import type { PortalAssignment, PortalHomework } from '@/types/portal';

type TodoTab = 'assigned' | 'missing' | 'completed';

export default function StudentTodoPage() {
  const { student, loading: studentLoading } = useSqlAccountStudent(true);
  const [tab, setTab] = useState<TodoTab>('assigned');
  const [assignments, setAssignments] = useState<PortalAssignment[]>([]);
  const [submissions, setSubmissions] = useState<PortalHomework[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!student?.branchName) {
      setAssignments([]);
      setSubmissions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [asg, hw] = await Promise.all([
        assignmentsApi.getMine(student.branchName),
        homeworkApi.getMine(student.branchName),
      ]);
      setAssignments(asg);
      setSubmissions(hw);
    } catch {
      setAssignments([]);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [student?.branchName]);

  useEffect(() => {
    void load();
  }, [load]);

  const submissionByAssignment = useMemo(() => {
    const map = new Map<string, PortalHomework>();
    for (const row of submissions) {
      if (row.assignmentId) map.set(row.assignmentId, row);
    }
    return map;
  }, [submissions]);

  const lists = useMemo(() => {
    const assigned: PortalAssignment[] = [];
    const missing: PortalAssignment[] = [];
    const completed: PortalAssignment[] = [];
    for (const a of assignments) {
      const sub = submissionByAssignment.get(a.id);
      if (isAssignmentCompleted(a, sub)) completed.push(a);
      else if (isAssignmentMissing(a)) missing.push(a);
      else if (isAssignmentAssigned(a, sub)) assigned.push(a);
      else assigned.push(a);
    }
    const byDue = (x: PortalAssignment, y: PortalAssignment) =>
      new Date(x.dueDate).getTime() - new Date(y.dueDate).getTime();
    assigned.sort(byDue);
    missing.sort(byDue);
    completed.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    return { assigned, missing, completed };
  }, [assignments, submissionByAssignment]);

  const active = lists[tab];

  return (
    <div className="space-y-5">
      <PageHeader
        title="To Do"
        description="Assignments across all your classes."
      />

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <SlidingTabs
          tabs={['assigned', 'missing', 'completed'] as const}
          value={tab}
          onChange={(v) => setTab(v as TodoTab)}
          labels={{ assigned: 'Assigned', missing: 'Missing', completed: 'Completed' }}
          counts={{
            assigned: lists.assigned.length,
            missing: lists.missing.length,
            completed: lists.completed.length,
          }}
        />

        <div className="p-4 sm:p-5">
          {studentLoading || loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading…</p>
          ) : active.length === 0 ? (
            <EmptyState
              icon={tab === 'assigned' ? CheckCircle2 : ClipboardList}
              title={
                tab === 'assigned'
                  ? "You're all caught up!"
                  : tab === 'missing'
                    ? 'No missing work'
                    : 'No completed work yet'
              }
              description={
                tab === 'assigned'
                  ? 'No assignments are waiting for submission.'
                  : tab === 'missing'
                    ? 'Nothing is past due right now.'
                    : 'Submitted assignments will show up here.'
              }
              compact
            />
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
              {active.map((a) => {
                const sub = submissionByAssignment.get(a.id);
                const status = assignmentWorkStatus(a, sub);
                return (
                  <li
                    key={a.id}
                    className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{a.title}</p>
                      <p className="text-sm text-slate-500">
                        {a.className}
                        {a.createdByName ? ` · ${a.createdByName}` : ''}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {dueLabel(a.dueDate) || `Due ${formatDateDDMMYYYY(a.dueDate)}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1',
                          workStatusBadgeClass(status)
                        )}
                      >
                        {status}
                      </span>
                      <Link
                        to={`/student/assignments/${encodeURIComponent(a.id)}`}
                        className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
                      >
                        View work
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
