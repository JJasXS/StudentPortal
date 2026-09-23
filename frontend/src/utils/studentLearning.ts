import type { SqlAccountChildEnrollment } from '@/types/sqlAccount';
import type { PortalAssignment, PortalHomework } from '@/types/portal';

export function enrollmentClassKey(en: Pick<SqlAccountChildEnrollment, 'docKey' | 'seq'>): string {
  return `${en.docKey}-${en.seq}`;
}

export function parseEnrollmentClassKey(key: string): { docKey: number; seq: number } | null {
  const m = /^(\d+)-(\d+)$/.exec(key.trim());
  if (!m) return null;
  return { docKey: Number(m[1]), seq: Number(m[2]) };
}

export function findEnrollmentByKey(
  enrollments: SqlAccountChildEnrollment[],
  classKey: string
): SqlAccountChildEnrollment | null {
  const parsed = parseEnrollmentClassKey(classKey);
  if (!parsed) return null;
  return (
    enrollments.find((e) => e.docKey === parsed.docKey && e.seq === parsed.seq) ?? null
  );
}

export function enrollmentDisplay(en: SqlAccountChildEnrollment) {
  const day = en.linkedClassDayOfWeek || en.classDay || null;
  const start = en.linkedClassStartTime || en.classTime || null;
  const end = en.linkedClassEndTime || null;
  const time = start && end ? `${start} – ${end}` : start;
  return {
    title: en.linkedClassName || en.className,
    eyebrow: en.itemCode || 'Class',
    teacher: en.linkedClassTeacherName || en.conductedBy || null,
    day,
    time,
    room: null as string | null,
  };
}

export type StudentWorkStatus =
  | 'Not Started'
  | 'Submitted'
  | 'Returned'
  | 'Completed'
  | 'Past Due'
  | 'Missing';

export function assignmentWorkStatus(
  assignment: PortalAssignment,
  submission?: PortalHomework | null
): StudentWorkStatus {
  const due = new Date(assignment.dueDate);
  const now = new Date();
  const pastDue = !Number.isNaN(due.getTime()) && due < now;

  if (submission) {
    if (submission.status === 'Completed') return 'Completed';
    if (submission.status === 'Rejected') return 'Returned';
    return 'Submitted';
  }
  if (assignment.hasSubmission) {
    if (assignment.submissionStatus === 'Completed') return 'Completed';
    if (assignment.submissionStatus === 'Rejected') return 'Returned';
    return 'Submitted';
  }
  if (pastDue) return 'Past Due';
  return 'Not Started';
}

export function workStatusBadgeClass(status: StudentWorkStatus): string {
  switch (status) {
    case 'Submitted':
    case 'Completed':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    case 'Returned':
      return 'bg-amber-50 text-amber-800 ring-amber-200';
    case 'Past Due':
    case 'Missing':
      return 'bg-rose-50 text-rose-800 ring-rose-200';
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-200';
  }
}

export function isAssignmentMissing(assignment: PortalAssignment): boolean {
  const status = assignmentWorkStatus(assignment);
  return status === 'Past Due' || status === 'Missing';
}

export function isAssignmentCompleted(assignment: PortalAssignment, submission?: PortalHomework | null): boolean {
  const status = assignmentWorkStatus(assignment, submission);
  return status === 'Completed' || status === 'Submitted' || status === 'Returned';
}

export function isAssignmentAssigned(assignment: PortalAssignment, submission?: PortalHomework | null): boolean {
  return !isAssignmentCompleted(assignment, submission) && !isAssignmentMissing(assignment);
}

export function filterAssignmentsForEnrollment(
  assignments: PortalAssignment[],
  enrollment: SqlAccountChildEnrollment
): PortalAssignment[] {
  return assignments.filter(
    (a) =>
      a.className.toLowerCase() === enrollment.className.toLowerCase() ||
      (a.itemCode &&
        enrollment.itemCode &&
        a.itemCode.toLowerCase() === enrollment.itemCode.toLowerCase()) ||
      (enrollment.linkedClassName &&
        a.className.toLowerCase() === enrollment.linkedClassName.toLowerCase())
  );
}

export function dueLabel(dueDate: string): string {
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return '';
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const days = Math.round((startDue.getTime() - startToday.getTime()) / 86400000);
  if (days < 0) return 'Past due';
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days < 7) return `Due in ${days} days`;
  return `Due ${due.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
}
