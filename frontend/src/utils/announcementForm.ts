import type { Announcement } from '@/types';

export const ANNOUNCEMENT_CATEGORIES = ['General', 'Holiday'] as const;
export const ANNOUNCEMENT_TARGET_ROLES = ['All', 'Teacher', 'Student'] as const;

export const ANNOUNCEMENT_TARGET_ROLE_LABELS: Record<AnnouncementTargetRole, string> = {
  All: 'Everyone',
  Teacher: 'Teachers',
  Student: 'Students & Parents',
};

export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];
export type AnnouncementTargetRole = (typeof ANNOUNCEMENT_TARGET_ROLES)[number];

export interface AnnouncementFormValues {
  title: string;
  content: string;
  category: AnnouncementCategory;
  holidayDate: string;
  expiryDate: string;
  targetRole: AnnouncementTargetRole;
}

export const emptyAnnouncementForm = (): AnnouncementFormValues => ({
  title: '',
  content: '',
  category: 'General',
  holidayDate: '',
  expiryDate: '',
  targetRole: 'All',
});

export function announcementToForm(item: Announcement): AnnouncementFormValues {
  const role =
    item.targetRole === 'Parent' ? 'Student' : item.targetRole;
  return {
    title: item.title,
    content: item.content,
    category: item.category === 'Holiday' ? 'Holiday' : 'General',
    holidayDate: item.holidayDate?.slice(0, 10) ?? '',
    expiryDate: item.expiryDate?.slice(0, 10) ?? '',
    targetRole: (ANNOUNCEMENT_TARGET_ROLES.includes(role as AnnouncementTargetRole)
      ? role
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
    expiryDate: values.expiryDate ? values.expiryDate : undefined,
    targetRole: values.targetRole,
    createdByUserId,
  };
}
