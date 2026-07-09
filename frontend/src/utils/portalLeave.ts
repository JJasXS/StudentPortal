import type { PortalLeaveStatus } from '@/types/portal';

export function portalLeaveStatusLabel(status: PortalLeaveStatus | string): string {
  switch (status) {
    case 'Pending':
      return 'Pending review';
    case 'Rejected':
      return 'Rejected';
    case 'Approved':
      return 'Approved';
    case 'Confirmed':
      return 'Replacement confirmed';
    case 'ReplacementNeeded':
      return 'Replacement needed';
    case 'AwaitingTeacher':
      return 'Awaiting review';
    case 'TeacherCountered':
      return 'Counter proposed';
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
    case 'Confirmed':
      return 5;
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

export function isLeaveSessionEligible(sessionDate: string, startTime?: string | null): boolean {
  const sessionStart = parseSessionDateTime(sessionDate, startTime);
  if (!sessionStart) return false;
  const now = new Date();
  const min = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const max = new Date(now);
  max.setMonth(max.getMonth() + 1);
  return sessionStart >= min && sessionStart <= max;
}

function parseSessionDateTime(sessionDate: string, startTime?: string | null): Date | null {
  const datePart = sessionDate.slice(0, 10);
  const timePart = startTime?.trim() || '00:00';
  const parsed = new Date(`${datePart}T${timePart}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
