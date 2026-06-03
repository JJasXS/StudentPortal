import type { Announcement } from '@/types';

export const ANNOUNCEMENT_CATEGORIES = ['General', 'Holiday'] as const;
export const ANNOUNCEMENT_TARGET_ROLES = ['All', 'Teacher', 'Student', 'Parent'] as const;

export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];
export type AnnouncementTargetRole = (typeof ANNOUNCEMENT_TARGET_ROLES)[number];

export interface AnnouncementFormValues {
  title: string;
  content: string;
  category: AnnouncementCategory;
  holidayDate: string;
  targetRole: AnnouncementTargetRole;
}

export const emptyAnnouncementForm = (): AnnouncementFormValues => ({
  title: '',
  content: '',
  category: 'General',
  holidayDate: '',
  targetRole: 'All',
});

export function announcementToForm(item: Announcement): AnnouncementFormValues {
  return {
    title: item.title,
    content: item.content,
    category: item.category === 'Holiday' ? 'Holiday' : 'General',
    holidayDate: item.holidayDate?.slice(0, 10) ?? '',
    targetRole: (ANNOUNCEMENT_TARGET_ROLES.includes(item.targetRole as AnnouncementTargetRole)
      ? item.targetRole
      : 'All') as AnnouncementTargetRole,
  };
}

export function formToAnnouncementPayload(
  values: AnnouncementFormValues,
  createdByUserId: string,
  id?: string
) {
  const isHoliday = values.category === 'Holiday';
  return {
    id: id ?? '00000000-0000-0000-0000-000000000000',
    title: values.title.trim(),
    content: values.content.trim(),
    category: values.category,
    holidayDate: isHoliday && values.holidayDate ? values.holidayDate : undefined,
    targetRole: values.targetRole,
    createdByUserId,
  };
}
