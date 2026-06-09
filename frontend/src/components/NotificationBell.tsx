import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import {
  getUnreadNotificationCount,
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  NOTIFICATION_CATEGORY_LABELS,
} from '@/utils/notifications';
import type { AppNotification } from '@/types/notification';

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    const [count, list] = await Promise.all([
      getUnreadNotificationCount(user.id),
      loadNotifications(user.id),
    ]);
    setUnreadCount(count);
    setItems(list.slice(0, 8));
  }, [user?.id]);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!user) return null;

  const handleOpen = async () => {
    setOpen((v) => !v);
    await refresh();
  };

  const handleOpenItem = async (notification: AppNotification) => {
    if (!user?.id) return;
    if (!notification.isRead) {
      await markNotificationRead(user.id, notification.id);
    }
    setOpen(false);
    await refresh();
    if (notification.linkPath) {
      navigate(notification.linkPath);
    }
  };

  const handleReadAll = async () => {
    if (!user.id) return;
    await markAllNotificationsRead(user.id);
    await refresh();
  };

  const listPath =
    user.role === 'Parent'
      ? '/parent/notifications'
      : user.role === 'Admin'
        ? '/admin/notifications'
        : undefined;

  return (
    <div className="relative" ref={panelRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="relative hidden sm:inline-flex"
        onClick={handleOpen}
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleReadAll}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications yet.</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOpenItem(item)}
                  className={cn(
                    'block w-full border-b border-slate-100 px-3 py-2.5 text-left hover:bg-slate-50',
                    !item.isRead && 'bg-primary-50/40'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-slate-900">{item.title}</p>
                    {!item.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary-500" />}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">{item.message}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                    {NOTIFICATION_CATEGORY_LABELS[item.category] ?? item.category} ·{' '}
                    {formatDateDDMMYYYY(item.createdAt)}
                  </p>
                </button>
              ))
            )}
          </div>
          {listPath && (
            <div className="border-t border-slate-200 px-3 py-2">
              <Link
                to={listPath}
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                View all notifications →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
