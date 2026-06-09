import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { invoicesApi } from '@/api/resources';
import { mockInvoices } from '@/utils/mockData';
import { applyInvoicePatches } from '@/utils/mockInvoicePayments';
import { formatRm, unpaidInvoiceTotal } from '@/utils/invoiceBilling';
import { PageHeader } from '@/components/PageHeader';
import { ParentChildRecordPanel } from '@/components/parent/ParentChildRecordPanel';
import { ParentProgressSection } from '@/components/parent/ParentProgressSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { useParentChildren } from '@/hooks/useParentChildren';
import { loadNotifications, NOTIFICATION_CATEGORY_LABELS } from '@/utils/notifications';

export default function ParentDashboard() {
  const { user } = useAuth();
  const { records, pending, loading } = useParentChildren(user?.id);
  const [unpaidTotal, setUnpaidTotal] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<
    Awaited<ReturnType<typeof loadNotifications>>
  >([]);

  const studentUserIds = useMemo(
    () => records.map((r) => r.child.userId).filter(Boolean) as string[],
    [records]
  );

  const loadBilling = useCallback(() => {
    if (!user?.id) return;
    invoicesApi
      .getAll()
      .then((data) => {
        const mine = applyInvoicePatches(
          data.filter((i) => i.parentUserId === user.id)
        );
        const unpaid = mine.filter((i) => i.status === 'Unpaid');
        setUnpaidCount(unpaid.length);
        setUnpaidTotal(unpaidInvoiceTotal(mine));
      })
      .catch(() => {
        const mine = applyInvoicePatches(
          mockInvoices.filter((i) => i.parentUserId === user.id)
        );
        const unpaid = mine.filter((i) => i.status === 'Unpaid');
        setUnpaidCount(unpaid.length);
        setUnpaidTotal(unpaidInvoiceTotal(mine));
      });
  }, [user?.id]);

  useEffect(() => {
    loadBilling();
  }, [loadBilling]);

  useEffect(() => {
    if (!user?.id) return;
    loadNotifications(user.id).then((list) => setRecentNotifications(list.slice(0, 4)));
  }, [user?.id]);

  const hasAny = records.length > 0 || pending.length > 0;
  const unreadNotifications = recentNotifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <PageHeader
        title="Parent Dashboard"
        description={`Welcome, ${user?.fullName} — your children's classes, progress, and updates`}
      />

      {unpaidCount > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">
              {unpaidCount} course fee{unpaidCount === 1 ? '' : 's'} due
            </span>
            {' — '}
            {formatRm(unpaidTotal)}
          </p>
          <Link
            to="/parent/invoices"
            className="text-sm font-medium text-primary-700 hover:text-primary-800 hover:underline"
          >
            Pay now →
          </Link>
        </div>
      )}

      {recentNotifications.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              Recent notifications
              {unreadNotifications > 0 && (
                <span className="ml-2 rounded-full bg-primary-100 px-2 py-0.5 text-xs font-semibold text-primary-700">
                  {unreadNotifications} new
                </span>
              )}
            </CardTitle>
            <Link
              to="/parent/notifications"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0 pt-0">
            {recentNotifications.map((item) => (
              <Link
                key={item.id}
                to={item.linkPath ?? '/parent/notifications'}
                className={cn(
                  'block px-4 py-3 hover:bg-slate-50',
                  !item.isRead && 'bg-primary-50/30'
                )}
              >
                <p className="text-sm font-medium text-slate-900">{item.title}</p>
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">{item.message}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
                  {NOTIFICATION_CATEGORY_LABELS[item.category] ?? item.category} ·{' '}
                  {formatDateDDMMYYYY(item.createdAt)}
                </p>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">My children</CardTitle>
          <Link
            to="/parent/children"
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Manage profiles
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : !hasAny ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
              No children linked yet.{' '}
              <Link to="/parent/children" className="font-medium text-primary-600 hover:underline">
                Register a child
              </Link>
            </p>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <ParentChildRecordPanel key={record.child.id} record={record} />
              ))}
              {pending.map((reg) => (
                <div
                  key={reg.id}
                  className="rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm"
                >
                  <p className="font-medium text-amber-900">{reg.fullName}</p>
                  <p className="text-amber-700">Registration pending — not linked yet</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {studentUserIds.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Learning progress</CardTitle>
            <Link
              to="/parent/progress"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Full progress dashboard →
            </Link>
          </CardHeader>
          <CardContent className="pt-0">
            <ParentProgressSection studentUserIds={studentUserIds} embedded />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
