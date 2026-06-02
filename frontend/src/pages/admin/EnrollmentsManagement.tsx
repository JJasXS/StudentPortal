import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Pencil, Plus, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import {
  EnrollmentFormModal,
  type EnrollmentFormValues,
} from '@/components/EnrollmentFormModal';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { classesApi, enrollmentsApi, studentsApi } from '@/api/resources';
import { mockClasses, mockStudents } from '@/utils/mockData';
import { ENROLLMENT_STATUSES } from '@/utils/constants';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { loadMockEnrollments, saveMockEnrollments } from '@/utils/mockEnrollmentStore';
import { filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import type { ClassItem, Enrollment, StudentProfile } from '@/types';

const STATUS_TABS = ['All', ...ENROLLMENT_STATUSES] as const;

export default function EnrollmentsManagement() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('Active');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Enrollment | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  const loadAll = useCallback(() => {
    const enrollmentSource = isMock
      ? Promise.resolve(loadMockEnrollments())
      : enrollmentsApi.getAll().catch(() => loadMockEnrollments());

    Promise.all([
      enrollmentSource,
      studentsApi.getAll().catch(() => mockStudents),
      classesApi.getAll().catch(() => mockClasses),
    ]).then(([enrollmentList, studentList, classList]) => {
      setEnrollments(enrollmentList);
      setStudents(studentList);
      setClasses(classList);
    });
  }, [isMock]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const classById = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);

  const filteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return enrollments;
    return enrollments.filter((e) => {
      const cls = classById.get(e.classId);
      return (
        e.studentName?.toLowerCase().includes(q) ||
        e.className?.toLowerCase().includes(q) ||
        cls?.courseName?.toLowerCase().includes(q) ||
        e.status.toLowerCase().includes(q)
      );
    });
  }, [enrollments, search, classById]);

  const statusCounts = useMemo(() => {
    const perStatus = getStatusCounts(filteredBySearch, (e) => e.status, ENROLLMENT_STATUSES);
    const total = ENROLLMENT_STATUSES.reduce((sum, st) => sum + (perStatus[st] ?? 0), 0);
    return { All: total, ...perStatus };
  }, [filteredBySearch]);

  const filtered = useMemo(
    () => filterByStatus(filteredBySearch, statusTab, (e) => e.status),
    [filteredBySearch, statusTab]
  );

  const hasActiveFilters = Boolean(search.trim() || statusTab !== 'Active');

  const clearFilters = () => {
    setSearch('');
    setStatusTab('Active');
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleSave = async (values: EnrollmentFormValues) => {
    setSaving(true);
    setError('');

    const student = students.find((s) => s.userId === values.studentUserId);
    const cls = classes.find((c) => c.id === values.classId);

    try {
      if (isMock) {
        if (editing) {
          const next = enrollments.map((e) =>
            e.id === editing.id
              ? {
                  ...e,
                  enrollmentDate: values.enrollmentDate,
                  status: values.status,
                }
              : e
          );
          setEnrollments(next);
          saveMockEnrollments(next);
        } else {
          const created: Enrollment = {
            id: crypto.randomUUID(),
            studentUserId: values.studentUserId,
            studentName: student?.fullName,
            classId: values.classId,
            className: cls?.className,
            enrollmentDate: values.enrollmentDate,
            status: values.status,
          };
          const next = [...enrollments, created];
          setEnrollments(next);
          saveMockEnrollments(next);
        }
      } else if (editing) {
        const updated = await enrollmentsApi.update(editing.id, {
          studentUserId: values.studentUserId,
          classId: values.classId,
          enrollmentDate: values.enrollmentDate,
          status: values.status,
        });
        setEnrollments((list) =>
          list.map((e) => (e.id === editing.id ? { ...e, ...updated } : e))
        );
      } else {
        const created = await enrollmentsApi.create({
          studentUserId: values.studentUserId,
          classId: values.classId,
          enrollmentDate: values.enrollmentDate,
          status: values.status,
        });
        setEnrollments((list) => [
          ...list,
          {
            ...created,
            studentName: student?.fullName ?? created.studentName,
            className: cls?.className ?? created.className,
          },
        ]);
      }
      setFormOpen(false);
      setEditing(null);
    } catch {
      setError('Could not save to server — try again or use mock mode.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Enrollments"
        description="Assign students to classes and manage enrollment status"
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New enrollment
          </Button>
        }
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
              value={search}
              onChange={setSearch}
              placeholder="Search student, class, or course..."
              className="max-w-none flex-1"
            />
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
              trailing={`${filtered.length} of ${enrollments.length}`}
            />

            <DataTable
              embedded
              centered
              data={filtered}
              emptyMessage={
                hasActiveFilters
                  ? 'No enrollments match your filters.'
                  : 'No enrollments yet. Create one to assign a student to a class.'
              }
              columns={[
                {
                  key: 'studentName',
                  header: 'Student',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (e) => e.studentName ?? '',
                  render: (e) => e.studentName || '—',
                },
                {
                  key: 'className',
                  header: 'Class',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (e) => e.className ?? '',
                  render: (e) => e.className || '—',
                },
                {
                  key: 'courseName',
                  header: 'Course',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (e) => classById.get(e.classId)?.courseName ?? '',
                  render: (e) => classById.get(e.classId)?.courseName || '—',
                },
                {
                  key: 'enrollmentDate',
                  header: 'Enrolled',
                  sortable: true,
                  sortType: 'date',
                  getSortValue: (e) => e.enrollmentDate,
                  render: (e) => formatDateDDMMYYYY(e.enrollmentDate),
                },
                {
                  key: 'status',
                  header: 'Status',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (e) => e.status,
                  render: (e) => <StatusBadge status={e.status} />,
                },
                {
                  key: 'actions',
                  header: '',
                  className: 'w-24',
                  render: (e) => {
                    const cls = classById.get(e.classId);
                    return (
                      <div className="flex justify-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setEditing(e);
                            setFormOpen(true);
                          }}
                          aria-label={`Edit enrollment for ${e.studentName}`}
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {cls?.courseId && (
                          <Link
                            to={`/admin/courses/${cls.courseId}/classes/${cls.id}?tab=students`}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-primary-700"
                            aria-label="Open class roster"
                            title="View class"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        )}
                      </div>
                    );
                  },
                },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <EnrollmentFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        enrollment={editing}
        students={students}
        classes={classes}
        enrollments={enrollments}
        saving={saving}
        onSubmit={handleSave}
      />
    </div>
  );
}
