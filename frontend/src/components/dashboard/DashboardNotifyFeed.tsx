import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell, CalendarClock, CalendarOff, Megaphone, RefreshCw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardNotifyApi } from '@/api/resources';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { getAnnouncementCategory } from '@/utils/announcements';
import { announcementsListPath } from '@/utils/announcementLinks';
import { learnerPortalPath } from '@/utils/learnerPortal';
import { isLeaveDecisionNotice } from '@/utils/notifyLeave';
import { notifyReadsChanged } from '@/utils/notifyEvents';
import { cn } from '@/utils/cn';
import type { Announcement, UserRole } from '@/types';

function categoryIcon(category: string) {
  switch (category) {
    case 'Leave':
      return CalendarOff;
    case 'Replacement':
      return RefreshCw;
    case 'SessionChange':
      return CalendarClock;
    default:
      return Megaphone;
  }
}

function categoryStyles(category: string) {
  switch (category) {
    case 'Leave':
      return 'border-amber-200 bg-amber-50/60';
    case 'Replacement':
      return 'border-emerald-200 bg-emerald-50/60';
    case 'SessionChange':
      return 'border-sky-200 bg-sky-50/60';
    default:
      return 'border-slate-200 bg-white';
  }
}

function leavePath(role: UserRole | 'Admin') {
  if (role === 'Admin') return '/admin/leave';
  if (role === 'Teacher') return '/teacher/leave';
  return learnerPortalPath('/student/leave', role);
}

interface DashboardNotifyFeedProps {
  role: UserRole | 'Admin';
  limit?: number;
  className?: string;
  title?: string;
  onFeedLoaded?: (items: Announcement[]) => void;
  autoMarkReadOnView?: boolean;
}

export function DashboardNotifyFeed({
  role,
  limit = 5,
  className,
  title = 'Notifications',
  onFeedLoaded,
  autoMarkReadOnView = false,
}: DashboardNotifyFeedProps) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const markedOnViewRef = useRef(false);

  const loadFeed = useCallback(() => {
    setLoading(true);
    return dashboardNotifyApi
      .getFeed(limit)
      .catch(() => [] as Announcement[])
      .then((data) => {
        setItems(data);
        onFeedLoaded?.(data);
        return data;
      })
      .finally(() => setLoading(false));
  }, [limit, onFeedLoaded]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const unreadCount = items.filter((item) => !item.isRead).length;

  useEffect(() => {
    if (!autoMarkReadOnView || role !== 'Parent' || markedOnViewRef.current || unreadCount === 0)
      return;

    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting) || markedOnViewRef.current) return;
        markedOnViewRef.current = true;
        void dashboardNotifyApi.markAllRead().then(() => {
          notifyReadsChanged();
          void loadFeed();
        });
      },
      { threshold: 0.35 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [autoMarkReadOnView, role, unreadCount, loadFeed]);

  const handleDismiss = async (item: Announcement) => {
    try {
      await dashboardNotifyApi.hide(item.id);
      notifyReadsChanged();
      setItems((prev) => prev.filter((row) => row.id !== item.id));
    } catch {
      // ignore
    }
  };

  const handleItemClick = async (item: Announcement) => {
    if (item.isRead) return;
    try {
      await dashboardNotifyApi.markRead(item.id);
      notifyReadsChanged();
      setItems((prev) =>
        prev.map((row) => (row.id === item.id ? { ...row, isRead: true } : row))
      );
    } catch {
      // ignore
    }
  };

  const announcementsPath = announcementsListPath(role);

  return (
    <div ref={cardRef} className={cn('h-full min-h-[16.5rem]', className)}>
      <Card className="flex h-full flex-col">
        <CardHeader className="p-5 pb-3 sm:p-5 sm:pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-base">
              <span className="relative">
                <Bell className="h-4 w-4 text-primary-600" />
                {unreadCount > 0 && (
                  <span
                    className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"
                    aria-label={`${unreadCount} unread`}
                  />
                )}
              </span>
              {title}
              {items.length > 0 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
                  {items.length}
                </span>
              )}
            </CardTitle>
            <Link
              to={announcementsPath}
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col p-5 pt-0 sm:p-5 sm:pt-0">
          {loading ? (
            <p className="py-4 text-center text-sm text-slate-500">Loading updates…</p>
          ) : items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-2 text-center">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Bell className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-medium text-slate-700">You&apos;re all caught up</p>
              <p className="mt-1 text-xs text-slate-500">No new notifications.</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map((item) => {
                const category = getAnnouncementCategory(item);
                const Icon = categoryIcon(category);
                const isLeaveRelated =
                  item.relatedType === 'LeaveRequest' ||
                  category === 'Leave' ||
                  category === 'Replacement';
                const detailPath = isLeaveRelated
                  ? leavePath(role)
                  : `${announcementsPath}/${item.id}`;
                const isUnread = !item.isRead;
                const showUnreadDot = isUnread && (isLeaveDecisionNotice(item) || isUnread);

                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center gap-2 rounded-lg border px-3 py-2',
                      categoryStyles(category)
                    )}
                  >
                    <div className="relative shrink-0">
                      <Icon className="h-4 w-4 text-slate-500" />
                      {showUnreadDot && (
                        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                      )}
                    </div>
                    <Link
                      to={detailPath}
                      state={isLeaveRelated ? undefined : { announcement: item }}
                      onClick={() => void handleItemClick(item)}
                      className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900 hover:text-primary-700 hover:underline"
                    >
                      {item.title}
                    </Link>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500">
                      {formatDateDDMMYYYY(item.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleDismiss(item)}
                      className="shrink-0 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-label="Dismiss notification"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
