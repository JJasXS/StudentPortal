import { Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SearchBox } from '@/components/SearchBox';
import { DataTable } from '@/components/ui/DataTable';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { HolidayCarousel } from '@/components/HolidayCarousel';
import { GeneralAnnouncementList } from '@/components/announcements/GeneralAnnouncementList';
import type { Announcement } from '@/types';

type MergedAnnouncementsVariant = 'dashboard-admin' | 'page-admin' | 'page-viewer';

interface MergedAnnouncementsPanelProps {
  holidays: Announcement[];
  general: Announcement[];
  variant: MergedAnnouncementsVariant;
  /** Show link from holiday carousel to full announcements page */
  announcementsPath?: string;
  search?: string;
  onSearchChange?: (value: string) => void;
  generalEmptyMessage?: string;
  className?: string;
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
}: MergedAnnouncementsPanelProps) {
  const isDashboard = variant === 'dashboard-admin';
  const isAdminPage = variant === 'page-admin';
  const showViewAll = Boolean(announcementsPath) && isDashboard;

  const filteredGeneral =
    isAdminPage && search != null
      ? general.filter((a) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return (
            a.title.toLowerCase().includes(q) ||
            a.content.toLowerCase().includes(q) ||
            a.createdByName?.toLowerCase().includes(q)
          );
        })
      : general;

  const hasNothing = holidays.length === 0 && filteredGeneral.length === 0;

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="h-4 w-4 text-primary-600" />
            Announcements
            {(holidays.length > 0 || general.length > 0) && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
                {holidays.length + general.length}
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
      <CardContent className="space-y-6 pt-0">
        {hasNothing ? (
          <p className="py-8 text-center text-sm text-slate-500">{generalEmptyMessage}</p>
        ) : (
          <>
            {holidays.length > 0 && (
              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Public holidays
                </h3>
                <HolidayCarousel
                  holidays={holidays}
                  showViewAllLink={showViewAll}
                  viewAllPath={announcementsPath}
                />
              </section>
            )}

            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Notices
              </h3>
              {isAdminPage && onSearchChange != null && (
                <div className="mb-4">
                  <SearchBox
                    value={search ?? ''}
                    onChange={onSearchChange}
                    placeholder="Search announcements..."
                  />
                </div>
              )}
              {isDashboard || isAdminPage ? (
                <DataTable
                  embedded
                  data={filteredGeneral}
                  emptyMessage={generalEmptyMessage}
                  columns={
                    isAdminPage
                      ? [
                          { key: 'title', header: 'Title' },
                          { key: 'content', header: 'Content', className: 'max-w-xs truncate' },
                          {
                            key: 'targetRole',
                            header: 'Target',
                            render: (a) => <StatusBadge status={a.targetRole} />,
                          },
                          { key: 'createdByName', header: 'Created By' },
                          {
                            key: 'createdAt',
                            header: 'Posted',
                            render: (a) => new Date(a.createdAt).toLocaleDateString(),
                          },
                        ]
                      : [
                          { key: 'title', header: 'Title' },
                          {
                            key: 'targetRole',
                            header: 'For',
                            render: (a) => <StatusBadge status={a.targetRole} />,
                          },
                          {
                            key: 'createdAt',
                            header: 'Posted',
                            render: (a) => new Date(a.createdAt).toLocaleDateString(),
                          },
                        ]
                  }
                />
              ) : (
                <GeneralAnnouncementList items={general} emptyMessage={generalEmptyMessage} />
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}
