import type { PortalLeaveStatus } from '@/types/portal';

export function portalLeaveStatusLabel(status: PortalLeaveStatus): string {
  switch (status) {
    case 'Pending':
      return 'Pending review';
    case 'Rejected':
      return 'Rejected';
    case 'Approved':
      return 'Approved';
    case 'ReplacementNeeded':
      return 'Replacement needed';
    case 'AwaitingTeacher':
      return 'Awaiting teacher';
    case 'TeacherCountered':
      return 'Teacher countered';
    case 'Confirmed':
      return 'Confirmed';
    default:
      return status;
  }
}

export function portalWorkflowStep(status: PortalLeaveStatus): number {
  switch (status) {
    case 'Pending':
      return 2;
    case 'Rejected':
      return 3;
    case 'Approved':
      return 4;
    case 'ReplacementNeeded':
      return 5;
    case 'AwaitingTeacher':
      return 7;
    case 'TeacherCountered':
      return 8;
    case 'Confirmed':
      return 9;
    default:
      return 1;
  }
}

export function formatPortalSlotDate(
  date?: string | null,
  start?: string | null,
  end?: string | null
): string {
  if (!date) return '—';
  const d = date.slice(0, 10);
  const parts = [d];
  if (start) parts.push(start);
  if (end) parts.push(end);
  return parts.join(' · ');
}
