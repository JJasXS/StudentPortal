import { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { classSessionsApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import type { ClassSessionChangeHistory } from '@/types';

function formatChangeSummary(entry: ClassSessionChangeHistory) {
  const before = `${formatDateDDMMYYYY(entry.previousSessionDate)} ${entry.previousStartTime}–${entry.previousEndTime}`;
  if (entry.changeType === 'Cancellation') {
    return `Cancelled ${before}`;
  }
  const after =
    entry.newSessionDate && entry.newStartTime && entry.newEndTime
      ? `${formatDateDDMMYYYY(entry.newSessionDate)} ${entry.newStartTime}–${entry.newEndTime}`
      : 'new slot';
  return `Replaced ${before} → ${after}`;
}

interface ClassSessionChangeHistoryPanelProps {
  classId: string;
  refreshKey?: number;
}

export function ClassSessionChangeHistoryPanel({ classId, refreshKey = 0 }: ClassSessionChangeHistoryPanelProps) {
  const [entries, setEntries] = useState<ClassSessionChangeHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    classSessionsApi
      .getChanges({ classId })
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
        <History className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800">Cancellation & replacement history</h3>
      </div>
      {loading ? (
        <p className="px-4 py-6 text-sm text-slate-500">Loading history…</p>
      ) : entries.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">
          No cancellations or replacements recorded yet.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {entries.map((entry) => (
            <li key={entry.id} className="px-4 py-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{formatChangeSummary(entry)}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {entry.changeType}
                    {entry.actorName ? ` · ${entry.actorName}` : ''}
                    {' · '}
                    {formatDateDDMMYYYY(entry.createdAt.slice(0, 10))}
                  </p>
                  {entry.reason && (
                    <p className="mt-1 text-xs text-slate-600">Reason: {entry.reason}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    entry.changeType === 'Cancellation'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-violet-100 text-violet-800'
                  }`}
                >
                  {entry.changeType}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
