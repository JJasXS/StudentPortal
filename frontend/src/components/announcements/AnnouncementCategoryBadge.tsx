import { CalendarDays } from 'lucide-react';
import { getAnnouncementCategory } from '@/utils/announcements';
import type { Announcement } from '@/types';

export function AnnouncementCategoryBadge({ item }: { item: Announcement }) {
  const category = getAnnouncementCategory(item);
  if (category === 'Holiday') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-200/80">
        <CalendarDays className="h-3 w-3" />
        Holiday
      </span>
    );
  }
  if (item.targetRole && item.targetRole !== 'All') {
    return (
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
        {item.targetRole}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
      General
    </span>
  );
}
