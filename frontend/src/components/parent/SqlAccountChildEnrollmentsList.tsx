import { BookOpen, Calendar, FileText, Hash } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import type { SqlAccountChildEnrollment } from '@/types/sqlAccount';

interface SqlAccountChildEnrollmentsListProps {
  branchName: string;
  enrollments: SqlAccountChildEnrollment[];
  loading?: boolean;
  error?: string;
  title?: string;
}

export function SqlAccountChildEnrollmentsList({
  branchName,
  enrollments,
  loading = false,
  error = '',
  title,
}: SqlAccountChildEnrollmentsListProps) {
  const heading = title ?? `${branchName} — enrolled classes`;

  if (loading) {
    return (
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">{heading}</h2>
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    );
  }

  if (error) {
    return <EmptyState title="Could not load classes" description={error} />;
  }

  if (enrollments.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">{heading}</h2>
        <EmptyState
          title="No classes enrolled yet"
          description={`${branchName} has no active sales order lines in SQL Account.`}
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-slate-900">{heading}</h2>
      <ul className="space-y-3">
        {enrollments.map((enrollment, index) => (
          <EnrollmentRow key={`${enrollment.docNo}-${enrollment.className}-${index}`} enrollment={enrollment} />
        ))}
      </ul>
    </section>
  );
}

function EnrollmentRow({ enrollment }: { enrollment: SqlAccountChildEnrollment }) {
  return (
    <li className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="font-medium text-slate-900">{enrollment.className}</h3>
          <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
            {enrollment.docNo && (
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <dt className="sr-only">Order</dt>
                <dd>{enrollment.docNo}</dd>
              </div>
            )}
            {enrollment.docDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                <dt className="sr-only">Date</dt>
                <dd>{enrollment.docDate}</dd>
              </div>
            )}
            {enrollment.qty && (
              <div className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 text-slate-400" />
                <dt className="sr-only">Quantity</dt>
                <dd>Qty {enrollment.qty}</dd>
              </div>
            )}
            {enrollment.amount && (
              <div>
                <dt className="sr-only">Amount</dt>
                <dd className="font-medium text-slate-700">{enrollment.amount}</dd>
              </div>
            )}
          </dl>
          {enrollment.itemCode && (
            <p className="text-xs text-slate-500">Item: {enrollment.itemCode}</p>
          )}
        </div>
      </div>
    </li>
  );
}
