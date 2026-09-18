import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { CalendarDays, Megaphone } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent } from '@/components/ui/Card';
import { announcementsApi } from '@/api/resources';
import { announcementsListPath } from '@/utils/announcementLinks';
import {
  getAnnouncementCategory,
  isAnnouncementExpired,
  isAnnouncementForRole,
} from '@/utils/announcements';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { cn } from '@/utils/cn';
import type { Announcement, UserRole } from '@/types';

type AnnouncementDetailPageProps =
  | { mode: 'admin' }
  | { mode: 'viewer'; audience: UserRole };

function canViewAnnouncement(
  announcement: Announcement,
  props: AnnouncementDetailPageProps
): boolean {
  if (props.mode === 'admin') return true;
  return isAnnouncementForRole(announcement, props.audience);
}

function DetailShell({
  breadcrumbs,
  children,
}: {
  breadcrumbs: { label: string; to?: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100dvh-5.75rem)] flex-col lg:min-h-[calc(100dvh-6.5rem)]">
      <Breadcrumbs items={breadcrumbs} className="mb-4 shrink-0" />
      <Card className="flex min-h-0 flex-1 flex-col">{children}</Card>
    </div>
  );
}

export default function AnnouncementDetailPage(props: AnnouncementDetailPageProps) {
  const { announcementId } = useParams<{ announcementId: string }>();
  const location = useLocation();
  const stateAnnouncement = (location.state as { announcement?: Announcement } | null)
    ?.announcement;

  const listPath =
    props.mode === 'admin'
      ? announcementsListPath('Admin')
      : announcementsListPath(props.audience);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAnnouncements = useCallback(() => {
    setLoading(true);
    announcementsApi
      .getAll()
      .then(setAnnouncements)
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const announcement = useMemo(() => {
    if (!announcementId) return null;
    if (stateAnnouncement?.id === announcementId) return stateAnnouncement;
    return announcements.find((a) => a.id === announcementId) ?? null;
  }, [announcementId, stateAnnouncement, announcements]);

  const allowed =
    announcement != null && canViewAnnouncement(announcement, props);

  if (loading && !stateAnnouncement) {
    return (
      <DetailShell breadcrumbs={[{ label: 'Announcements', to: listPath }, { label: '…' }]}>
        <CardContent className="flex flex-1 items-center justify-center py-12 text-center text-sm text-slate-500">
          Loading announcement…
        </CardContent>
      </DetailShell>
    );
  }

  if (!announcementId || !announcement || !allowed) {
    return (
      <DetailShell
        breadcrumbs={[{ label: 'Announcements', to: listPath }, { label: 'Not found' }]}
      >
        <CardContent className="flex flex-1 flex-col justify-center py-10">
          <p className="font-medium text-slate-800">Announcement not found</p>
          <p className="mt-2 text-sm text-slate-600">
            It may have been removed or is not available for your account.
          </p>
        </CardContent>
      </DetailShell>
    );
  }

  const isHoliday = getAnnouncementCategory(announcement) === 'Holiday';
  const expired = isAnnouncementExpired(announcement);
  const sender = announcement.createdByName?.trim() || 'Centre';

  return (
    <DetailShell
      breadcrumbs={[
        { label: 'Announcements', to: listPath },
        { label: announcement.title },
      ]}
    >
      <CardContent className="flex flex-1 flex-col space-y-5 p-5 sm:p-6">
        <div className="flex gap-4">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
              isHoliday ? 'bg-amber-50 text-amber-700' : 'bg-primary-50 text-primary-700'
            )}
          >
            {isHoliday ? <CalendarDays className="h-6 w-6" /> : <Megaphone className="h-6 w-6" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">
                {announcement.title}
              </h1>
              {expired && props.mode === 'admin' && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                  Expired
                </span>
              )}
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
              <span>{sender}</span>
              <span className="text-slate-300" aria-hidden>
                ·
              </span>
              <time className="tabular-nums">
                Posted {formatDateDDMMYYYY(announcement.createdAt)}
              </time>
              {isHoliday && announcement.holidayDate && (
                <>
                  <span className="text-slate-300" aria-hidden>
                    ·
                  </span>
                  <span className="tabular-nums text-amber-800">
                    Holiday {formatDateDDMMYYYY(announcement.holidayDate)}
                  </span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex-1 border-t border-slate-100 pt-5">
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-700">
            {announcement.content}
          </p>
        </div>
      </CardContent>
    </DetailShell>
  );
}
