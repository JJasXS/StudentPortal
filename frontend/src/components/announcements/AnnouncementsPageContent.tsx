import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { MergedAnnouncementsPanel } from '@/components/announcements/MergedAnnouncementsPanel';
import { announcementsApi } from '@/api/resources';
import { mockAnnouncements } from '@/utils/mockData';
import {
  splitAnnouncementsForAdmin,
  splitAnnouncementsForRole,
} from '@/utils/announcements';
import type { UserRole } from '@/types';

const PAGE_COPY: Record<UserRole | 'Admin', { title: string; description: string }> = {
  Admin: {
    title: 'Announcements',
    description: 'Public holidays and centre notices',
  },
  Teacher: {
    title: 'Announcements',
    description: 'Public holidays and centre news',
  },
  Student: {
    title: 'Announcements',
    description: 'Public holidays and latest news',
  },
  Parent: {
    title: 'Announcements',
    description: 'Public holidays and news for parents',
  },
};

type AnnouncementsPageContentProps =
  | { mode: 'admin' }
  | { mode: 'viewer'; audience: UserRole };

export function AnnouncementsPageContent(props: AnnouncementsPageContentProps) {
  const isAdmin = props.mode === 'admin';
  const audience = isAdmin ? 'Admin' : props.audience;
  const copy = PAGE_COPY[audience];

  const [announcements, setAnnouncements] = useState<typeof mockAnnouncements>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    announcementsApi.getAll().then(setAnnouncements).catch(() => setAnnouncements(mockAnnouncements));
  }, []);

  const viewerRole = props.mode === 'viewer' ? props.audience : null;

  const { holidays, general } = useMemo(() => {
    if (isAdmin) return splitAnnouncementsForAdmin(announcements);
    return splitAnnouncementsForRole(announcements, viewerRole!);
  }, [announcements, isAdmin, viewerRole]);

  return (
    <div>
      <PageHeader title={copy.title} description={copy.description} />

      <MergedAnnouncementsPanel
        holidays={holidays}
        general={general}
        variant={isAdmin ? 'page-admin' : 'page-viewer'}
        search={isAdmin ? search : undefined}
        onSearchChange={isAdmin ? setSearch : undefined}
        generalEmptyMessage="No announcements."
      />
    </div>
  );
}
