import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_CATEGORY_LABELS,
} from '@/utils/notifications';
import type { AppNotification } from '@/types/notification';

export default function ParentNotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const list = await loadNotifications(user.id);
    setItems(list);
    setLoading(false);
  }, [user?.id]);

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
      navigate(notification.linkPath);
    } else {
      await refresh();
    }
  };

  const handleMarkAll = async () => {
    if (!user?.id) return;
    await markAllNotificationsRead(user.id);
    await refresh();
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Lesson notes, billing, attendance updates, and centre news"
        actions={
          unreadCount > 0 ? (
            <Button type="button" variant="outline" onClick={handleMarkAll}>
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">Loading…</p>
          ) : items.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Bell className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">No notifications yet.</p>
              <Link
                to="/parent/announcements"
                className="mt-2 inline-block text-sm font-medium text-primary-600 hover:underline"
              >
                View announcements
              </Link>
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
