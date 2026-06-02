import { Select } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import { ATTENDANCE_STATUSES } from '@/utils/constants';
import type { AttendanceRosterRow } from '@/utils/attendanceRoster';

interface AttendanceRosterProps {
  rows: AttendanceRosterRow[];
  onChange: (rows: AttendanceRosterRow[]) => void;
  disabled?: boolean;
}

export function AttendanceRoster({ rows, onChange, disabled }: AttendanceRosterProps) {
  const updateRow = (studentUserId: string, patch: Partial<AttendanceRosterRow>) => {
    onChange(rows.map((r) => (r.studentUserId === studentUserId ? { ...r, ...patch } : r)));
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="w-12 px-4 py-3" aria-label="Present" />
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
              Student
            </th>
            <th className="w-44 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {rows.map((row) => (
            <tr key={row.studentUserId} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={row.status === 'Present'}
                  disabled={disabled}
                  onChange={(e) =>
                    updateRow(row.studentUserId, {
                      status: e.target.checked ? 'Present' : '',
                    })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  aria-label={`${row.studentName} present`}
                />
              </td>
              <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.studentName}</td>
              <td className="px-4 py-3">
                <Select
                  value={row.status}
                  disabled={disabled}
                  onChange={(e) =>
                    updateRow(row.studentUserId, {
                      status: e.target.value as AttendanceRosterRow['status'],
                    })
                  }
                  className={cn(
                    'h-9 w-full max-w-[10rem] text-sm',
                    row.status === 'Present' && 'border-emerald-400',
                    row.status === 'Absent' && 'border-red-400',
                    row.status === 'Late' && 'border-amber-400'
                  )}
                >
                  <option value="">—</option>
                  {ATTENDANCE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
