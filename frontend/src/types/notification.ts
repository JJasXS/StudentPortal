export type NotificationCategory =
  | 'LessonNote'
  | 'Invoice'
  | 'Announcement'
  | 'Attendance'
  | 'System';

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  linkPath?: string;
  isRead: boolean;
  createdAt: string;
}
