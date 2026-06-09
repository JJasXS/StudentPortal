import { useEffect, useMemo, useState } from 'react';
import { Calendar, Filter, Pencil, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { TeacherSpecializationsTab } from '@/components/admin/TeacherSpecializationsTab';
import { SpecializationFilterModal } from '@/components/SpecializationFilterModal';
import { TeacherSpecializationCell } from '@/components/TeacherSpecializationCell';
import { TeacherEmploymentTypeCell } from '@/components/TeacherEmploymentTypeCell';
import { TeacherHourlyRateCell } from '@/components/TeacherHourlyRateCell';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { teachersApi } from '@/api/resources';
import { mockTeachers } from '@/utils/mockData';
import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  getEmploymentTypeLabel,
  normalizeEmploymentType,
  type EmploymentType,
} from '@/utils/employmentTypes';
import {
  collectSpecializations,
  parseSpecializations,
  removeCatalogSpecialization,
  teacherMatchesSpecializations,
} from '@/utils/specializations';
import { cn } from '@/utils/cn';
import { logAdminAction } from '@/utils/auditLog';
import { AUDIT_ACTIONS } from '@/types/auditLog';
import type { TeacherProfile } from '@/types';

const PAGE_TABS = ['Staff', 'Specializations'] as const;
const EMPLOYMENT_TABS = ['All', ...EMPLOYMENT_TYPES.map((t) => EMPLOYMENT_TYPE_LABELS[t])] as const;

function createdDateKey(value?: string) {
  if (!value) return '';
  return value.slice(0, 10);
}

