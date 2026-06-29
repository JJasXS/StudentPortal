import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Megaphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { announcementsApi } from '@/api/resources';
import { cn } from '@/utils/cn';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { splitAnnouncementsForRole } from '@/utils/announcements';
import { mockAnnouncements } from '@/utils/mockData';
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_CATEGORY_LABELS,
} from '@/utils/notifications';
import type { Announcement } from '@/types';
import type { AppNotification } from '@/types/notification';

type Tab = 'All' | 'Announcements';

export default function LearnerNotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('All');
  const [items, setItems] = useState<AppNotification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const [list, allAnnouncements] = await Promise.all([
      loadNotifications(user.id),
      announcementsApi.getAll().catch(() => mockAnnouncements),
    ]);
    setItems(list);
    const split = splitAnnouncementsForRole(allAnnouncements, 'Student');
    setAnnouncements([...split.holidays, ...split.general]);
    setLoading(false);
  }, [user?.id, user?.role]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unreadCount = items.filter((n) => !n.isRead).length;

  const handleOpen = async (notification: AppNotification) => {
    if (!user?.id) return;
    if (!notification.isRead) {
      await markNotificationRead(user.id, notification.id);
    }
    if (notification.linkPath) {
      navigate(notification.linkPath.replace(/^\/parent\//, '/student/'));
    }
    await refresh();
  };

  const handleMarkAll = async () => {
    if (!user?.id) return;
    await markAllNotificationsRead(user.id);
    await refresh();
  };

  const tabs = useMemo(() => ['All', 'Announcements'] as const, []);

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Centre updates, lesson notes, and alerts"
        actions={
          tab === 'All' && unreadCount > 0 ? (
            <Button type="button" variant="outline" onClick={handleMarkAll}>
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <Card className="overflow-hidden">
        <SlidingTabs tabs={tabs} value={tab} onChange={(v) => setTab(v as Tab)} />

        <CardContent className="p-0">
          {tab === 'Announcements' ? (
            <div className="p-4 sm:p-6">
              {announcements.length === 0 ? (
                <p className="text-sm text-slate-500">No announcements yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {announcements.map((a) => (
                    <li key={a.id}>
                      <Link
                        to={`/student/announcements/${a.id}`}
                        className="block py-3 text-sm font-medium text-slate-900 hover:text-primary-700"
                      >
                        {a.title}
                      </Link>
                      <p className="pb-3 text-xs text-slate-500">
                        {formatDateDDMMYYYY(a.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : loading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">Loading…</p>
          ) : items.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Bell className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">No notifications yet.</p>
              <button
                type="button"
                onClick={() => setTab('Announcements')}
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
              >
                <Megaphone className="h-3.5 w-3.5" />
                View announcements
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleOpen(item)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-4 text-left hover:bg-slate-50',
                      !item.isRead && 'bg-primary-50/30'
                    )}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100">
                      <Bell className="h-4 w-4 text-primary-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-slate-900">{item.title}</p>
                        {!item.isRead && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
                        )}
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        {NOTIFICATION_CATEGORY_LABELS[item.category] ?? item.category} ·{' '}
                        {formatDateDDMMYYYY(item.createdAt)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
