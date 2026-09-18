import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  BookOpenCheck,
  CalendarDays,
  CalendarOff,
  Clock,
  GraduationCap,
  Megaphone,
  User,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { DashboardNotifyFeed } from '@/components/dashboard/DashboardNotifyFeed';
import { DashboardCentreFooter } from '@/components/dashboard/DashboardCentreFooter';
import { ParentOutstandingFeesCard } from '@/components/parent/ParentOutstandingFeesCard';
import { ParentEnrolledClassesSection } from '@/components/parent/ParentEnrolledClassesSection';
import { Card, CardContent } from '@/components/ui/Card';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { useSqlAccountChildren } from '@/hooks/useSqlAccountChildren';
import { useParentLeaveNotifyToasts } from '@/hooks/useParentLeaveNotifyToasts';
import { parentsApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { cn } from '@/utils/cn';
import type { Announcement } from '@/types';
import type { ErpCalendarEvent, SqlAccountOutstandingInvoice } from '@/types/sqlAccount';

function formatTimeRange(start?: string, end?: string) {
  if (!start) return '';
  return end ? `${start} – ${end}` : start;
}

function nextEventForBranch(events: ErpCalendarEvent[]): ErpCalendarEvent | null {
  const now = new Date();
  const upcoming = events
    .filter((e) => e.status !== 'Cancelled' && new Date(e.sessionDate) >= now)
    .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
  return upcoming[0] ?? null;
}

const QUICK_LINKS = [
  { to: '/parent/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/parent/children', label: 'Assignment', icon: GraduationCap },
  { to: '/parent/leave', label: 'Leave', icon: CalendarOff },
  { to: '/parent/announcements', label: 'Announcements', icon: Megaphone },
] as const;

function ParentQuickLinks() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {QUICK_LINKS.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-800 shadow-sm transition hover:border-primary-200 hover:bg-primary-50/50 hover:text-primary-800"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
            <Icon className="h-4 w-4" />
          </span>
          {label}
        </Link>
      ))}
    </div>
  );
}

function ChildNextClassCard({
  label,
  branchName,
  next,
  eventsLoading,
}: {
  label: string;
  branchName: string;
  next: ErpCalendarEvent | null;
  eventsLoading: boolean;
}) {
  const detailHref = `/parent/children?child=${encodeURIComponent(branchName.toLowerCase())}&tab=assignment`;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">
              {label.slice(0, 1).toUpperCase()}
            </span>
            <h2 className="truncate text-base font-semibold text-slate-900">{label}</h2>
          </div>
          <Link
            to={detailHref}
            className="shrink-0 text-xs font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            View details
          </Link>
        </div>

        <div className="p-4">
          {eventsLoading ? (
            <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ) : next ? (
            <div className="rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50/80 via-white to-slate-50 p-3.5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                  <BookOpenCheck className="h-3 w-3" />
                  Next class
                </span>
              </div>
              <p className="text-lg font-semibold text-slate-900">{next.className ?? 'Class'}</p>
              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-4 w-4 text-primary-500" />
                  {formatDateDDMMYYYY(next.sessionDate)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary-500" />
                  {formatTimeRange(next.startTime, next.endTime)}
                </span>
                {next.teacherName && (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-4 w-4 text-primary-500" />
                    {next.teacherName}
                  </span>
                )}
              </div>
              <Link
                to="/parent/schedule"
                className="mt-3 inline-block text-xs font-medium text-primary-600 hover:underline"
              >
                Open schedule
              </Link>
            </div>
          ) : (
            <p
              className={cn(
                'rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center text-sm text-slate-500'
              )}
            >
              No upcoming class scheduled.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ParentDashboardPage() {
  const { user } = useAuth();
  const { children, loading } = useSqlAccountChildren(true);
  const [eventsByBranch, setEventsByBranch] = useState<Record<string, ErpCalendarEvent[]>>({});
  const [eventsLoading, setEventsLoading] = useState(false);
  const [notifyItems, setNotifyItems] = useState<Announcement[]>([]);
  const [outstandingInvoices, setOutstandingInvoices] = useState<SqlAccountOutstandingInvoice[]>([]);

  const handleFeedLoaded = useCallback((items: Announcement[]) => {
    setNotifyItems(items);
  }, []);

  useParentLeaveNotifyToasts(notifyItems, user?.role === 'Parent');

  useEffect(() => {
    parentsApi
      .getOutstandingInvoices()
      .then(setOutstandingInvoices)
      .catch(() => setOutstandingInvoices([]));
  }, []);

  useEffect(() => {
    if (children.length === 0) {
      setEventsByBranch({});
      setEventsLoading(false);
      return;
    }
    setEventsLoading(true);
    Promise.all(
      children.map(async (child) => {
        try {
          const events = await parentsApi.getMyCalendarEvents(child.branchName);
          return [child.branchName, [...events]] as const;
        } catch {
          return [child.branchName, [] as ErpCalendarEvent[]] as const;
        }
      })
    )
      .then((pairs) => {
        const map: Record<string, ErpCalendarEvent[]> = {};
        for (const [branch, events] of pairs) map[branch] = [...events];
        setEventsByBranch(map);
      })
      .finally(() => setEventsLoading(false));
  }, [children]);

  const sections = useMemo(
    () =>
      children.map((child) => {
        const events = eventsByBranch[child.branchName] ?? [];
        const next = nextEventForBranch(events);
        const label = child.attention?.trim() || child.branchName;
        return { child, label, next };
      }),
    [children, eventsByBranch]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description={
          user?.fullName
            ? `Overview for your family · ${user.fullName}`
            : 'Overview for your family'
        }
      />

      <ParentQuickLinks />

      <DashboardNotifyFeed
        role="Parent"
        onFeedLoaded={handleFeedLoaded}
        autoMarkReadOnView
      />

      <ParentOutstandingFeesCard invoices={outstandingInvoices} />

      {!loading && children.length > 0 && (
        <ParentEnrolledClassesSection students={children} />
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Your children
          </h2>
          {!loading && sections.length > 0 && (
            <Link
              to="/parent/children"
              className="text-xs font-medium text-primary-600 hover:underline"
            >
              Manage
            </Link>
          )}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : sections.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center text-sm text-slate-500">
            No children linked to your account.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {sections.map(({ child, label, next }) => (
              <ChildNextClassCard
                key={child.branchName}
                label={label}
                branchName={child.branchName}
                next={next}
                eventsLoading={eventsLoading && !eventsByBranch[child.branchName]}
              />
            ))}
          </div>
        )}
      </section>

      <DashboardCentreFooter />
    </div>
  );
}
