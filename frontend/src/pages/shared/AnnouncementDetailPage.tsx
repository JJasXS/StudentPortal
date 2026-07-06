import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { announcementsApi } from '@/api/resources';
import { announcementsListPath } from '@/utils/announcementLinks';
import { isAnnouncementForRole } from '@/utils/announcements';
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

  const breadcrumbs = [
    { label: 'Announcements', to: listPath },
    { label: announcement?.title ?? 'Announcement' },
  ];

  if (loading && !stateAnnouncement) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'Announcements', to: listPath }, { label: '…' }]} />
        <p className="mt-8 text-slate-500">Loading announcement…</p>
      </>
    );
  }

  if (!announcementId || !announcement || !allowed) {
    return (
      <>
        <Breadcrumbs items={[{ label: 'Announcements', to: listPath }, { label: 'Not found' }]} />
        <p className="mt-8 font-medium text-slate-800">Announcement not found</p>
        <p className="mt-2 text-slate-600">
          It may have been removed or is not available for your account.
        </p>
        <Link
          to={listPath}
          className="mt-6 inline-flex items-center text-slate-700 hover:text-primary-700"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to announcements
        </Link>
      </>
    );
  }

  return (
    <>
      <Breadcrumbs items={breadcrumbs} />
      <Link
        to={listPath}
        className="mt-2 inline-flex items-center text-sm text-slate-600 hover:text-primary-700"
      >
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to announcements
      </Link>
      <h1 className="mt-8 text-2xl font-semibold text-slate-900">{announcement.title}</h1>
      <p className="mt-6 w-full text-justify text-[15px] leading-7 text-slate-800">
        {announcement.content}
      </p>
    </>
  );
}
