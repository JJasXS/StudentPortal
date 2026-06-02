import { useEffect, useMemo, useState } from 'react';
import { Calendar, Users, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
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
import type { ParentProfile, StudentProfile } from '@/types';

const STATUS_TABS = ['All', ...ACTIVE_STATUSES] as const;

function createdDateKey(value?: string) {
  if (!value) return '';
  return value.slice(0, 10);
}

function formatCreatedDate(value?: string) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ParentsManagement() {
  const [parents, setParents] = useState<ParentProfile[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusTab, setStatusTab] = useState('All');
  const [viewParent, setViewParent] = useState<ParentProfile | null>(null);

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

  return (
    <div>
      <PageHeader
        title="Parents Management"
        description="Filter by name, account date, and status — view linked children per parent"
      />
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
              data={filtered}
              columns={[
                { key: 'fullName', header: 'Name' },
                { key: 'email', header: 'Email' },
                { key: 'phoneNumber', header: 'Phone', render: (p) => p.phoneNumber || '—' },
                { key: 'relationship', header: 'Relationship', render: (p) => p.relationship || '—' },
                {
                  key: 'children',
                  header: 'Children',
                  render: (p) => childCountByParent.get(p.id) ?? 0,
                },
                {
                  key: 'createdAt',
                  header: 'Joined',
                  render: (p) => formatCreatedDate(p.createdAt),
                },
                {
                  key: 'actions',
                  header: '',
                  className: 'w-[1%] whitespace-nowrap',
                  render: (p) => (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setViewParent(p)}
                      aria-label={`View children of ${p.fullName}`}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
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

      <ParentChildrenModal
        parent={viewParent}
        students={students}
        onClose={() => setViewParent(null)}
      />
    </div>
  );
}
