import { useEffect, useMemo, useState, useCallback } from 'react';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { DashboardNotifyFeed } from '@/components/dashboard/DashboardNotifyFeed';
import { ParentOutstandingFeesCard } from '@/components/parent/ParentOutstandingFeesCard';
import { ParentEnrolledClassesSection } from '@/components/parent/ParentEnrolledClassesSection';
import { Card, CardContent } from '@/components/ui/Card';
import { useSqlAccountChildren } from '@/hooks/useSqlAccountChildren';
import { useParentLeaveNotifyToasts } from '@/hooks/useParentLeaveNotifyToasts';
import { parentsApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
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

export default function ParentDashboardPage() {
  const { user } = useAuth();
  const { children, loading } = useSqlAccountChildren(true);
  const [eventsByBranch, setEventsByBranch] = useState<Record<string, ErpCalendarEvent[]>>({});
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
    if (children.length === 0) return;
    Promise.all(
      children.map(async (child) => {
        try {
          const events = await parentsApi.getMyCalendarEvents(child.branchName);
          return [child.branchName, [...events]] as const;
        } catch {
          return [child.branchName, [] as ErpCalendarEvent[]] as const;
        }
      })
    ).then((pairs) => {
      const map: Record<string, ErpCalendarEvent[]> = {};
      for (const [branch, events] of pairs) map[branch] = [...events];
      setEventsByBranch(map);
    });
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
    <div className="mx-auto max-w-2xl space-y-4">
      <PageHeader
        title="Dashboard"
        description={user?.fullName ? `Welcome, ${user.fullName}` : 'Your children'}
      />

      <DashboardNotifyFeed
        role="Parent"
        onFeedLoaded={handleFeedLoaded}
        autoMarkReadOnView
      />

      <ParentOutstandingFeesCard invoices={outstandingInvoices} />

      {!loading && children.length > 0 && (
        <ParentEnrolledClassesSection students={children} />
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : sections.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          No children linked to your account.
        </p>
      ) : (
        <div className="space-y-4">
          {sections.map(({ child, label, next }) => (
            <Card key={child.branchName}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
                  <Link
                    to={`/parent/children?child=${encodeURIComponent(child.branchName.toLowerCase())}&tab=assignment`}
                    className="text-xs font-medium text-primary-600 hover:underline"
                  >
                    View details
                  </Link>
                </div>
                {next ? (
                  <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Next class
                    </p>
                    <p className="mt-1 font-medium text-slate-900">{next.className ?? 'Class'}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        {formatDateDDMMYYYY(next.sessionDate)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {formatTimeRange(next.startTime, next.endTime)}
                      </span>
                      {next.teacherName && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-slate-400" />
                          {next.teacherName}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No upcoming class scheduled.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
