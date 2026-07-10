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
  onFeedLoaded?: (items: Announcement[]) => void;
  autoMarkReadOnView?: boolean;
}

export function DashboardNotifyFeed({
  role,
  limit = 5,
  className,
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
    <div ref={cardRef}>
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="relative">
              <Bell className="h-4 w-4 text-primary-600" />
              {unreadCount > 0 && (
                <span
                  className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"
                  aria-label={`${unreadCount} unread`}
                />
              )}
            </span>
            Notify
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
      <CardContent className="space-y-3 pt-0">
        {loading ? (
          <p className="py-4 text-center text-sm text-slate-500">Loading updates…</p>
        ) : items.length === 0 ? (
          <p className="py-4 text-center text-sm text-slate-500">No recent updates.</p>
        ) : (
          items.map((item) => {
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
                  'rounded-lg border px-4 py-3',
                  categoryStyles(category),
                  isUnread && 'ring-1 ring-red-200'
                )}
              >
                <div className="flex gap-3">
                  <div className="relative mt-0.5 shrink-0">
                    <Icon className="h-4 w-4 text-slate-500" />
                    {showUnreadDot && (
                      <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-red-500" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link
                        to={detailPath}
                        state={isLeaveRelated ? undefined : { announcement: item }}
                        onClick={() => void handleItemClick(item)}
                        className="font-medium text-slate-900 hover:text-primary-700 hover:underline"
                      >
                        {item.title}
                      </Link>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className="text-xs tabular-nums text-slate-500">
                          {formatDateDDMMYYYY(item.createdAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleDismiss(item)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          aria-label="Dismiss notification"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-600">{item.content}</p>
                    {item.createdByName && (
                      <p className="mt-1 text-xs text-slate-500">{item.createdByName}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
    </div>
  );
}
