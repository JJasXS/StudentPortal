import { useEffect, useMemo, useState } from 'react';
import { Calendar, Pencil, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { StudentFormModal } from '@/components/StudentFormModal';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { studentsApi } from '@/api/resources';
import { mockStudents } from '@/utils/mockData';
import { ACTIVE_STATUSES } from '@/utils/constants';
import { activeRecordStatus, filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { formatGender } from '@/utils/gender';
import { formToStudentPayload, type StudentFormValues } from '@/utils/studentForm';
import { logAdminAction } from '@/utils/auditLog';
import { AUDIT_ACTIONS } from '@/types/auditLog';
import type { StudentProfile } from '@/types';

const STATUS_TABS = ['All', ...ACTIVE_STATUSES] as const;

function dateOfBirthKey(value?: string) {
  if (!value) return '';
  return value.slice(0, 10);
}

export default function StudentsManagement() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusTab, setStatusTab] = useState('All');
  const [editing, setEditing] = useState<StudentProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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

  const handleSave = async (values: StudentFormValues) => {
    if (!editing) return;
    setSaving(true);
    setError('');
    const payload = formToStudentPayload(values);

    try {
      const updated =
        import.meta.env.VITE_USE_MOCK === 'true'
          ? {
              ...editing,
              fullName: payload.fullName,
              email: payload.email,
              studentCode: payload.studentCode,
              dateOfBirth: payload.dateOfBirth,
              gender: payload.gender,
              schoolName: payload.schoolName,
              notes: payload.notes,
            }
          : await studentsApi.update(editing.id, payload);
      setStudents((list) => list.map((s) => (s.id === editing.id ? { ...s, ...updated } : s)));
      setEditing(null);
      logAdminAction(user, {
        action: AUDIT_ACTIONS.studentUpdated,
        entityType: 'Student',
        entityId: editing.id,
        entityLabel: payload.fullName,
      });
    } catch {
      setStudents((list) =>
        list.map((s) =>
          s.id === editing.id
            ? {
                ...s,
                fullName: payload.fullName,
                email: payload.email,
                studentCode: payload.studentCode,
                dateOfBirth: payload.dateOfBirth,
                gender: payload.gender,
                schoolName: payload.schoolName,
                notes: payload.notes,
              }
            : s
        )
      );
      setError('Could not save to server — change applied locally.');
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Students Management"
        description="Filter by name, date of birth, and record status"
      />

      {error && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

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
              centered
              data={filtered}
              columns={[
                {
                  key: 'studentCode',
                  header: 'Code',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (s) => s.studentCode,
                },
                {
                  key: 'fullName',
                  header: 'Name',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (s) => s.fullName,
                },
                {
                  key: 'email',
                  header: 'Email',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (s) => s.email,
                },
                {
                  key: 'dateOfBirth',
                  header: 'Date of birth',
                  sortable: true,
                  sortType: 'date',
                  getSortValue: (s) => s.dateOfBirth ?? '',
                  render: (s) => formatDateDDMMYYYY(s.dateOfBirth),
                },
                {
                  key: 'schoolName',
                  header: 'School',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (s) => s.schoolName ?? '',
                  render: (s) => s.schoolName || '—',
                },
                {
                  key: 'gender',
                  header: 'Gender',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (s) => s.gender ?? '',
                  render: (s) => formatGender(s.gender),
                },
                {
                  key: 'actions',
                  header: '',
                  className: 'w-[1%] whitespace-nowrap',
                  render: (s) => (
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setEditing(s)}
                        aria-label={`Edit ${s.fullName}`}
                        title="Edit student"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  ),
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

      <StudentFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        student={editing}
        onSubmit={handleSave}
        saving={saving}
      />
    </div>
  );
}
