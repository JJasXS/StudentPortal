import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { ParentChildRecordPanel } from '@/components/parent/ParentChildRecordPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { useParentChildren } from '@/hooks/useParentChildren';

export default function ParentDashboard() {
  const { user } = useAuth();
  const { records, pending, loading } = useParentChildren(user?.id);

  const hasAny = records.length > 0 || pending.length > 0;

  return (
    <div>
      <PageHeader
        title="Parent Dashboard"
        description={`Welcome, ${user?.fullName} — your children's classes and attendance`}
      />

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
    </div>
  );
}
