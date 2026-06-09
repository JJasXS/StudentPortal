import { useEffect, useMemo, useState } from 'react';
import { Calendar, Download, FileSpreadsheet, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { attendanceApi } from '@/api/resources';
import { mockAttendance } from '@/utils/mockData';
import { ATTENDANCE_STATUSES } from '@/utils/constants';
import { filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { exportAttendanceCsv, exportAttendancePdf } from '@/utils/attendanceExport';
import type { Attendance } from '@/types';

const STATUS_TABS = ['All', ...ATTENDANCE_STATUSES] as const;

function sessionDateKey(value?: string) {
  if (!value) return '';
  return value.slice(0, 10);
}

export default function AttendanceOverview() {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [statusTab, setStatusTab] = useState('All');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    attendanceApi.getAll().then(setAttendance).catch(() => setAttendance(mockAttendance));
  }, []);

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

  return (
    <div>
      <PageHeader
        title="Attendance Overview"
        description="Filter by student name, date, and attendance status"
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportAttendanceCsv(filtered)}
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => exportAttendancePdf(filtered)}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export PDF
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          {/* Name + date filters */}
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
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

          {/* Table shell: sliding status tabs + data */}
          <div className="overflow-hidden">
            <SlidingTabs
              tabs={STATUS_TABS}
              value={statusTab}
              onChange={setStatusTab}
              counts={statusCounts}
              trailing={`${filtered.length} of ${attendance.length}`}
            />

            <DataTable
              embedded
              data={filtered}
              columns={[
                {
                  key: 'sessionDate',
                  header: 'Date',
                  render: (a) => formatDateDDMMYYYY(a.sessionDate),
                },
                { key: 'className', header: 'Class' },
                { key: 'studentName', header: 'Student' },
                { key: 'remarks', header: 'Remarks', render: (a) => a.remarks || '—' },
              ]}
              emptyMessage={
                hasActiveFilters
                  ? 'No attendance records match your filters.'
                  : 'No attendance records found.'
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
