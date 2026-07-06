import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { RefreshCw, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { AssignStudentToClassModal, type AssignStudentOptions } from '@/components/AssignStudentToClassModal';
import { ClassTeacherCell } from '@/components/ClassTeacherCell';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ClassSessionChangeHistoryPanel } from '@/components/ClassSessionChangeHistoryPanel';
import { ClassAssignmentChangeLogPanel } from '@/components/ClassAssignmentChangeLogPanel';
import {
  ClassSessionActionModal,
  type ClassSessionActionMode,
} from '@/components/ClassSessionActionModal';
import { classesApi, coursesApi, classSessionsApi, enrollmentsApi, studentsApi, teachersApi } from '@/api/resources';
import { classToUpdatePayload } from '@/utils/classUpdate';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { mockCourses, mockClasses, mockClassSessions, mockStudents, mockTeachers } from '@/utils/mockData';
import { addMockSession, generateMockSessions, loadAllSessions } from '@/utils/mockSessionStore';
import { sessionsForClass } from '@/utils/sessionGeneration';
import { enrollmentsForClass, loadMockEnrollments, saveMockEnrollments } from '@/utils/mockEnrollmentStore';
import { activeRecordStatus } from '@/utils/statusFilter';
import { logAdminAction } from '@/utils/auditLog';
import { AUDIT_ACTIONS } from '@/types/auditLog';
import type { ClassItem, ClassSession, Course, Enrollment, StudentProfile, TeacherProfile } from '@/types';

const MAIN_TABS = ['Overview', 'Students', 'Sessions'] as const;
type MainTab = (typeof MAIN_TABS)[number];

const CLASS_TAB_PARAMS: Record<MainTab, string> = {
  Overview: 'overview',
  Students: 'students',
  Sessions: 'sessions',
};

