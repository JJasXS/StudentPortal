import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { classAssignmentLogsApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import type { ClassAssignmentChangeLog } from '@/types';

function formatSchedule(day?: string | null, start?: string | null, end?: string | null) {
  if (!day && !start) return null;
  const time = start && end ? ` ${start}–${end}` : start ? ` ${start}` : '';
  return `${day ?? ''}${time}`.trim();
}

function formatSession(date?: string | null, start?: string | null, end?: string | null) {
  if (!date) return null;
  const time = start && end ? ` ${start}–${end}` : '';
  return `${formatDateDDMMYYYY(date)}${time}`;
}

function formatChangeSummary(entry: ClassAssignmentChangeLog): string {
  const { entityType, operation } = entry;

  if (entityType === 'Enrollment') {
    const student = entry.studentName ?? 'Student';
    if (operation === 'Create') return `Assigned ${student} to class`;
    if (operation === 'Delete') return `Removed ${student} from class`;
    return `Updated enrollment for ${student}: ${entry.previousStatus} → ${entry.newStatus}`;
  }

  if (entityType === 'Class') {
    if (entry.previousTeacherName || entry.newTeacherName) {
      return `Teacher changed: ${entry.previousTeacherName ?? '—'} → ${entry.newTeacherName ?? '—'}`;
    }
    const before = formatSchedule(
      entry.previousDayOfWeek,
      entry.previousClassStartTime,
      entry.previousClassEndTime
    );
    const after = formatSchedule(entry.newDayOfWeek, entry.newClassStartTime, entry.newClassEndTime);
    return `Schedule changed: ${before ?? '—'} → ${after ?? '—'}`;
  }

  if (entityType === 'ClassSession') {
    const before = formatSession(
      entry.previousSessionDate,
      entry.previousSessionStartTime,
      entry.previousSessionEndTime
    );
    const after = formatSession(entry.newSessionDate, entry.newSessionStartTime, entry.newSessionEndTime);
    if (operation === 'Create') return `Session scheduled: ${after ?? 'new slot'}`;
    if (operation === 'Delete') return `Session cancelled: ${before ?? 'slot'}`;
    return `Session rescheduled: ${before ?? '—'} → ${after ?? '—'}`;
  }

  return `${operation} ${entityType}`;
}

function operationBadgeClass(operation: ClassAssignmentChangeLog['operation']) {
  switch (operation) {
    case 'Create':
      return 'bg-emerald-100 text-emerald-800';
    case 'Delete':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

interface ClassAssignmentChangeLogPanelProps {
  classId: string;
  refreshKey?: number;
}

export function ClassAssignmentChangeLogPanel({
  classId,
  refreshKey = 0,
}: ClassAssignmentChangeLogPanelProps) {
  const [entries, setEntries] = useState<ClassAssignmentChangeLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    classAssignmentLogsApi
      .getAll({ classId })
      .then((rows) => {
        if (active) setEntries(rows);
      })
      .catch(() => {
        if (active) setEntries([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [classId, refreshKey]);

  return (
    <div className="border-t border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
        <ClipboardList className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800">Assignment & schedule change log</h3>
      </div>
      {loading ? (
        <p className="px-4 py-6 text-sm text-slate-500">Loading change log…</p>
      ) : entries.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">
          No student, teacher, or date/time changes recorded yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {entries.map((entry) => (
            <li key={entry.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{formatChangeSummary(entry)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {entry.entityType} · {entry.operation}
                    {entry.actorName ? ` · ${entry.actorName}` : ''}
                    {' · '}
                    {formatDateDDMMYYYY(entry.createdAt.slice(0, 10))}
                  </p>
                  {entry.reason && (
                    <p className="mt-1 text-xs text-slate-600">Reason: {entry.reason}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${operationBadgeClass(entry.operation)}`}
                >
                  {entry.operation}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
