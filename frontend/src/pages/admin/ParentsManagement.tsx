import { useEffect, useMemo, useState } from 'react';
import { Calendar, Pencil, Users, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { ParentFormModal } from '@/components/ParentFormModal';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { ParentChildrenModal } from '@/components/ParentChildrenModal';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { parentsApi, studentsApi } from '@/api/resources';
import { mockParents, mockStudents } from '@/utils/mockData';
import { ACTIVE_STATUSES } from '@/utils/constants';
import { activeRecordStatus, filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { formToParentPayload, type ParentFormValues } from '@/utils/parentForm';
import type { ParentProfile, StudentProfile } from '@/types';

const STATUS_TABS = ['All', ...ACTIVE_STATUSES] as const;

function createdDateKey(value?: string) {
  if (!value) return '';
  return value.slice(0, 10);
}

export default function ParentsManagement() {
  const [parents, setParents] = useState<ParentProfile[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusTab, setStatusTab] = useState('All');
  const [viewParent, setViewParent] = useState<ParentProfile | null>(null);
  const [editing, setEditing] = useState<ParentProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    parentsApi
      .getAll()
      .then((data) => {
        if (data.length >= mockParents.length) {
          setParents(data);
          return;
        }
        const emails = new Set(data.map((p) => p.email));
        setParents([...data, ...mockParents.filter((m) => !emails.has(m.email))]);
      })
      .catch(() => setParents(mockParents));

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
    return parents.filter((p) => {
      if (name && !p.fullName.toLowerCase().includes(name)) return false;
      if (dateFilter && createdDateKey(p.createdAt) !== dateFilter) return false;
      return true;
    });
  }, [parents, nameFilter, dateFilter]);

  const statusCounts = useMemo(() => {
    const perStatus = getStatusCounts(
      filteredByNameAndDate,
      (p) => activeRecordStatus(p.isActive),
      ACTIVE_STATUSES
    );
    const total = ACTIVE_STATUSES.reduce((sum, st) => sum + (perStatus[st] ?? 0), 0);
    return { All: total, ...perStatus };
  }, [filteredByNameAndDate]);

  const filtered = useMemo(
    () => filterByStatus(filteredByNameAndDate, statusTab, (p) => activeRecordStatus(p.isActive)),
    [filteredByNameAndDate, statusTab]
  );

  const childCountByParent = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of parents) {
      map.set(p.id, p.children?.length ?? 0);
    }
    return map;
  }, [parents]);

  const hasActiveFilters = Boolean(nameFilter.trim() || dateFilter || statusTab !== 'All');

  const clearFilters = () => {
    setNameFilter('');
    setDateFilter('');
    setStatusTab('All');
  };

  const handleSave = async (values: ParentFormValues) => {
    if (!editing) return;
    setSaving(true);
    setError('');
    const payload = formToParentPayload(values);

    try {
      const updated =
        import.meta.env.VITE_USE_MOCK === 'true'
          ? {
              ...editing,
              fullName: payload.fullName,
              email: payload.email,
              phoneNumber: payload.phoneNumber,
              relationship: payload.relationship,
              address: payload.address,
            }
          : await parentsApi.update(editing.id, payload);
      setParents((list) => list.map((p) => (p.id === editing.id ? { ...p, ...updated } : p)));
      setEditing(null);
    } catch {
      setParents((list) =>
        list.map((p) =>
          p.id === editing.id
            ? {
                ...p,
                fullName: payload.fullName,
                email: payload.email,
                phoneNumber: payload.phoneNumber,
                relationship: payload.relationship,
                address: payload.address,
              }
            : p
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
        title="Parents Management"
        description="Filter by name, account date, and status — view linked children per parent"
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
              placeholder="Search by parent name..."
              className="max-w-none flex-1"
            />
            <div className="relative shrink-0 sm:w-44">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9"
                aria-label="Filter by account created date"
                title="Account created"
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
              trailing={`${filtered.length} of ${parents.length}`}
            />

            <DataTable
              embedded
              centered
              data={filtered}
              columns={[
                {
                  key: 'fullName',
                  header: 'Name',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (p) => p.fullName,
                },
                {
                  key: 'email',
                  header: 'Email',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (p) => p.email,
                },
                {
                  key: 'phoneNumber',
                  header: 'Phone',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (p) => p.phoneNumber ?? '',
                  render: (p) => p.phoneNumber || '—',
                },
                {
                  key: 'relationship',
                  header: 'Relationship',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (p) => p.relationship ?? '',
                  render: (p) => p.relationship || '—',
                },
                {
                  key: 'children',
                  header: 'Children',
                  sortable: true,
                  sortType: 'number',
                  getSortValue: (p) => childCountByParent.get(p.id) ?? 0,
                  render: (p) => childCountByParent.get(p.id) ?? 0,
                },
                {
                  key: 'createdAt',
                  header: 'Joined',
                  sortable: true,
                  sortType: 'date',
                  getSortValue: (p) => p.createdAt ?? '',
                  render: (p) => formatDateDDMMYYYY(p.createdAt),
                },
                {
                  key: 'actions',
                  header: '',
                  className: 'w-[1%] whitespace-nowrap',
                  render: (p) => (
                    <div className="flex justify-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setEditing(p)}
                        aria-label={`Edit ${p.fullName}`}
                        title="Edit parent"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setViewParent(p)}
                        aria-label={`View children of ${p.fullName}`}
                        title="View children"
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                    </div>
                  ),
                },
              ]}
              emptyMessage={
                hasActiveFilters ? 'No parents match your filters.' : 'No parents found.'
              }
            />
          </div>
        </CardContent>
      </Card>

      <ParentFormModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        parent={editing}
        onSubmit={handleSave}
        saving={saving}
      />

      <ParentChildrenModal
        parent={viewParent}
        students={students}
        onClose={() => setViewParent(null)}
      />
    </div>
  );
}
