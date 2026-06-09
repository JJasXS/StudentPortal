import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { AnnouncementFormModal } from '@/components/AnnouncementFormModal';
import { MergedAnnouncementsPanel } from '@/components/announcements/MergedAnnouncementsPanel';
import { Button } from '@/components/ui/Button';
import { announcementsApi } from '@/api/resources';
import { mockAnnouncements } from '@/utils/mockData';
import { formToAnnouncementPayload } from '@/utils/announcementForm';
import {
  splitAnnouncementsForAdmin,
  splitAnnouncementsForRole,
} from '@/utils/announcements';
import { announcementsListPath } from '@/utils/announcementLinks';
import { logAdminAction } from '@/utils/auditLog';
import { AUDIT_ACTIONS } from '@/types/auditLog';
import type { Announcement, UserRole } from '@/types';
import type { AnnouncementFormValues } from '@/utils/announcementForm';

const PAGE_COPY: Record<UserRole | 'Admin', { title: string; description: string }> = {
  Admin: {
    title: 'Announcements',
    description: 'Create and manage public holidays and centre announcements',
  },
  Teacher: {
    title: 'Announcements',
    description: 'Holidays and centre news',
  },
  Student: {
    title: 'Announcements',
    description: 'Holidays and latest news',
  },
  Parent: {
    title: 'Announcements',
    description: 'Holidays and news for parents',
  },
};

type AnnouncementsPageContentProps =
  | { mode: 'admin' }
  | { mode: 'viewer'; audience: UserRole };

const MOCK_ADMIN_USER_ID = '11111111-1111-1111-1111-111111111111';

export function AnnouncementsPageContent(props: AnnouncementsPageContentProps) {
  const { user } = useAuth();
  const isAdmin = props.mode === 'admin';
  const audience = isAdmin ? 'Admin' : props.audience;
  const copy = PAGE_COPY[audience];
  const announcementDetailBasePath = announcementsListPath(isAdmin ? 'Admin' : audience);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const loadAnnouncements = useCallback(() => {
    announcementsApi
      .getAll()
      .then((data) => {
        setAnnouncements(
          data.length >= mockAnnouncements.length ? data : mockAnnouncements
        );
      })
      .catch(() => setAnnouncements(mockAnnouncements));
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const viewerRole = props.mode === 'viewer' ? props.audience : null;

  const { holidays, general } = useMemo(() => {
    if (isAdmin) return splitAnnouncementsForAdmin(announcements);
    return splitAnnouncementsForRole(announcements, viewerRole!);
  }, [announcements, isAdmin, viewerRole]);

  const createdByUserId =
    user?.id && user.id.includes('-') ? user.id : MOCK_ADMIN_USER_ID;

  const handleCreate = async (values: AnnouncementFormValues) => {
    setSaving(true);
    setFormError('');
    const payload = formToAnnouncementPayload(values, createdByUserId);
    const now = new Date().toISOString();

    try {
      if (import.meta.env.VITE_USE_MOCK === 'true') {
        const created: Announcement = {
          id: crypto.randomUUID(),
          title: payload.title,
          content: payload.content,
          category: payload.category as Announcement['category'],
          holidayDate: payload.holidayDate,
          targetRole: payload.targetRole as Announcement['targetRole'],
          createdByUserId: payload.createdByUserId,
          createdByName: user?.fullName ?? 'System Admin',
          createdAt: now,
        };
        setAnnouncements((list) => [created, ...list]);
        logAdminAction(user, {
          action: AUDIT_ACTIONS.announcementCreated,
          entityType: 'Announcement',
          entityId: created.id,
          entityLabel: payload.title,
        });
      } else {
        const created = await announcementsApi.create(payload);
        setAnnouncements((list) => [created, ...list]);
        logAdminAction(user, {
          action: AUDIT_ACTIONS.announcementCreated,
          entityType: 'Announcement',
          entityId: created.id,
          entityLabel: payload.title,
        });
      }
      setFormOpen(false);
    } catch {
      const created: Announcement = {
        id: crypto.randomUUID(),
        title: payload.title,
        content: payload.content,
        category: payload.category as Announcement['category'],
        holidayDate: payload.holidayDate,
        targetRole: payload.targetRole as Announcement['targetRole'],
        createdByUserId: payload.createdByUserId,
        createdByName: user?.fullName ?? 'System Admin',
        createdAt: now,
      };
      setAnnouncements((list) => [created, ...list]);
      setFormOpen(false);
      setFormError('Could not save to server — announcement added locally.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={copy.title}
        description={copy.description}
        actions={
          isAdmin ? (
            <Button type="button" onClick={() => setFormOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              New announcement
            </Button>
          ) : undefined
        }
      />

      {formError && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {formError}
        </p>
      )}

      <MergedAnnouncementsPanel
        holidays={holidays}
        general={general}
        variant={isAdmin ? 'page-admin' : 'page-viewer'}
        search={isAdmin ? search : undefined}
        onSearchChange={isAdmin ? setSearch : undefined}
        generalEmptyMessage="No announcements."
        announcementDetailBasePath={announcementDetailBasePath}
      />

      {isAdmin && (
        <AnnouncementFormModal
          open={formOpen}
          onClose={() => setFormOpen(false)}
          onSubmit={handleCreate}
          saving={saving}
        />
      )}
    </div>
  );
}