function parseClassDetailTab(param: string | null): MainTab {
  if (param === 'overview') return 'Overview';
  if (param === 'sessions') return 'Sessions';
  if (param === 'students') return 'Students';
  return 'Students';
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-0 sm:py-4">
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export default function ClassDetailPage() {
  const { user } = useAuth();
  const { courseId, classId } = useParams<{ courseId: string; classId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const mainTab = useMemo(() => parseClassDetailTab(tabParam), [tabParam]);

  const setMainTab = useCallback(
    (tab: MainTab) => {
      setSearchParams({ tab: CLASS_TAB_PARAMS[tab] });
    },
    [setSearchParams]
  );

  useEffect(() => {
    if (!tabParam) {
      setSearchParams({ tab: 'students' }, { replace: true });
      return;
    }
    const parsed = parseClassDetailTab(tabParam);
    const expected = CLASS_TAB_PARAMS[parsed];
    if (tabParam.toLowerCase() !== expected) {
      setSearchParams({ tab: expected }, { replace: true });
    }
  }, [tabParam, setSearchParams]);

  const [course, setCourse] = useState<Course | null>(null);
  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classSessions, setClassSessions] = useState<ClassSession[]>([]);
  const [generatingSessions, setGeneratingSessions] = useState(false);
  const [sessionMessage, setSessionMessage] = useState('');
  const [assignOpen, setAssignOpen] = useState(false);
  const [savingStudent, setSavingStudent] = useState(false);
  const [savingTeacher, setSavingTeacher] = useState(false);
  const [loading, setLoading] = useState(true);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [sessionActionOpen, setSessionActionOpen] = useState(false);
  const [sessionActionMode, setSessionActionMode] = useState<ClassSessionActionMode>('cancel');
  const [sessionActionTarget, setSessionActionTarget] = useState<ClassSession | null>(null);
  const [sessionActionSaving, setSessionActionSaving] = useState(false);

  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  const loadData = useCallback(() => {
    if (!courseId || !classId) return;
    setLoading(true);

    const enrollmentSource = isMock
      ? Promise.resolve(loadMockEnrollments())
      : enrollmentsApi.getAll().catch(() => loadMockEnrollments());

    const sessionSource = isMock
      ? Promise.resolve(loadAllSessions())
      : classSessionsApi.getAll().catch(() => mockClassSessions);

    Promise.all([
      coursesApi.getById(courseId).catch(() => mockCourses.find((c) => c.id === courseId) ?? null),
      classesApi.getById(classId).catch(() => mockClasses.find((c) => c.id === classId) ?? null),
      studentsApi.getAll().catch(() => mockStudents),
      teachersApi.getAll().catch(() => mockTeachers),
      enrollmentSource,
      sessionSource,
    ])
      .then(([courseData, classData, studentList, teacherList, enrollmentList, sessionList]) => {
        setCourse(courseData ?? mockCourses.find((c) => c.id === courseId) ?? null);
        setClassItem(classData ?? mockClasses.find((c) => c.id === classId) ?? null);
        setStudents(studentList);
        setTeachers(teacherList);
        setEnrollments(enrollmentList);
        setClassSessions(sessionsForClass(sessionList, classId));
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

  const handleAssign = async (options: AssignStudentOptions) => {
    if (!classId || !classItem) return;
    if (enrolledCount >= maxStudents) return;

    const { studentUserId, studentName, teacherUserId, teacherName, repeat, startDate, endDate } =
      options;
    const teacherChanged = !!teacherUserId && teacherUserId !== classItem.teacherUserId;
    const sessionSummary = (createdCount: number, skippedCount: number) =>
      `Generated ${createdCount} session${createdCount === 1 ? '' : 's'} (${skippedCount} skipped).`;

    setSavingStudent(true);
    setSessionMessage('');
    const enrollmentDate = new Date().toISOString().slice(0, 10);

    try {
      if (isMock) {
        const newEnrollment: Enrollment = {
          id: crypto.randomUUID(),
          studentUserId,
          studentName,
          classId,
          className: classItem.className,
          enrollmentDate,
          status: 'Active',
        };
        const next = [...enrollments, newEnrollment];
        setEnrollments(next);
        saveMockEnrollments(next);
        logAdminAction(user, {
          action: AUDIT_ACTIONS.enrollmentCreated,
          entityType: 'Enrollment',
          entityId: newEnrollment.id,
          entityLabel: `${studentName} → ${classItem.className}`,
        });

        const updatedClass: ClassItem = {
          ...classItem,
          teacherUserId: teacherChanged ? teacherUserId : classItem.teacherUserId,
          teacherName: teacherChanged ? teacherName : classItem.teacherName,
          startDate,
          endDate: repeat ? endDate : classItem.endDate,
        };
        setClassItem(updatedClass);
        if (teacherChanged) {
          logAdminAction(user, {
            action: AUDIT_ACTIONS.classUpdated,
            entityType: 'Class',
            entityId: updatedClass.id,
            entityLabel: updatedClass.className,
            details: `Teacher: ${teacherName}`,
          });
        }

        if (repeat) {
          const result = generateMockSessions([updatedClass], startDate, endDate, updatedClass.id);
          setClassSessions(sessionsForClass(result.sessions, updatedClass.id));
          setSessionMessage(sessionSummary(result.createdCount, result.skippedCount));
        } else {
          const single: ClassSession = {
            id: crypto.randomUUID(),
            classId: updatedClass.id,
            className: updatedClass.className,
            sessionDate: startDate,
            startTime: updatedClass.startTime,
            endTime: updatedClass.endTime,
            status: 'Scheduled',
          };
          addMockSession(single);
          setClassSessions((prev) => sessionsForClass([...prev, single], updatedClass.id));
          setSessionMessage('Added 1 one-off session.');
        }
      } else {
        const created = await enrollmentsApi.create({
          studentUserId,
          classId,
          enrollmentDate,
          status: 'Active',
        });
        setEnrollments((list) => [...list, { ...created, studentName, className: classItem.className }]);
        logAdminAction(user, {
          action: AUDIT_ACTIONS.enrollmentCreated,
          entityType: 'Enrollment',
          entityId: created.id,
          entityLabel: `${studentName} → ${classItem.className}`,
        });

        let effectiveClass = classItem;
        if (teacherChanged || repeat) {
          const payload = classToUpdatePayload(
            classItem,
            teacherChanged ? teacherUserId : classItem.teacherUserId,
            { startDate, endDate: repeat ? endDate : classItem.endDate }
          );
          const updated = await classesApi.update(classItem.id, payload);
          effectiveClass = { ...classItem, ...updated };
          setClassItem(effectiveClass);
          if (teacherChanged) {
            logAdminAction(user, {
              action: AUDIT_ACTIONS.classUpdated,
              entityType: 'Class',
              entityId: classItem.id,
              entityLabel: classItem.className,
              details: `Teacher: ${teacherName}`,
            });
          }
        }

        if (repeat) {
          const result = await classSessionsApi.generate({
            classId,
            fromDate: startDate,
            toDate: endDate,
          });
          setClassSessions((prev) => {
            const byId = new Map(prev.map((s) => [s.id, s]));
            for (const s of result.sessions) byId.set(s.id, s);
            return sessionsForClass([...byId.values()], classId);
          });
          setSessionMessage(sessionSummary(result.createdCount, result.skippedCount));
        } else {
          const single = await classSessionsApi.create({
            classId,
            sessionDate: startDate,
            startTime: effectiveClass.startTime,
            endTime: effectiveClass.endTime,
            status: 'Scheduled',
          });
          setClassSessions((prev) => sessionsForClass([...prev, single], classId));
          setSessionMessage('Added 1 one-off session.');
        }
      }
      setAssignOpen(false);
      setHistoryRefreshKey((k) => k + 1);
    } catch {
      setSessionMessage('Could not complete the assignment. Please try again.');
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
        logAdminAction(user, {
          action: AUDIT_ACTIONS.classUpdated,
          entityType: 'Class',
          entityId: classItem.id,
          entityLabel: classItem.className,
          details: `Teacher: ${teacherName}`,
        });
      } else {
        const updated = await classesApi.update(classItem.id, payload);
        setClassItem({ ...classItem, ...updated });
        setHistoryRefreshKey((k) => k + 1);
        logAdminAction(user, {
          action: AUDIT_ACTIONS.classUpdated,
          entityType: 'Class',
          entityId: classItem.id,
          entityLabel: classItem.className,
          details: `Teacher: ${teacherName}`,
        });
      }
    } catch {
      setClassItem(optimistic);
    } finally {
      setSavingTeacher(false);
    }
  };

  const handleGenerateSessions = async (weeks: number) => {
    if (!classItem) return;
    setGeneratingSessions(true);
    setSessionMessage('');
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    try {
      if (isMock) {
        const result = generateMockSessions([classItem], from, to, classItem.id);
        setClassSessions(sessionsForClass(result.sessions, classItem.id));
        setSessionMessage(`Generated ${result.createdCount} sessions (${result.skippedCount} skipped).`);
      } else {
        const result = await classSessionsApi.generate({
          classId: classItem.id,
          fromDate: from,
          toDate: to,
        });
        setClassSessions((prev) => {
          const byId = new Map(prev.map((s) => [s.id, s]));
          for (const s of result.sessions) byId.set(s.id, s);
          return sessionsForClass([...byId.values()], classItem.id);
        });
        setSessionMessage(`Generated ${result.createdCount} sessions (${result.skippedCount} skipped).`);
      }
    } catch {
      setSessionMessage('Could not generate sessions.');
    } finally {
      setGeneratingSessions(false);
    }
  };

  const openSessionAction = (session: ClassSession, mode: ClassSessionActionMode) => {
    setSessionActionTarget(session);
    setSessionActionMode(mode);
    setSessionActionOpen(true);
  };

  const handleSessionActionConfirm = async (payload: {
    reason: string;
    sessionDate?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
  }) => {
    if (!sessionActionTarget || !classId) return;
    setSessionActionSaving(true);
    setSessionMessage('');
    try {
      if (sessionActionMode === 'cancel') {
        if (isMock) {
          setClassSessions((prev) =>
            prev.map((s) =>
              s.id === sessionActionTarget.id ? { ...s, status: 'Cancelled' as const } : s
            )
          );
        } else {
          await classSessionsApi.remove(sessionActionTarget.id, payload.reason);
          setClassSessions((prev) =>
            prev.map((s) =>
              s.id === sessionActionTarget.id ? { ...s, status: 'Cancelled' as const } : s
            )
          );
        }
        setSessionMessage('Session cancelled and recorded in history.');
      } else if (payload.sessionDate && payload.startTime && payload.endTime) {
        if (isMock) {
          const replacement: ClassSession = {
            id: `cs-rep-${Date.now()}`,
            classId,
            sessionDate: payload.sessionDate,
            startTime: payload.startTime,
            endTime: payload.endTime,
            status: 'Rescheduled',
            notes: payload.notes,
          };
          setClassSessions((prev) =>
            sessionsForClass(
              [
                ...prev.map((s) =>
                  s.id === sessionActionTarget.id ? { ...s, status: 'Cancelled' as const } : s
                ),
                replacement,
              ],
              classId
            )
          );
        } else {
          const replacement = await classSessionsApi.replace(sessionActionTarget.id, {
            sessionDate: payload.sessionDate,
            startTime: payload.startTime,
            endTime: payload.endTime,
            reason: payload.reason,
            notes: payload.notes,
          });
          setClassSessions((prev) =>
            sessionsForClass(
              [
                ...prev.map((s) =>
                  s.id === sessionActionTarget.id ? { ...s, status: 'Cancelled' as const } : s
                ),
                replacement,
              ],
              classId
            )
          );
        }
        setSessionMessage('Replacement session created and recorded in history.');
      }
      setHistoryRefreshKey((k) => k + 1);
      setSessionActionOpen(false);
      setSessionActionTarget(null);
    } catch {
      setSessionMessage('Could not save the session change.');
    } finally {
      setSessionActionSaving(false);
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
          counts={{ Students: enrolledCount, Sessions: classSessions.length }}
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
                <DetailRow label="Term dates">
                  {classItem.startDate || classItem.endDate
                    ? `${classItem.startDate ? formatDateDDMMYYYY(classItem.startDate) : '—'} → ${
                        classItem.endDate ? formatDateDDMMYYYY(classItem.endDate) : '—'
                      }`
                    : 'Not set'}
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

          {mainTab === 'Sessions' && (
            <div className="overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                <p className="text-sm text-slate-600">
                  Sessions auto-created from the weekly schedule ({classItem?.dayOfWeek}). Holidays are skipped.
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={generatingSessions}
                    onClick={() => handleGenerateSessions(4)}
                  >
                    <RefreshCw className="mr-1 h-4 w-4" />
                    4 weeks
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={generatingSessions}
                    onClick={() => handleGenerateSessions(8)}
                  >
                    Generate 8 weeks
                  </Button>
                </div>
              </div>
              {sessionMessage && (
                <p className="border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
                  {sessionMessage}
                </p>
              )}
              <DataTable
                embedded
                centered
                data={classSessions}
                emptyMessage="No sessions yet. Generate sessions from the class weekly schedule."
                columns={[
                  {
                    key: 'sessionDate',
                    header: 'Date',
                    sortable: true,
                    sortType: 'date',
                    getSortValue: (s) => s.sessionDate,
                    render: (s) => formatDateDDMMYYYY(s.sessionDate),
                  },
                  {
                    key: 'time',
                    header: 'Time',
                    render: (s) => `${s.startTime} – ${s.endTime}`,
                  },
                  {
                    key: 'topic',
                    header: 'Topic',
                    render: (s) => s.topic || '—',
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (s) => <StatusBadge status={s.status} />,
                  },
                  {
                    key: 'actions',
                    header: '',
                    render: (s) =>
                      s.status === 'Cancelled' || s.status === 'Completed' ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openSessionAction(s, 'cancel')}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => openSessionAction(s, 'replace')}
                          >
                            Replace
                          </Button>
                        </div>
                      ),
                  },
                ]}
              />
              {classId && (
                <>
                  <ClassAssignmentChangeLogPanel classId={classId} refreshKey={historyRefreshKey} />
                  <ClassSessionChangeHistoryPanel classId={classId} refreshKey={historyRefreshKey} />
                </>
              )}
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
          teachers={teachers}
          currentTeacherUserId={classItem.teacherUserId}
          saving={savingStudent}
          onAssign={handleAssign}
        />
      )}

      <ClassSessionActionModal
        open={sessionActionOpen}
        mode={sessionActionMode}
        session={sessionActionTarget}
        saving={sessionActionSaving}
        onClose={() => {
          setSessionActionOpen(false);
          setSessionActionTarget(null);
        }}
        onConfirm={handleSessionActionConfirm}
      />
    </div>
  );
}
