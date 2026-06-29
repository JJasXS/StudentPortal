import { useMemo } from 'react';
import { Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AnnouncementRowList } from '@/components/announcements/AnnouncementRowList';
import { SearchBox } from '@/components/SearchBox';
import { DataTable } from '@/components/ui/DataTable';
import { cn } from '@/utils/cn';
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
  const isViewerPage = variant === 'page-viewer';
  const detailEnabled = Boolean(announcementDetailBasePath);

  const titleCell = (a: Announcement) =>
    detailEnabled ? (
      <Link
        to={`${announcementDetailBasePath}/${a.id}`}
        state={{ announcement: a }}
        className="text-left font-medium text-primary-700 hover:text-primary-800 hover:underline"
      >
        {a.title}
      </Link>
    ) : (
      <span className="font-medium text-slate-900">{a.title}</span>
    );

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
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4 text-primary-600" />
            Announcements
            {merged.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
                {merged.length}
              </span>
            )}
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
      </CardHeader>
      <CardContent className="pt-0">
        {isAdminPage && onSearchChange != null && (
          <div className="mb-4">
            <SearchBox
              value={search ?? ''}
              onChange={onSearchChange}
              placeholder="Search announcements..."
            />
          </div>
        )}

        {merged.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">{generalEmptyMessage}</p>
        ) : (
          <>
            {(isViewerPage || isAdminPage) && (
              <AnnouncementRowList
                items={merged}
                renderTitle={titleCell}
                senderLabel={senderLabel}
                dateLabel={dateLabel}
                className="md:hidden"
              />
            )}

            <div className={cn((isViewerPage || isAdminPage) && 'hidden md:block')}>
              {isViewerPage ? (
                <DataTable
                  embedded
                  data={merged}
                  emptyMessage={generalEmptyMessage}
                  columns={[
                    {
                      key: 'title',
                      header: 'Title',
                      sortable: true,
                      sortType: 'text',
                      getSortValue: (a) => a.title,
                      className: 'whitespace-normal pr-6',
                      render: (a) => titleCell(a),
                    },
                    {
                      key: 'sender',
                      header: 'Sender',
                      colWidth: '10rem',
                      sortable: true,
                      sortType: 'text',
                      getSortValue: (a) => senderLabel(a),
                      render: (a) => <span className="text-slate-700">{senderLabel(a)}</span>,
                    },
                    {
                      key: 'date',
                      header: 'Date',
                      colWidth: '7rem',
                      sortable: true,
                      sortType: 'date',
                      getSortValue: (a) =>
                        getAnnouncementCategory(a) === 'Holiday' && a.holidayDate
                          ? a.holidayDate
                          : a.createdAt,
                      render: (a) => (
                        <span className="tabular-nums text-slate-600">{dateLabel(a)}</span>
                      ),
                    },
                  ]}
                />
              ) : (
                <DataTable
                  embedded
                  data={merged}
                  emptyMessage={generalEmptyMessage}
                  columns={
                    isAdminPage
                      ? [
                          {
                            key: 'title',
                            header: 'Title',
                            className: 'whitespace-normal pr-6',
                            render: (a) => titleCell(a),
                          },
                          {
                            key: 'sender',
                            header: 'Sender',
                            colWidth: '10rem',
                            render: (a) => senderLabel(a),
                          },
                          {
                            key: 'date',
                            header: 'Date',
                            colWidth: '7rem',
                            render: (a) => dateLabel(a),
                          },
                        ]
                      : [
                          { key: 'title', header: 'Title', className: 'pr-6' },
                          {
                            key: 'sender',
                            header: 'Sender',
                            colWidth: '10rem',
                            render: (a) => senderLabel(a),
                          },
                          {
                            key: 'date',
                            header: 'Date',
                            colWidth: '7rem',
                            render: (a) => dateLabel(a),
                          },
                        ]
                  }
                />
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
