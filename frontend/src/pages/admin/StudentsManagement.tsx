import { useEffect, useMemo, useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { studentsApi } from '@/api/resources';
import { mockStudents } from '@/utils/mockData';
import { ACTIVE_STATUSES } from '@/utils/constants';
import { activeRecordStatus, filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import { formatGender } from '@/utils/gender';
import type { StudentProfile } from '@/types';

const STATUS_TABS = ['All', ...ACTIVE_STATUSES] as const;

function dateOfBirthKey(value?: string) {
  if (!value) return '';
  return value.slice(0, 10);
}

function formatDateOfBirth(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function StudentsManagement() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusTab, setStatusTab] = useState('All');

  useEffect(() => {
    studentsApi
      .getAll()
      .then((data) => {
        if (data.length >= mockStudents.length) {
          setStudents(data);
          return;
        }
        const codes = new Set(data.map((s) => s.studentCode));
        setStudents([...data, ...mockStudents.filter((m) => !codes.has(m.studentCode))]);
      })
      .catch(() => setStudents(mockStudents));
  }, []);

  const filteredByNameAndDate = useMemo(() => {
    const name = nameFilter.trim().toLowerCase();
    return students.filter((s) => {
      if (name && !s.fullName.toLowerCase().includes(name)) return false;
      if (dateFilter && dateOfBirthKey(s.dateOfBirth) !== dateFilter) return false;
      return true;
    });
  }, [students, nameFilter, dateFilter]);

  const statusCounts = useMemo(() => {
    const perStatus = getStatusCounts(
      filteredByNameAndDate,
      (s) => activeRecordStatus(s.isActive),
      ACTIVE_STATUSES
    );
    const total = ACTIVE_STATUSES.reduce((sum, st) => sum + (perStatus[st] ?? 0), 0);
    return { All: total, ...perStatus };
  }, [filteredByNameAndDate]);

  const filtered = useMemo(
    () => filterByStatus(filteredByNameAndDate, statusTab, (s) => activeRecordStatus(s.isActive)),
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
        title="Students Management"
        description="Filter by name, date of birth, and record status"
      />
      <Card>
        <CardContent className="p-0">
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
                aria-label="Filter by date of birth"
                title="Date of birth"
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

          <div className="overflow-hidden">
            <SlidingTabs
              tabs={STATUS_TABS}
              value={statusTab}
              onChange={setStatusTab}
              counts={statusCounts}
              trailing={`${filtered.length} of ${students.length}`}
            />

            <DataTable
              embedded
              data={filtered}
              columns={[
                { key: 'studentCode', header: 'Code' },
                { key: 'fullName', header: 'Name' },
                { key: 'email', header: 'Email' },
                {
                  key: 'dateOfBirth',
                  header: 'Date of birth',
                  render: (s) => formatDateOfBirth(s.dateOfBirth),
                },
                { key: 'schoolName', header: 'School' },
                {
                  key: 'gender',
                  header: 'Gender',
                  render: (s) => formatGender(s.gender),
                },
              ]}
              emptyMessage={
                hasActiveFilters
                  ? 'No students match your filters.'
                  : 'No students found.'
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