export default function TeachersManagement() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [nameFilter, setNameFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [specializationFilter, setSpecializationFilter] = useState<string[]>([]);
  const [specModalOpen, setSpecModalOpen] = useState(false);
  const [pageTab, setPageTab] = useState<(typeof PAGE_TABS)[number]>('Staff');
  const [typeTab, setTypeTab] = useState('All');
  const [editMode, setEditMode] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const specializationOptions = useMemo(() => collectSpecializations(teachers), [teachers]);

  useEffect(() => {
    teachersApi
      .getAll()
      .then((data) => {
        if (data.length >= mockTeachers.length) {
          setTeachers(data);
          return;
        }
        const emails = new Set(data.map((t) => t.email));
        setTeachers([...data, ...mockTeachers.filter((m) => !emails.has(m.email))]);
      })
      .catch(() => setTeachers(mockTeachers));
  }, []);

  const filteredByNameAndDate = useMemo(() => {
    const name = nameFilter.trim().toLowerCase();
    return teachers.filter((t) => {
      if (name && !t.fullName.toLowerCase().includes(name)) return false;
      if (dateFilter && createdDateKey(t.createdAt) !== dateFilter) return false;
      if (!teacherMatchesSpecializations(t, specializationFilter)) return false;
      return true;
    });
  }, [teachers, nameFilter, dateFilter, specializationFilter]);

  const filteredBeforeSpecialization = useMemo(() => {
    const name = nameFilter.trim().toLowerCase();
    return teachers.filter((t) => {
      if (name && !t.fullName.toLowerCase().includes(name)) return false;
      if (dateFilter && createdDateKey(t.createdAt) !== dateFilter) return false;
      return true;
    });
  }, [teachers, nameFilter, dateFilter]);

  const specializationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const spec of specializationOptions) {
      counts[spec] = filteredBeforeSpecialization.filter((t) =>
        parseSpecializations(t.specialization).some((s) => s.toLowerCase() === spec.toLowerCase())
      ).length;
    }
    return counts;
  }, [specializationOptions, filteredBeforeSpecialization]);

  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { All: filteredByNameAndDate.length };
    for (const type of EMPLOYMENT_TYPES) {
      const label = EMPLOYMENT_TYPE_LABELS[type];
      counts[label] = filteredByNameAndDate.filter(
        (t) => normalizeEmploymentType(t.employmentType) === type
      ).length;
    }
    return counts;
  }, [filteredByNameAndDate]);

  const filtered = useMemo(() => {
    if (typeTab === 'All') return filteredByNameAndDate;
    return filteredByNameAndDate.filter((t) => getEmploymentTypeLabel(t.employmentType) === typeTab);
  }, [filteredByNameAndDate, typeTab]);

  const hasActiveFilters = Boolean(
    nameFilter.trim() || dateFilter || specializationFilter.length > 0 || typeTab !== 'All'
  );

  const clearFilters = () => {
    setNameFilter('');
    setDateFilter('');
    setSpecializationFilter([]);
    setTypeTab('All');
  };

  const handleSpecializationSave = async (teacher: TeacherProfile, specialization: string) => {
    if ((teacher.specialization ?? '') === specialization) return;

    setError('');
    setSavingId(teacher.id);
    try {
      const updated =
        import.meta.env.VITE_USE_MOCK === 'true'
          ? { ...teacher, specialization }
          : await teachersApi.update(teacher.id, { specialization });
      setTeachers((list) => list.map((t) => (t.id === teacher.id ? { ...t, ...updated } : t)));
      logAdminAction(user, {
        action: AUDIT_ACTIONS.teacherSpecializationUpdated,
        entityType: 'Teacher',
        entityId: teacher.id,
        entityLabel: teacher.fullName,
        details: specialization,
      });
    } catch {
      setTeachers((list) => list.map((t) => (t.id === teacher.id ? { ...t, specialization } : t)));
      setError('Could not save specializations — change applied locally.');
    } finally {
      setSavingId(null);
    }
  };

  const handleRemoveSpecialization = async (spec: string) => {
    const affected = removeCatalogSpecialization(spec, teachers);
    for (const { teacher, specialization } of affected) {
      await handleSpecializationSave(teacher, specialization);
    }
  };

  const handleRateSave = async (teacher: TeacherProfile, hourlyRate: number) => {
    if ((teacher.hourlyRate ?? 0) === hourlyRate) return;

    setError('');
    setSavingId(teacher.id);
    try {
      const updated =
        import.meta.env.VITE_USE_MOCK === 'true'
          ? { ...teacher, hourlyRate }
          : await teachersApi.update(teacher.id, { hourlyRate });
      setTeachers((list) => list.map((t) => (t.id === teacher.id ? { ...t, ...updated } : t)));
      logAdminAction(user, {
        action: AUDIT_ACTIONS.teacherRateUpdated,
        entityType: 'Teacher',
        entityId: teacher.id,
        entityLabel: teacher.fullName,
        details: `$${hourlyRate}/hr`,
      });
    } catch {
      setTeachers((list) => list.map((t) => (t.id === teacher.id ? { ...t, hourlyRate } : t)));
      setError('Could not save rate — change applied locally.');
    } finally {
      setSavingId(null);
    }
  };

  const handleEmploymentChange = async (teacher: TeacherProfile, employmentType: EmploymentType) => {
    if (normalizeEmploymentType(teacher.employmentType) === employmentType) return;

    setError('');
    setSavingId(teacher.id);
    try {
      const updated =
        import.meta.env.VITE_USE_MOCK === 'true'
          ? { ...teacher, employmentType }
          : await teachersApi.updateEmploymentType(teacher.id, employmentType);
      setTeachers((list) => list.map((t) => (t.id === teacher.id ? { ...t, ...updated } : t)));
      logAdminAction(user, {
        action: AUDIT_ACTIONS.teacherUpdated,
        entityType: 'Teacher',
        entityId: teacher.id,
        entityLabel: teacher.fullName,
        details: `Employment: ${EMPLOYMENT_TYPE_LABELS[employmentType]}`,
      });
    } catch {
      setTeachers((list) => list.map((t) => (t.id === teacher.id ? { ...t, employmentType } : t)));
      setError('Could not save to server — change applied locally. Restart the backend to persist.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Staff Management"
        description={
          pageTab === 'Staff'
            ? 'Manage teachers and set employment type: full time, part time, contract, or substitute'
            : 'Add specializations and assign them to teachers'
        }
      />

      <Card>
        <SlidingTabs
          tabs={PAGE_TABS}
          value={pageTab}
          onChange={(tab) => setPageTab(tab as (typeof PAGE_TABS)[number])}
          counts={{
            Staff: teachers.length,
            Specializations: specializationOptions.length,
          }}
        />

        {error && (
          <p className="border-b border-slate-200 px-4 py-2 text-sm text-red-600">{error}</p>
        )}

        {pageTab === 'Specializations' ? (
          <TeacherSpecializationsTab
            teachers={teachers}
            savingId={savingId}
            onSave={handleSpecializationSave}
            onRemoveSpecialization={handleRemoveSpecialization}
          />
        ) : (
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
            <SearchBox
              value={nameFilter}
              onChange={setNameFilter}
              placeholder="Search by name..."
              className="max-w-none flex-1"
            />
            <button
              type="button"
              onClick={() => setSpecModalOpen(true)}
              aria-label="Filter by specialization"
              title="Filter by specialization"
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 transition-colors',
                specializationFilter.length > 0
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700'
              )}
            >
              <Filter className="h-4 w-4" aria-hidden />
              {specializationFilter.length > 0 && (
                <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-medium text-white">
                  {specializationFilter.length}
                </span>
              )}
            </button>
            <div className="relative shrink-0 sm:w-44">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="pl-9"
                aria-label="Filter by joined date"
                title="Joined date"
              />
            </div>
            <button
              type="button"
              onClick={() => setEditMode((on) => !on)}
              aria-pressed={editMode}
              aria-label={editMode ? 'Exit edit mode' : 'Edit employment type and hourly rate'}
              title={editMode ? 'Exit edit mode' : 'Edit employment and rate'}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                editMode
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700'
              )}
            >
              <Pencil className="h-4 w-4" aria-hidden />
              Edit
            </button>
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
              tabs={EMPLOYMENT_TABS}
              value={typeTab}
              onChange={setTypeTab}
              counts={typeCounts}
              trailing={`${filtered.length} of ${teachers.length}`}
            />

            <DataTable
              embedded
              data={filtered}
              columns={[
                {
                  key: 'fullName',
                  header: 'Name',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (t) => t.fullName,
                },
                {
                  key: 'specialization',
                  header: 'Specialization',
                  className: 'max-w-[240px]',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (t) => t.specialization ?? '',
                  render: (t) => (
                    <TeacherSpecializationCell
                      teacher={t}
                      options={specializationOptions}
                      editable={false}
                      onSave={() => {}}
                    />
                  ),
                },
                {
                  key: 'employmentType',
                  header: 'Employment',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (t) => getEmploymentTypeLabel(t.employmentType),
                  render: (t) => (
                    <TeacherEmploymentTypeCell
                      teacher={t}
                      editable={editMode}
                      saving={savingId === t.id}
                      onSave={handleEmploymentChange}
                    />
                  ),
                },
                {
                  key: 'hourlyRate',
                  header: 'Rate',
                  sortable: true,
                  sortType: 'number',
                  getSortValue: (t) => t.hourlyRate ?? 0,
                  render: (t) => (
                    <TeacherHourlyRateCell
                      teacher={t}
                      editable={editMode}
                      saving={savingId === t.id}
                      onSave={handleRateSave}
                    />
                  ),
                },
              ]}
              emptyMessage={hasActiveFilters ? 'No staff match your filters.' : 'No staff found.'}
            />
          </div>
        </CardContent>
        )}
      </Card>

      <SpecializationFilterModal
        open={specModalOpen}
        onClose={() => setSpecModalOpen(false)}
        options={specializationOptions}
        selected={specializationFilter}
        onSelect={setSpecializationFilter}
        counts={specializationCounts}
      />
    </div>
  );
}
