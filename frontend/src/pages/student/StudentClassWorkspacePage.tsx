import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  GraduationCap,
  User,
  Users,
} from 'lucide-react';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { TeacherFeedbackCard } from '@/components/student/TeacherFeedbackCard';
import { useSqlAccountStudent } from '@/hooks/useSqlAccountStudent';
import { useSqlAccountChildEnrollments } from '@/hooks/useSqlAccountChildEnrollments';
import { assignmentsApi, homeworkApi, lessonNotesApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import {
  assignmentWorkStatus,
  dueLabel,
  enrollmentDisplay,
  filterAssignmentsForEnrollment,
  findEnrollmentByKey,
  workStatusBadgeClass,
} from '@/utils/studentLearning';
import { cn } from '@/utils/cn';
import type { PortalAssignment, PortalHomework } from '@/types/portal';
import type { LessonNote } from '@/types';

const TABS = ['stream', 'classwork', 'materials', 'people'] as const;
type WorkspaceTab = (typeof TABS)[number];

function parseTab(raw: string | null): WorkspaceTab {
  if (raw && (TABS as readonly string[]).includes(raw)) return raw as WorkspaceTab;
  return 'stream';
}

export default function StudentClassWorkspacePage() {
  const { classKey = '' } = useParams<{ classKey: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));
  const { student, loading: studentLoading } = useSqlAccountStudent(true);
  const { enrollments, loading: enrollmentsLoading } = useSqlAccountChildEnrollments(
    student?.branchName ?? null,
    Boolean(student?.branchName)
  );

  const [assignments, setAssignments] = useState<PortalAssignment[]>([]);
  const [submissions, setSubmissions] = useState<PortalHomework[]>([]);
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [loading, setLoading] = useState(true);

  const decodedKey = decodeURIComponent(classKey);
  const enrollment = useMemo(
    () => findEnrollmentByKey(enrollments, decodedKey),
    [enrollments, decodedKey]
  );
  const display = enrollment ? enrollmentDisplay(enrollment) : null;

  const load = useCallback(async () => {
    if (!student?.branchName) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [asg, hw, lessonNotes] = await Promise.all([
        assignmentsApi.getMine(student.branchName),
        homeworkApi.getMine(student.branchName),
        lessonNotesApi.getForBranch(student.branchName).catch(() => []),
      ]);
      setAssignments(asg);
      setSubmissions(hw);
      setNotes(lessonNotes);
    } catch {
      setAssignments([]);
      setSubmissions([]);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [student?.branchName]);

  useEffect(() => {
    void load();
  }, [load]);

  const classAssignments = useMemo(() => {
    if (!enrollment) return [];
    return filterAssignmentsForEnrollment(assignments, enrollment).sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }, [assignments, enrollment]);

  const submissionByAssignment = useMemo(() => {
    const map = new Map<string, PortalHomework>();
    for (const row of submissions) {
      if (row.assignmentId) map.set(row.assignmentId, row);
    }
    return map;
  }, [submissions]);

  const classNotes = useMemo(() => {
    if (!enrollment) return [];
    const names = [enrollment.className, enrollment.linkedClassName]
      .filter(Boolean)
      .map((n) => n!.toLowerCase());
    return notes.filter((n) => n.className && names.includes(n.className.toLowerCase()));
  }, [notes, enrollment]);

  const classworkGroups = useMemo(() => {
    const upcoming: PortalAssignment[] = [];
    const completed: PortalAssignment[] = [];
    const pastDue: PortalAssignment[] = [];
    for (const a of classAssignments) {
      const status = assignmentWorkStatus(a, submissionByAssignment.get(a.id));
      if (status === 'Completed' || status === 'Submitted' || status === 'Returned') {
        completed.push(a);
      } else if (status === 'Past Due') {
        pastDue.push(a);
      } else {
        upcoming.push(a);
      }
    }
    return { upcoming, completed, pastDue };
  }, [classAssignments, submissionByAssignment]);

  const setTab = (next: WorkspaceTab) => {
    setSearchParams(next === 'stream' ? {} : { tab: next });
  };

  if (studentLoading || enrollmentsLoading || loading) {
    return <p className="text-sm text-slate-500">Loading class…</p>;
  }

  if (!enrollment || !display) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Class not found"
        description="This class may no longer be linked to your account."
        actions={[{ label: 'Back to My Classes', href: '/student/courses' }]}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Link
        to="/student/courses"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800"
      >
        <ArrowLeft className="h-4 w-4" />
        My Classes
      </Link>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 px-5 py-6 text-white shadow-sm sm:px-7">
        <GraduationCap
          className="pointer-events-none absolute -right-2 -top-2 h-36 w-36 text-white/10"
          aria-hidden
        />
        <div className="relative space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{display.title}</h1>
          {display.teacher && (
            <p className="text-sm text-white/90">Teacher: {display.teacher}</p>
          )}
          <p className="text-sm text-white/80">
            {[display.day, display.time, display.room].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <SlidingTabs
          tabs={TABS}
          value={tab}
          onChange={(v) => setTab(v as WorkspaceTab)}
          labels={{
            stream: 'Stream',
            classwork: 'Classwork',
            materials: 'Materials',
            people: 'People',
          }}
          counts={{ classwork: classAssignments.length }}
        />

        <div className="border-t border-slate-100 p-4 sm:p-5">
          {tab === 'stream' && (
            <div className="grid gap-4 lg:grid-cols-[minmax(14rem,30%)_1fr]">
              <aside className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Upcoming class
                  </h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    {display.day && (
                      <li className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-slate-400" />
                        {display.day}
                      </li>
                    )}
                    {display.time && (
                      <li className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        {display.time}
                      </li>
                    )}
                    {display.teacher && (
                      <li className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        {display.teacher}
                      </li>
                    )}
                  </ul>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    To do
                  </h3>
                  {classworkGroups.upcoming.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500">Nothing due right now.</p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {classworkGroups.upcoming.slice(0, 3).map((a) => (
                        <li key={a.id}>
                          <Link
                            to={`/student/assignments/${encodeURIComponent(a.id)}`}
                            className="block text-sm font-medium text-primary-700 hover:underline"
                          >
                            {a.title}
                          </Link>
                          <p className="text-xs text-slate-500">{dueLabel(a.dueDate)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </aside>

              <div className="space-y-3">
                {classAssignments.length === 0 && classNotes.length === 0 ? (
                  <EmptyState
                    icon={BookOpen}
                    title="No class activity yet"
                    description="Assignments and updates from your teacher will appear here."
                    compact
                  />
                ) : (
                  <>
                    {classAssignments.map((a) => (
                      <div
                        key={a.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <p className="text-sm font-medium text-slate-900">
                          Teacher posted an assignment
                        </p>
                        <p className="mt-1 text-sm text-slate-700">{a.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{dueLabel(a.dueDate)}</p>
                        <Link
                          to={`/student/assignments/${encodeURIComponent(a.id)}`}
                          className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline"
                        >
                          View assignment
                        </Link>
                      </div>
                    ))}
                    {classNotes.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <p className="text-sm font-medium text-slate-900">Teacher left feedback</p>
                        <div className="mt-2">
                          <TeacherFeedbackCard note={n} compact />
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {tab === 'classwork' && (
            <div className="space-y-6">
              {(
                [
                  ['Upcoming', classworkGroups.upcoming],
                  ['Past due', classworkGroups.pastDue],
                  ['Completed', classworkGroups.completed],
                ] as const
              ).map(([label, rows]) =>
                rows.length === 0 ? null : (
                  <section key={label} className="space-y-3">
                    <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
                    <ul className="grid gap-3 sm:grid-cols-2">
                      {rows.map((a) => {
                        const status = assignmentWorkStatus(
                          a,
                          submissionByAssignment.get(a.id)
                        );
                        return (
                          <li
                            key={a.id}
                            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                          >
                            <p className="font-medium text-slate-900">{a.title}</p>
                            {a.createdByName && (
                              <p className="mt-0.5 text-xs text-slate-500">{a.createdByName}</p>
                            )}
                            <p className="mt-2 text-xs text-slate-500">
                              Due {formatDateDDMMYYYY(a.dueDate)}
                            </p>
                            <span
                              className={cn(
                                'mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1',
                                workStatusBadgeClass(status)
                              )}
                            >
                              {status}
                            </span>
                            <div className="mt-3">
                              <Link
                                to={`/student/assignments/${encodeURIComponent(a.id)}`}
                                className="text-sm font-medium text-primary-600 hover:underline"
                              >
                                View assignment
                              </Link>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )
              )}
              {classAssignments.length === 0 && (
                <EmptyState
                  icon={CheckCircle2}
                  title="You're all caught up!"
                  description="No assignments are waiting for this class."
                />
              )}
            </div>
          )}

          {tab === 'materials' && (
            classNotes.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="No materials yet"
                description="Lesson notes and practice resources from your teacher will appear here."
              />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {classNotes.map((n) => (
                  <li
                    key={n.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex gap-3">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900">{n.noteTitle}</p>
                        <p className="text-xs text-slate-500">
                          Lesson Notes
                          {n.teacherName ? ` · ${n.teacherName}` : ''}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {formatDateDDMMYYYY(n.createdAt)}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{n.noteContent}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )
          )}

          {tab === 'people' && (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-slate-900">Teacher</h3>
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700">
                    {(display.teacher ?? 'T')
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((p) => p[0]?.toUpperCase() ?? '')
                      .join('') || 'T'}
                  </span>
                  <div>
                    <p className="font-medium text-slate-900">
                      {display.teacher || 'Your teacher'}
                    </p>
                    <p className="text-sm text-slate-500">Class teacher</p>
                  </div>
                </div>
              </section>
              <section>
                <h3 className="text-sm font-semibold text-slate-900">Classmates</h3>
                <EmptyState
                  icon={Users}
                  title="Classmates not listed"
                  description="Classmate details are not available in the student portal."
                  compact
                  className="mt-3"
                />
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
