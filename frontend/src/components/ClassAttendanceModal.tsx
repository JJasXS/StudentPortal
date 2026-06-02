import { useEffect, useMemo, useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { SearchBox } from '@/components/SearchBox';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { attendanceApi, classSessionsApi } from '@/api/resources';
import { ATTENDANCE_STATUSES } from '@/utils/constants';
import { attendanceForClass, sessionDateKey } from '@/utils/classAttendance';
import { filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { mockAttendance, mockClassSessions } from '@/utils/mockData';
import type { Attendance, ClassItem } from '@/types';

const STATUS_TABS = ['All', ...ATTENDANCE_STATUSES] as const;

interface ClassAttendanceModalProps {
  open: boolean;
  onClose: () => void;
  classItem: ClassItem | null;
}

export function ClassAttendanceModal({ open, onClose, classItem }: ClassAttendanceModalProps) {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [statusTab, setStatusTab] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    if (!open || !classItem) return;

    setNameFilter('');
    setStatusTab('All');
    setDateFilter('');
    setLoading(true);

    Promise.all([
      attendanceApi.getAll().catch(() => mockAttendance),
      classSessionsApi.getAll().catch(() => mockClassSessions),
    ])
      .then(([allAttendance, sessions]) => {
        setAttendance(
          attendanceForClass(allAttendance, sessions, classItem.id, classItem.className)
        );
      })
      .finally(() => setLoading(false));
  }, [open, classItem]);

  const filteredByNameAndDate = useMemo(() => {
    const name = nameFilter.trim().toLowerCase();
    return attendance.filter((a) => {
      if (name && !a.studentName?.toLowerCase().includes(name)) return false;
      if (dateFilter && sessionDateKey(a.sessionDate) !== dateFilter) return false;
      return true;
    });
  }, [attendance, nameFilter, dateFilter]);

  const statusCounts = useMemo(() => {
    const perStatus = getStatusCounts(filteredByNameAndDate, (a) => a.status, ATTENDANCE_STATUSES);
    const total = ATTENDANCE_STATUSES.reduce((sum, s) => sum + (perStatus[s] ?? 0), 0);
    return { All: total, ...perStatus };
  }, [filteredByNameAndDate]);

  const filtered = useMemo(
    () => filterByStatus(filteredByNameAndDate, statusTab, (a) => a.status),
    [filteredByNameAndDate, statusTab]
  );

  const hasActiveFilters = Boolean(nameFilter.trim() || dateFilter || statusTab !== 'All');

  const clearFilters = () => {
    setNameFilter('');
    setDateFilter('');
    setStatusTab('All');
  };

  if (!classItem) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Attendance — ${classItem.className}`}
      className="max-w-3xl"
    >
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
          <SearchBox
            value={nameFilter}
            onChange={setNameFilter}
            placeholder="Search by student name..."
            className="max-w-none flex-1"
          />
          <div className="relative shrink-0 sm:w-44">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="pl-9"
              aria-label="Filter by date"
            />
          </div>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="shrink-0 text-slate-600"
            >
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        <SlidingTabs
          tabs={STATUS_TABS}
          value={statusTab}
          onChange={setStatusTab}
          counts={statusCounts}
          trailing={`${filtered.length} record${filtered.length === 1 ? '' : 's'}`}
        />

        <DataTable
          embedded
          centered
          data={filtered}
          columns={[
            {
              key: 'sessionDate',
              header: 'Date',
              sortable: true,
              sortType: 'date',
              getSortValue: (a) => a.sessionDate,
              render: (a) => formatDateDDMMYYYY(a.sessionDate),
            },
            {
              key: 'studentName',
              header: 'Student',
              sortable: true,
              sortType: 'text',
              getSortValue: (a) => a.studentName ?? '',
              render: (a) => a.studentName || '—',
            },
            {
              key: 'status',
              header: 'Status',
              render: (a) => <StatusBadge status={a.status} />,
            },
            {
              key: 'remarks',
              header: 'Remarks',
              render: (a) => a.remarks || '—',
            },
          ]}
          emptyMessage={
            loading
              ? 'Loading…'
              : hasActiveFilters
                ? 'No attendance records match your filters.'
                : 'No attendance recorded for this class yet.'
          }
        />
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
