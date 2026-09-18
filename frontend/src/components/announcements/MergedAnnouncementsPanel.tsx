import { useMemo } from 'react';
import { Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnnouncementRowList } from '@/components/announcements/AnnouncementRowList';
import { SearchBox } from '@/components/SearchBox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import {
  filterAnnouncementsBySearch,
  getAnnouncementCategory,
  mergeAnnouncements,
} from '@/utils/announcements';
import type { Announcement } from '@/types';

type MergedAnnouncementsVariant = 'dashboard-admin' | 'page-admin' | 'page-viewer';

interface MergedAnnouncementsPanelProps {
  holidays: Announcement[];
  general: Announcement[];
  variant: MergedAnnouncementsVariant;
  announcementsPath?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  generalEmptyMessage?: string;
  className?: string;
  /** e.g. /teacher/announcements — enables title links to /:id with route state */
  announcementDetailBasePath?: string;
}

export function MergedAnnouncementsPanel({
  holidays,
  general,
  variant,
  announcementsPath,
  search,
  onSearchChange,
  generalEmptyMessage = 'No announcements.',
  className,
  announcementDetailBasePath,
}: MergedAnnouncementsPanelProps) {
  const isDashboard = variant === 'dashboard-admin';
  const isAdminPage = variant === 'page-admin';

  const merged = useMemo(() => {
    const combined = mergeAnnouncements(holidays, general);
    if (isAdminPage && search != null) {
      return filterAnnouncementsBySearch(combined, search);
    }
    return combined;
  }, [holidays, general, isAdminPage, search]);

  const senderLabel = (a: Announcement) => a.createdByName?.trim() || 'Centre';

  const dateLabel = (a: Announcement) => {
    if (getAnnouncementCategory(a) === 'Holiday' && a.holidayDate) {
      return formatDateDDMMYYYY(a.holidayDate);
    }
    return formatDateDDMMYYYY(a.createdAt);
  };

  return (
    <Card className={className}>
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
              <Megaphone className="h-4 w-4" />
            </span>
            Announcements
          </CardTitle>
          {announcementsPath && isDashboard && (
            <Link
              to={announcementsPath}
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              View all
            </Link>
          )}
        </div>

        {isAdminPage && onSearchChange != null && (
          <div className="pt-1">
            <SearchBox
              value={search ?? ''}
              onChange={onSearchChange}
              placeholder="Search by title, content, or sender…"
              className="max-w-xl"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 sm:p-0">
        {merged.length === 0 ? (
          <div className="m-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-12 text-center">
            <Megaphone className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-medium text-slate-600">{generalEmptyMessage}</p>
            <p className="mt-1 text-xs text-slate-400">
              Holidays and centre news will show up here.
            </p>
          </div>
        ) : (
          <div className="px-3 pb-2 sm:px-4">
            <AnnouncementRowList
              items={merged}
              senderLabel={senderLabel}
              dateLabel={dateLabel}
              detailBasePath={announcementDetailBasePath}
              showExpiredBadge={isAdminPage}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
