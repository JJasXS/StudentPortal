import type { Announcement } from '@/types';

/** Leave decision notices (approve / reject / replacement) — not submission pending. */
export function isLeaveDecisionNotice(item: Announcement): boolean {
  if (item.relatedType !== 'LeaveRequest') return false;
  const title = item.title.toLowerCase();
  if (title.includes('submitted') || title.includes('teacher leave request')) return false;
  return (
    title.includes('declined') ||
    title.includes('cancelled') ||
    title.includes('replacement scheduled')
  );
}

export function leaveDecisionToastVariant(
  item: Announcement
): 'success' | 'error' | 'info' {
  const title = item.title.toLowerCase();
  if (title.includes('declined')) return 'error';
  if (title.includes('cancelled') || title.includes('replacement scheduled')) return 'success';
  return 'info';
}
