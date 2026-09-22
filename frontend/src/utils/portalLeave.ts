import type { PortalLeaveStatus } from '@/types/portal';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';

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
  const parts = [formatDateDDMMYYYY(date.slice(0, 10))];
  if (start?.trim()) parts.push(start.trim());
  if (end?.trim()) parts.push(end.trim());
  return parts.join(' · ');
}

/** Original leave session → confirmed replacement, e.g. "24-09-2026 · 10:00 → 25-09-2026 · 09:00". */
export function formatLeaveReplacementFromTo(request: {
  sessionDate?: string | null;
  sessionStartTime?: string | null;
  replDate?: string | null;
  replStart?: string | null;
  replEnd?: string | null;
}): string | null {
  if (!request.replDate) return null;
  const from = formatPortalSlotDate(request.sessionDate, request.sessionStartTime);
  const to = formatPortalSlotDate(request.replDate, request.replStart, request.replEnd);
  return `${from} → ${to}`;
}

export function isLeaveSessionEligible(sessionDate: string, startTime?: string | null): boolean {
  const sessionStart = parseSessionDateTime(sessionDate, startTime);
  if (!sessionStart) return false;
  const now = new Date();
  const min = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  if (
    sessionStart.getFullYear() !== now.getFullYear() ||
    sessionStart.getMonth() !== now.getMonth()
  ) {
    return false;
  }

  return sessionStart >= min;
}

function parseSessionDateTime(sessionDate: string, startTime?: string | null): Date | null {
  const datePart = sessionDate.slice(0, 10);
  const timePart = startTime?.trim() || '00:00';
  const parsed = new Date(`${datePart}T${timePart}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
