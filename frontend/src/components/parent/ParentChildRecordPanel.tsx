import { Link } from 'react-router-dom';
import { Calendar, ChevronRight, ClipboardCheck, Clock, MapPin } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { ChildRecord } from '@/hooks/useParentChildren';

interface ParentChildRecordPanelProps {
  record: ChildRecord;
}

export function ParentChildRecordPanel({ record }: ParentChildRecordPanelProps) {
  const { child, classes, attendance } = record;
  const rate =
    attendance.total > 0 ? Math.round((attendance.present / attendance.total) * 100) : null;

  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div>
          <h3 className="font-semibold text-slate-900">{child.fullName}</h3>
          <p className="text-xs text-slate-500">{child.studentCode}</p>
        </div>
        <StatusBadge status={child.isActive !== false ? 'Active' : 'Cancelled'} />
      </div>

      <div className="grid gap-4 p-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Classes
          </p>
          {classes.length === 0 ? (
            <p className="text-sm text-slate-500">No active classes</p>
          ) : (
            <ul className="space-y-2">
              {classes.map((c) => (
                <li
                  key={`${c.className}-${c.dayOfWeek}`}
                  className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-slate-900">{c.className}</p>
                  {c.courseName && <p className="text-xs text-slate-500">{c.courseName}</p>}
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500">
                    {c.dayOfWeek && (
                      <span className="inline-flex items-center gap-0.5">
                        <Calendar className="h-3 w-3" />
                        {c.dayOfWeek}
                      </span>
                    )}
                    {c.startTime && c.endTime && (
                      <span className="inline-flex items-center gap-0.5">
                        <Clock className="h-3 w-3" />
                        {c.startTime}–{c.endTime}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Attendance
          </p>
          {attendance.total === 0 ? (
            <p className="text-sm text-slate-500">No records yet</p>
          ) : (
            <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-3">
              <div className="flex items-center gap-2 text-slate-700">
                <ClipboardCheck className="h-4 w-4 text-primary-600" />
                <span className="text-2xl font-bold tabular-nums text-slate-900">
                  {attendance.present}/{attendance.total}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">sessions marked present</p>
              {rate != null && (
                <p className="mt-2 text-sm font-medium text-primary-700">{rate}% attendance</p>
              )}
            </div>
          )}
          <Link
            to="/parent/attendance"
            className="mt-3 inline-flex items-center gap-0.5 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            View attendance
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {child.schoolName && (
        <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
          <MapPin className="mr-1 inline h-3 w-3" />
          {child.schoolName}
        </div>
      )}
    </article>
  );
}
