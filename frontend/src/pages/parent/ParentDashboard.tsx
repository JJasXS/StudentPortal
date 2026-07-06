import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Baby } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { invoicesApi } from '@/api/resources';
import { mockInvoices } from '@/utils/mockData';
import { applyInvoicePatches } from '@/utils/mockInvoicePayments';
import { formatRm, unpaidInvoiceTotal } from '@/utils/invoiceBilling';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonListRows } from '@/components/ui/Skeleton';
import { ParentChildRecordPanel } from '@/components/parent/ParentChildRecordPanel';
import { ParentProgressSection } from '@/components/parent/ParentProgressSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useParentChildren } from '@/hooks/useParentChildren';

export default function ParentDashboard() {
  const { user } = useAuth();
  const { records, pending, loading } = useParentChildren(user?.id);
  const [unpaidTotal, setUnpaidTotal] = useState(0);
  const [unpaidCount, setUnpaidCount] = useState(0);

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

  const hasAny = records.length > 0 || pending.length > 0;

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
            <SkeletonListRows rows={2} />
          ) : !hasAny ? (
            <EmptyState
              icon={Baby}
              title="No children linked yet"
              description="Register your child to view classes, attendance, and progress in one place."
              compact
              actions={[{ label: 'Register a child', href: '/parent/children' }]}
            />
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
