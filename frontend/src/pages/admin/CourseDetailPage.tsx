import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ClipboardCheck, Eye, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { ClassAttendanceModal } from '@/components/ClassAttendanceModal';
import { ClassFormModal } from '@/components/ClassFormModal';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { SearchBox } from '@/components/SearchBox';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { coursesApi, classesApi, classSessionsApi, teachersApi } from '@/api/resources';
import { mockCourses, mockClasses, mockTeachers } from '@/utils/mockData';
import { generateMockSessions } from '@/utils/mockSessionStore';
import { formToCreatePayload, type ClassFormValues } from '@/utils/classForm';
import { ACTIVE_STATUSES } from '@/utils/constants';
import { activeRecordStatus, filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import { logAdminAction } from '@/utils/auditLog';
import { AUDIT_ACTIONS } from '@/types/auditLog';
import type { ClassItem, Course, TeacherProfile } from '@/types';

const MAIN_TABS = ['Overview', 'Classes'] as const;
type MainTab = (typeof MAIN_TABS)[number];

const CLASS_STATUS_TABS = ['All', ...ACTIVE_STATUSES] as const;

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0 sm:py-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export default function CourseDetailPage() {
  const { user } = useAuth();
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const mainTab: MainTab = tabParam === 'classes' ? 'Classes' : 'Overview';

  const [course, setCourse] = useState<Course | null>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [search, setSearch] = useState('');
  const [classStatusTab, setClassStatusTab] = useState('Active');
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [classFormOpen, setClassFormOpen] = useState(false);
  const [attendanceClass, setAttendanceClass] = useState<ClassItem | null>(null);
  const [savingClass, setSavingClass] = useState(false);
  const [classFormError, setClassFormError] = useState('');
  const [loading, setLoading] = useState(true);

  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  const loadData = useCallback(() => {
    if (!courseId) return;
    setLoading(true);

    Promise.all([
      coursesApi.getById(courseId).catch(() => mockCourses.find((c) => c.id === courseId) ?? null),
      classesApi.getAll().catch(() => mockClasses),
      teachersApi.getAll().catch(() => mockTeachers),
    ])
      .then(([courseData, allClasses, teacherList]) => {
        const resolved = courseData ?? mockCourses.find((c) => c.id === courseId) ?? null;
        setCourse(resolved);
        setClasses(allClasses.filter((c) => c.courseId === courseId));
        setTeachers(teacherList);
      })
      .finally(() => setLoading(false));
  }, [courseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateClass = async (values: ClassFormValues) => {
    if (!courseId || !course) return;

    setSavingClass(true);
    setClassFormError('');
    const payload = formToCreatePayload(values, courseId);
    const teacher = teachers.find((t) => t.userId === values.teacherUserId);

    try {
      let newClass: ClassItem;
      if (!isMock) {
        const created = await classesApi.create(payload);
        newClass = {
          ...created,
          courseName: course.courseName,
          teacherName: created.teacherName ?? teacher?.fullName,
        };
        setClasses((list) => [...list, newClass]);
        logAdminAction(user, {
          action: AUDIT_ACTIONS.classCreated,
          entityType: 'Class',
          entityId: created.id,
          entityLabel: payload.className,
        });
      } else {
        newClass = {
          id: crypto.randomUUID(),
          courseId,
          courseName: course.courseName,
          teacherUserId: values.teacherUserId,
          teacherName: teacher?.fullName,
          className: payload.className,
          dayOfWeek: payload.dayOfWeek,
          startTime: payload.startTime,
          endTime: payload.endTime,
          maxStudents: payload.maxStudents,
          enrolledCount: 0,
          location: payload.location,
          isActive: payload.isActive,
        };
        setClasses((list) => [...list, newClass]);
        logAdminAction(user, {
          action: AUDIT_ACTIONS.classCreated,
          entityType: 'Class',
          entityId: newClass.id,
          entityLabel: payload.className,
        });
      }
      setClassFormOpen(false);
      const from = new Date().toISOString().slice(0, 10);
      const to = new Date(Date.now() + 56 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (isMock) {
        generateMockSessions([newClass], from, to, newClass.id);
      } else {
        classSessionsApi.generate({ classId: newClass.id, fromDate: from, toDate: to }).catch(() => {});
      }
    } catch {
      setClasses((list) => [
        ...list,
        {
          id: crypto.randomUUID(),
          courseId,
          courseName: course.courseName,
          teacherUserId: values.teacherUserId,
          teacherName: teacher?.fullName,
          className: payload.className,
          dayOfWeek: payload.dayOfWeek,
          startTime: payload.startTime,
          endTime: payload.endTime,
          maxStudents: payload.maxStudents,
          enrolledCount: 0,
          location: payload.location,
          isActive: payload.isActive,
        },
      ]);
      setClassFormOpen(false);
      setClassFormError('Could not save to server — class added locally.');
    } finally {
      setSavingClass(false);
    }
  };

  const filteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return classes;
    return classes.filter(
      (c) =>
        c.className.toLowerCase().includes(q) ||
        c.teacherName?.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.dayOfWeek.toLowerCase().includes(q)
    );
  }, [classes, search]);

  const classStatusCounts = useMemo(() => {
    const perStatus = getStatusCounts(
      filteredBySearch,
      (c) => activeRecordStatus(c.isActive),
      ACTIVE_STATUSES
    );
    const total = ACTIVE_STATUSES.reduce((sum, st) => sum + (perStatus[st] ?? 0), 0);
    return { All: total, ...perStatus };
  }, [filteredBySearch]);

  const filteredClasses = useMemo(
    () => filterByStatus(filteredBySearch, classStatusTab, (c) => activeRecordStatus(c.isActive)),
    [filteredBySearch, classStatusTab]
  );

  const setMainTab = (tab: string) => {
    setSearchParams(tab === 'Classes' ? { tab: 'classes' } : {});
  };

  const mainTabCounts = useMemo(() => ({ Classes: classes.length }), [classes.length]);

  if (!courseId) {
    return (
      <div className="text-center text-sm text-slate-500">
        Invalid course.{' '}
        <Link to="/admin/courses" className="text-primary-600 hover:underline">
          Back to courses
        </Link>
      </div>
    );
  }

  if (!loading && !course) {
    return (
      <div className="text-center text-sm text-slate-500">
        Course not found.{' '}
        <Link to="/admin/courses" className="text-primary-600 hover:underline">
          Back to courses
        </Link>
      </div>
    );
  }

  const courseBreadcrumbs = [
    { label: 'Courses', to: '/admin/courses' },
    { label: course?.courseName ?? 'Course' },
  ];

  return (
    <div>
      <Breadcrumbs items={courseBreadcrumbs} />

      <PageHeader
        title={course?.courseName ?? 'Course'}
        description={course?.description || 'Course details and scheduled classes'}
      />

      {classFormError && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {classFormError}
        </p>
      )}

      <Card>
        <SlidingTabs
          tabs={MAIN_TABS}
          value={mainTab}
          onChange={setMainTab}
          counts={mainTabCounts}
        />

        <CardContent className="p-0">
          {mainTab === 'Overview' && course && (
            <div className="p-4 sm:p-6">
              <dl className="grid gap-0 sm:grid-cols-2">
                <DetailRow label="Course name">{course.courseName}</DetailRow>
                <DetailRow label="Category">{course.category}</DetailRow>
                <DetailRow label="Level">
                  <StatusBadge status={course.level} />
                </DetailRow>
                <DetailRow label="Default duration">{course.defaultDurationMinutes} min</DetailRow>
                <DetailRow label="Status">
                  <StatusBadge status={activeRecordStatus(course.isActive)} />
                </DetailRow>
                <DetailRow label="Total classes">
                  <span className="font-medium">{classes.length}</span>
                  {classes.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setMainTab('Classes')}
                      className="ml-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      View classes →
                    </button>
                  )}
                </DetailRow>
                {course.description && (
                  <div className="border-b border-slate-100 py-3 sm:col-span-2 sm:py-4">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Description
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-slate-700">{course.description}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {mainTab === 'Classes' && (
            <div className="overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                <SearchBox
                  value={search}
                  onChange={setSearch}
                  placeholder="Search classes..."
                  className="max-w-none sm:max-w-md sm:flex-1"
                />
                <Button type="button" onClick={() => setClassFormOpen(true)} className="shrink-0">
                  <Plus className="mr-1.5 h-4 w-4" />
                  New class
                </Button>
              </div>

              <SlidingTabs
                tabs={CLASS_STATUS_TABS}
                value={classStatusTab}
                onChange={setClassStatusTab}
                counts={classStatusCounts}
                trailing={`${filteredClasses.length} of ${classes.length}`}
              />

              <DataTable
                embedded
                centered
                data={filteredClasses}
                emptyMessage={
                  loading
                    ? 'Loading…'
                    : search.trim()
                      ? 'No classes match your search.'
                      : 'No classes for this course yet.'
                }
                columns={[
                  {
                    key: 'className',
                    header: 'Class',
                    sortable: true,
                    sortType: 'text',
                    getSortValue: (c) => c.className,
                  },
                  {
                    key: 'teacherName',
                    header: 'Teacher',
                    sortable: true,
                    sortType: 'text',
                    getSortValue: (c) => c.teacherName ?? '',
                    render: (c) => c.teacherName || '—',
                  },
                  {
                    key: 'dayOfWeek',
                    header: 'Day',
                    sortable: true,
                    sortType: 'text',
                    getSortValue: (c) => c.dayOfWeek,
                  },
                  {
                    key: 'startTime',
                    header: 'Time',
                    sortable: true,
                    sortType: 'text',
                    getSortValue: (c) => c.startTime,
                    render: (c) => `${c.startTime} – ${c.endTime}`,
                  },
                  {
                    key: 'location',
                    header: 'Location',
                    sortable: true,
                    sortType: 'text',
                    getSortValue: (c) => c.location,
                  },
                  {
                    key: 'enrolledCount',
                    header: 'Enrolled',
                    sortable: true,
                    sortType: 'number',
                    getSortValue: (c) => c.enrolledCount ?? 0,
                    render: (c) => `${c.enrolledCount ?? 0}/${c.maxStudents}`,
                  },
                  {
                    key: 'actions',
                    header: '',
                    className: 'w-24',
                    render: (c) => (
                      <div className="flex justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setAttendanceClass(c)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-primary-700"
                          aria-label={`View attendance for ${c.className}`}
                          title="View attendance"
                        >
                          <ClipboardCheck className="h-4 w-4" />
                        </button>
                        <Link
                          to={`/admin/courses/${courseId}/classes/${c.id}?tab=students`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-primary-700"
                          aria-label={`View ${c.className} and assign students`}
                          title="View class & students"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {course && (
        <ClassFormModal
          open={classFormOpen}
          onClose={() => setClassFormOpen(false)}
          course={course}
          teachers={teachers}
          onSubmit={handleCreateClass}
          saving={savingClass}
        />
      )}

      <ClassAttendanceModal
        open={attendanceClass != null}
        onClose={() => setAttendanceClass(null)}
        classItem={attendanceClass}
      />
    </div>
  );
}
