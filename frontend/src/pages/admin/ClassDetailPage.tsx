import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { AssignStudentToClassModal } from '@/components/AssignStudentToClassModal';
import { ClassTeacherCell } from '@/components/ClassTeacherCell';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { classesApi, coursesApi, enrollmentsApi, studentsApi, teachersApi } from '@/api/resources';
import { classToUpdatePayload } from '@/utils/classUpdate';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { mockCourses, mockClasses, mockStudents, mockTeachers } from '@/utils/mockData';
import { enrollmentsForClass, loadMockEnrollments, saveMockEnrollments } from '@/utils/mockEnrollmentStore';
import { activeRecordStatus } from '@/utils/statusFilter';
import type { ClassItem, Course, Enrollment, StudentProfile, TeacherProfile } from '@/types';

const MAIN_TABS = ['Overview', 'Students'] as const;
type MainTab = (typeof MAIN_TABS)[number];

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0 sm:py-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export default function ClassDetailPage() {
  const { courseId, classId } = useParams<{ courseId: string; classId: string }>();
  const [searchParams] = useSearchParams();
  const initialTab: MainTab = searchParams.get('tab') === 'overview' ? 'Overview' : 'Students';
  const [mainTab, setMainTab] = useState<MainTab>(initialTab);
  const [course, setCourse] = useState<Course | null>(null);
  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [loading, setLoading] = useState(true);

  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  const loadData = useCallback(() => {
    if (!courseId || !classId) return;
    setLoading(true);

    const enrollmentSource = isMock
      ? Promise.resolve(loadMockEnrollments())
      : enrollmentsApi.getAll().catch(() => loadMockEnrollments());

    Promise.all([
      coursesApi.getById(courseId).catch(() => mockCourses.find((c) => c.id === courseId) ?? null),
      classesApi.getById(classId).catch(() => mockClasses.find((c) => c.id === classId) ?? null),
      studentsApi.getAll().catch(() => mockStudents),
      teachersApi.getAll().catch(() => mockTeachers),
      enrollmentSource,
    ])
      .then(([courseData, classData, studentList, teacherList, enrollmentList]) => {
        setCourse(courseData ?? mockCourses.find((c) => c.id === courseId) ?? null);
        setClassItem(classData ?? mockClasses.find((c) => c.id === classId) ?? null);
        setStudents(studentList);
        setTeachers(teacherList);
        setEnrollments(enrollmentList);
      })
      .finally(() => setLoading(false));
  }, [courseId, classId, isMock]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const classEnrollments = useMemo(
    () => (classId ? enrollmentsForClass(enrollments, classId) : []),
    [enrollments, classId]
  );

  const enrolledCount = classEnrollments.length;
  const maxStudents = classItem?.maxStudents ?? 0;

  const courseClassesUrl = `/admin/courses/${courseId}?tab=classes`;

  const handleAssign = async (studentUserId: string, studentName: string) => {
    if (!classId || !classItem) return;
    if (enrolledCount >= maxStudents) return;

    setSavingStudent(true);
    const enrollmentDate = new Date().toISOString().slice(0, 10);
    const newEnrollment: Enrollment = {
      id: crypto.randomUUID(),
      studentUserId,
      studentName,
      classId,
      className: classItem.className,
      enrollmentDate,
      status: 'Active',
    };

    try {
      if (isMock) {
        const next = [...enrollments, newEnrollment];
        setEnrollments(next);
        saveMockEnrollments(next);
        setAssignOpen(false);
      } else {
        const created = await enrollmentsApi.create({
          studentUserId,
          classId,
          enrollmentDate,
          status: 'Active',
        });
        setEnrollments((list) => [...list, { ...created, studentName, className: classItem.className }]);
        setAssignOpen(false);
      }
    } catch {
      const next = [...enrollments, newEnrollment];
      setEnrollments(next);
      if (isMock) saveMockEnrollments(next);
      setAssignOpen(false);
    } finally {
      setSavingStudent(false);
    }
  };

  const handleTeacherSave = async (teacherUserId: string, teacherName: string) => {
    if (!classItem) return;

    setSavingTeacher(true);
    const payload = classToUpdatePayload(classItem, teacherUserId);
    const optimistic = { ...classItem, teacherUserId, teacherName };

    try {
      if (isMock) {
        setClassItem(optimistic);
      } else {
        const updated = await classesApi.update(classItem.id, payload);
        setClassItem({ ...classItem, ...updated });
      }
    } catch {
      setClassItem(optimistic);
    } finally {
      setSavingTeacher(false);
    }
  };

  if (!courseId || !classId) {
    return (
      <p className="text-center text-sm text-slate-500">
        Invalid link.{' '}
        <Link to="/admin/courses" className="text-primary-600 hover:underline">
          Back to courses
        </Link>
      </p>
    );
  }

  if (!loading && !classItem) {
    return (
      <p className="text-center text-sm text-slate-500">
        Class not found.{' '}
        <Link to={courseClassesUrl} className="text-primary-600 hover:underline">
          Back to course
        </Link>
      </p>
    );
  }

  const classBreadcrumbs = [
    { label: 'Courses', to: '/admin/courses' },
    {
      label: course?.courseName ?? 'Course',
      to: courseId ? `/admin/courses/${courseId}?tab=classes` : undefined,
    },
    { label: classItem?.className ?? 'Class' },
  ];

  return (
    <div>
      <Breadcrumbs items={classBreadcrumbs} />

      <PageHeader
        title={classItem?.className ?? 'Class'}
        description={course ? `${course.courseName} · ${classItem?.dayOfWeek ?? ''}` : undefined}
        actions={
          mainTab === 'Students' ? (
            <Button
              type="button"
              onClick={() => setAssignOpen(true)}
              disabled={enrolledCount >= maxStudents}
            >
              <UserPlus className="mr-1.5 h-4 w-4" />
              Assign student
            </Button>
          ) : undefined
        }
      />

      <Card>
        <SlidingTabs
          tabs={MAIN_TABS}
          value={mainTab}
          onChange={(t) => setMainTab(t as MainTab)}
          counts={{ Students: enrolledCount }}
        />

        <CardContent className="p-0">
          {mainTab === 'Overview' && classItem && (
            <div className="p-4 sm:p-6">
              <dl className="grid gap-0 sm:grid-cols-2">
                <DetailRow label="Class name">{classItem.className}</DetailRow>
                <DetailRow label="Course">{course?.courseName ?? '—'}</DetailRow>
                <DetailRow label="Teacher">
                  <ClassTeacherCell
                    classItem={classItem}
                    teachers={teachers}
                    saving={savingTeacher}
                    onSave={handleTeacherSave}
                  />
                </DetailRow>
                <DetailRow label="Schedule">
                  {classItem.dayOfWeek}, {classItem.startTime} – {classItem.endTime}
                </DetailRow>
                <DetailRow label="Location">{classItem.location}</DetailRow>
                <DetailRow label="Capacity">
                  <span className="font-medium">
                    {enrolledCount}/{maxStudents}
                  </span>{' '}
                  students
                </DetailRow>
                <DetailRow label="Status">
                  <StatusBadge status={activeRecordStatus(classItem.isActive)} />
                </DetailRow>
              </dl>
              <button
                type="button"
                onClick={() => setMainTab('Students')}
                className="mt-4 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Manage enrolled students →
              </button>
            </div>
          )}

          {mainTab === 'Students' && (
            <div className="overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                {enrolledCount} of {maxStudents} seats filled
                {enrolledCount >= maxStudents && (
                  <span className="ml-2 font-medium text-amber-700">(full)</span>
                )}
              </div>

              <DataTable
                embedded
                centered
                data={classEnrollments}
                emptyMessage={
                  loading
                    ? 'Loading…'
                    : 'No students assigned yet. Use Assign student to add one.'
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
                    render: (e) => <StatusBadge status={e.status} />,
                  },
                ]}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {classItem && (
        <AssignStudentToClassModal
          open={assignOpen}
          onClose={() => setAssignOpen(false)}
          className={classItem.className}
          classId={classItem.id}
          maxStudents={maxStudents}
          currentCount={enrolledCount}
          students={students}
          enrollments={enrollments}
          saving={savingStudent}
          onAssign={handleAssign}
        />
      )}
    </div>
  );
}
