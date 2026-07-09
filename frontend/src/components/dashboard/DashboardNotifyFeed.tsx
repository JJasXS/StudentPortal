import { useEffect, useState } from 'react';
import { Bell, CalendarClock, CalendarOff, Megaphone, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardNotifyApi } from '@/api/resources';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { getAnnouncementCategory } from '@/utils/announcements';
import { announcementsListPath } from '@/utils/announcementLinks';
import { learnerPortalPath } from '@/utils/learnerPortal';
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
}

export function DashboardNotifyFeed({ role, limit = 5, className }: DashboardNotifyFeedProps) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    dashboardNotifyApi
      .getFeed(limit)
      .catch(() => [] as Announcement[])
      .then(setItems)
      .finally(() => setLoading(false));
  }, [limit]);

  const announcementsPath = announcementsListPath(role);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-primary-600" />
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

            return (
              <div
                key={item.id}
                className={`rounded-lg border px-4 py-3 ${categoryStyles(category)}`}
              >
                <div className="flex gap-3">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <Link
                        to={detailPath}
                        state={isLeaveRelated ? undefined : { announcement: item }}
                        className="font-medium text-slate-900 hover:text-primary-700 hover:underline"
                      >
                        {item.title}
                      </Link>
                      <span className="shrink-0 text-xs tabular-nums text-slate-500">
                        {formatDateDDMMYYYY(item.createdAt)}
                      </span>
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
  );
}
