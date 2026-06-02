import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Pencil, Plus, Trash2, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { CourseFormModal } from '@/components/CourseFormModal';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { coursesApi } from '@/api/resources';
import { mockCourses } from '@/utils/mockData';
import { ACTIVE_STATUSES } from '@/utils/constants';
import { activeRecordStatus, filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import { formToPayload, type CourseFormValues } from '@/utils/courseForm';
import type { Course } from '@/types';

const STATUS_TABS = ['All', ...ACTIVE_STATUSES] as const;

export default function CoursesManagement() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('Active');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Course | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadCourses = useCallback(() => {
    coursesApi
      .getAll()
      .then((data) => {
        if (data.length >= mockCourses.length) {
          setCourses(data);
          return;
        }
        const names = new Set(data.map((c) => c.courseName));
        setCourses([...data, ...mockCourses.filter((m) => !names.has(m.courseName))]);
      })
      .catch(() => setCourses(mockCourses));
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const filteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.courseName.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.level.toLowerCase().includes(q)
    );
  }, [courses, search]);

  const statusCounts = useMemo(() => {
    const perStatus = getStatusCounts(
      filteredBySearch,
      (c) => activeRecordStatus(c.isActive),
      ACTIVE_STATUSES
    );
    const total = ACTIVE_STATUSES.reduce((sum, st) => sum + (perStatus[st] ?? 0), 0);
    return { All: total, ...perStatus };
  }, [filteredBySearch]);

  const filtered = useMemo(
    () => filterByStatus(filteredBySearch, statusTab, (c) => activeRecordStatus(c.isActive)),
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

  const openEdit = (course: Course) => {
    setEditing(course);
    setFormOpen(true);
  };

  const handleSave = async (values: CourseFormValues) => {
    setSaving(true);
    setError('');
    const payload = formToPayload(values, editing?.id);

    try {
      if (import.meta.env.VITE_USE_MOCK === 'true') {
        if (editing) {
          setCourses((list) =>
            list.map((c) => (c.id === editing.id ? { ...c, ...payload, id: editing.id } : c))
          );
        } else {
          setCourses((list) => [
            ...list,
            {
              id: crypto.randomUUID(),
              courseName: payload.courseName,
              category: payload.category,
              description: payload.description,
              level: payload.level,
              defaultDurationMinutes: payload.defaultDurationMinutes,
              isActive: payload.isActive,
            },
          ]);
        }
      } else if (editing) {
        const updated = await coursesApi.update(editing.id, payload);
        setCourses((list) => list.map((c) => (c.id === editing.id ? updated : c)));
      } else {
        const created = await coursesApi.create(payload);
        setCourses((list) => [...list, created]);
      }
      setFormOpen(false);
      setEditing(null);
    } catch {
      if (editing) {
        setCourses((list) =>
          list.map((c) =>
            c.id === editing.id
              ? {
                  ...c,
                  courseName: payload.courseName,
                  category: payload.category,
                  description: payload.description,
                  level: payload.level,
                  defaultDurationMinutes: payload.defaultDurationMinutes,
                  isActive: payload.isActive,
                }
              : c
          )
        );
        setError('Could not save to server — change applied locally.');
      } else {
        setCourses((list) => [
          ...list,
          {
            id: crypto.randomUUID(),
            courseName: payload.courseName,
            category: payload.category,
            description: payload.description,
            level: payload.level,
            defaultDurationMinutes: payload.defaultDurationMinutes,
            isActive: payload.isActive,
          },
        ]);
        setError('Could not save to server — course added locally.');
      }
      setFormOpen(false);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    setError('');
    try {
      if (import.meta.env.VITE_USE_MOCK !== 'true') {
        await coursesApi.remove(deleteTarget.id);
      }
      setCourses((list) =>
        list.map((c) => (c.id === deleteTarget.id ? { ...c, isActive: false } : c))
      );
      setDeleteTarget(null);
    } catch {
      setCourses((list) =>
        list.map((c) => (c.id === deleteTarget.id ? { ...c, isActive: false } : c))
      );
      setError('Could not reach server — course deactivated locally.');
      setDeleteTarget(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Courses"
        description="Manage your music course catalog"
        actions={
          <Button type="button" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" />
            New course
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
              placeholder="Search courses..."
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
              trailing={`${filtered.length} of ${courses.length}`}
            />

            <DataTable
              embedded
              centered
              data={filtered}
              columns={[
                { key: 'courseName', header: 'Course' },
                { key: 'category', header: 'Category' },
                {
                  key: 'level',
                  header: 'Level',
                  render: (c) => (
                    <div className="flex justify-center">
                      <StatusBadge status={c.level} />
                    </div>
                  ),
                },
                {
                  key: 'defaultDurationMinutes',
                  header: 'Duration',
                  render: (c) => `${c.defaultDurationMinutes} min`,
                },
                {
                  key: 'actions',
                  header: '',
                  className: 'w-28',
                  render: (c) => (
                    <div className="flex justify-center gap-1">
                      <Link
                        to={`/admin/courses/${c.id}?tab=classes`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-primary-700"
                        aria-label={`View classes for ${c.courseName}`}
                        title="View classes"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openEdit(c)}
                        aria-label={`Edit ${c.courseName}`}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {c.isActive && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget(c)}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          aria-label={`Deactivate ${c.courseName}`}
                          title="Deactivate"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ),
                },
              ]}
              emptyMessage={
                hasActiveFilters ? 'No courses match your filters.' : 'No courses found.'
              }
            />
          </div>
        </CardContent>
      </Card>

      <CourseFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        course={editing}
        onSubmit={handleSave}
        saving={saving}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => !saving && setDeleteTarget(null)}
        title="Deactivate course?"
        className="max-w-md"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              <span className="font-medium text-slate-900">{deleteTarget.courseName}</span> will be
              moved to <span className="font-medium">Cancelled</span>. You can reactivate it later by
              editing the course.
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? 'Deactivating…' : 'Deactivate'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
