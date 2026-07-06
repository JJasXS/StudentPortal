import { BookOpen, Calendar, Clock, Link2, User } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import type { SqlAccountChildEnrollment } from '@/types/sqlAccount';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';

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
    return (
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">{heading}</h2>
        <EmptyState
          icon={BookOpen}
          title="Could not load classes"
          description={error}
          compact
        />
      </section>
    );
  }

  if (enrollments.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">{heading}</h2>
        <EmptyState
          icon={BookOpen}
          title="No class available"
          description={`${branchName} has no enrolled classes yet.`}
          compact
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

function formatScheduleTime(start?: string | null, end?: string | null) {
  if (!start) return null;
  return end ? `${start} – ${end}` : start;
}

function EnrollmentRow({ enrollment }: { enrollment: SqlAccountChildEnrollment }) {
  const erpSchedule =
    enrollment.classDate
      ? formatDateDDMMYYYY(enrollment.classDate.slice(0, 10)) +
        (enrollment.classTime ? ` · ${enrollment.classTime}` : '')
      : enrollment.classDay || enrollment.classTime
        ? [enrollment.classDay, enrollment.classTime].filter(Boolean).join(' · ')
        : null;

  const portalSchedule = enrollment.linkedClassName
    ? [
        enrollment.linkedClassDayOfWeek,
        formatScheduleTime(enrollment.linkedClassStartTime, enrollment.linkedClassEndTime),
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <li className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
          <BookOpen className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="font-medium text-slate-900">{enrollment.className}</h3>
          {enrollment.studentName && (
            <p className="flex items-center gap-1.5 text-sm text-slate-700">
              <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {enrollment.studentName}
            </p>
          )}
          {enrollment.itemCode && (
            <p className="text-xs text-slate-500">Item code: {enrollment.itemCode}</p>
          )}

          {erpSchedule && (
            <p className="flex items-center gap-1.5 text-sm text-slate-600">
              <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span>
                ERP schedule: {erpSchedule}
              </span>
            </p>
          )}

          {enrollment.conductedBy && (
            <p className="flex items-center gap-1.5 text-sm text-slate-600">
              <User className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              Teacher: {enrollment.conductedBy}
            </p>
          )}

          {enrollment.linkedClassName && (
            <div className="mt-2 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900">
              <p className="flex items-center gap-1.5 font-medium">
                <Link2 className="h-3.5 w-3.5 shrink-0" />
                Portal class: {enrollment.linkedClassName}
              </p>
              {portalSchedule && (
                <p className="mt-1 flex items-center gap-1.5 text-emerald-800">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  {portalSchedule}
                </p>
              )}
              {enrollment.linkedClassTeacherName &&
                enrollment.linkedClassTeacherName !== enrollment.conductedBy && (
                <p className="mt-1 flex items-center gap-1.5 text-emerald-800">
                  <User className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  {enrollment.linkedClassTeacherName}
                </p>
              )}
              {enrollment.nextSessionDate && (
                <p className="mt-1 flex items-center gap-1.5 text-emerald-800">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  Next session: {formatDateDDMMYYYY(enrollment.nextSessionDate)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}
