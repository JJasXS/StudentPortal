import type { UserRole } from '@/types';

const ROLE_PATH: Record<UserRole | 'Admin', string> = {
  Admin: '/admin',
  Teacher: '/teacher',
  Student: '/student',
  Parent: '/parent',
};

export function announcementsListPath(role: UserRole | 'Admin'): string {
  return `${ROLE_PATH[role]}/announcements`;
}

export function announcementDetailPath(
  role: UserRole | 'Admin',
  announcementId: string
): string {
  return `${announcementsListPath(role)}/${announcementId}`;
}
