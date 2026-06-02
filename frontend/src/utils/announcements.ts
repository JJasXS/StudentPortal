import type { Announcement, UserRole } from '@/types';

export type AnnouncementCategory = 'Holiday' | 'General';

export function getAnnouncementCategory(announcement: Announcement): AnnouncementCategory {
  if (announcement.category) return announcement.category;
  const text = `${announcement.title} ${announcement.content}`.toLowerCase();
  if (text.includes('holiday') || text.includes('public holiday')) return 'Holiday';
  return 'General';
}

/** Whether an announcement is visible to a given role (not used for admin management lists). */
export function isAnnouncementForRole(announcement: Announcement, role: UserRole) {
  return announcement.targetRole === 'All' || announcement.targetRole === role;
}

export function filterAnnouncementsForRole(announcements: Announcement[], role: UserRole) {
  return announcements.filter((a) => isAnnouncementForRole(a, role));
}

export interface SplitAnnouncementsResult {
  holidays: Announcement[];
  general: Announcement[];
}

/** Role-based split: public holidays + general notices for this audience. */
export function splitAnnouncementsForRole(
  announcements: Announcement[],
  role: UserRole
): SplitAnnouncementsResult {
  const visible = filterAnnouncementsForRole(announcements, role);
  return {
    holidays: visible.filter((a) => getAnnouncementCategory(a) === 'Holiday'),
    general: visible.filter((a) => getAnnouncementCategory(a) === 'General'),
  };
}

/** Admin dashboard: holidays + general aimed at teachers/students. */
export function splitAnnouncements(announcements: Announcement[]) {
  const holidays = announcements.filter((a) => getAnnouncementCategory(a) === 'Holiday');
  const forTeachersAndStudents = announcements.filter(
    (a) =>
      getAnnouncementCategory(a) === 'General' &&
      (a.targetRole === 'Teacher' || a.targetRole === 'Student' || a.targetRole === 'All')
  );
  return { holidays, forTeachersAndStudents };
}

/** Admin announcements page: all holidays + all general notices. */
export function splitAnnouncementsForAdmin(announcements: Announcement[]): SplitAnnouncementsResult {
  return {
    holidays: announcements.filter((a) => getAnnouncementCategory(a) === 'Holiday'),
    general: announcements.filter((a) => getAnnouncementCategory(a) === 'General'),
  };
}
