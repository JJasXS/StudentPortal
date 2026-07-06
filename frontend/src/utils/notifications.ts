import type { AppNotification } from '@/types/notification';

/** Notifications feature removed — stubs keep legacy imports compiling. */
export const NOTIFICATION_CATEGORY_LABELS: Record<string, string> = {
  LessonNote: 'Lesson note',
  Invoice: 'Invoice',
  Announcement: 'Announcement',
  Attendance: 'Attendance',
};

export async function loadNotifications(
  _userId?: string,
  _unreadOnly?: boolean
): Promise<AppNotification[]> {
  return [];
}

export async function getUnreadNotificationCount(_userId?: string): Promise<number> {
  return 0;
}

export async function markNotificationRead(
  _userId?: string,
  _id?: string
): Promise<void> {}

export async function markAllNotificationsRead(_userId?: string): Promise<void> {}
