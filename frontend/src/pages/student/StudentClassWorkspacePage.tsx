import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  FolderOpen,
  GraduationCap,
  Users,
  Video,
} from 'lucide-react';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { MaterialVideoPlayer } from '@/components/teacher/classroom/MaterialsTab';
import { useSqlAccountStudent } from '@/hooks/useSqlAccountStudent';
import { useSqlAccountChildEnrollments } from '@/hooks/useSqlAccountChildEnrollments';
import { assignmentsApi, classMaterialsApi, homeworkApi, lessonNotesApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import {
  assignmentWorkStatus,
  classNameMatchesEnrollment,
  dueLabel,
  enrollmentDisplay,
  filterAssignmentsForEnrollment,
  findEnrollmentByKey,
} from '@/utils/studentLearning';
import { cn } from '@/utils/cn';
import type { PortalAssignment, PortalClassMaterial, PortalHomework } from '@/types/portal';
import type { LessonNote } from '@/types';

const TABS = ['stream', 'classwork', 'notes', 'materials', 'people'] as const;
type WorkspaceTab = (typeof TABS)[number];

type StreamPost =
  | { id: string; kind: 'note'; createdAt: string; note: LessonNote }
  | { id: string; kind: 'assignment'; createdAt: string; assignment: PortalAssignment }
  | { id: string; kind: 'video'; createdAt: string; material: PortalClassMaterial };

function parseTab(raw: string | null): WorkspaceTab {
  if (raw && (TABS as readonly string[]).includes(raw)) return raw as WorkspaceTab;
  return 'stream';
}

function initials(name: string | null | undefined, fallback = 'T'): string {
  if (!name?.trim()) return fallback;
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || fallback
  );
}

function AvatarCircle({ name, className }: { name?: string | null; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white',
        className
      )}
    >
      {initials(name)}
    </span>
  );
}

function PostCard({
  author,
  date,
  children,
}: {
  author: string;
  date: string;
  children: ReactNode;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <AvatarCircle name={author} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">{author}</p>
          <p className="text-xs text-slate-500">{formatDateDDMMYYYY(date)}</p>
          <div className="mt-3">{children}</div>
        </div>
      </div>
    </article>
  );
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
  const [materials, setMaterials] = useState<PortalClassMaterial[]>([]);
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
      const [asg, hw, lessonNotes, classMaterials] = await Promise.all([
        assignmentsApi.getMine(student.branchName),
        homeworkApi.getMine(student.branchName),
        lessonNotesApi.getForBranch(student.branchName).catch(() => []),
        classMaterialsApi.getMine(student.branchName).catch(() => []),
      ]);
      setAssignments(asg);
      setSubmissions(hw);
      setNotes(lessonNotes);
      setMaterials(classMaterials);
    } catch {
      setAssignments([]);
      setSubmissions([]);
      setNotes([]);
      setMaterials([]);
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
    return notes
      .filter((n) => classNameMatchesEnrollment(n.className, enrollment))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notes, enrollment]);

  const classVideos = useMemo(() => {
    if (!enrollment) return [];
    return materials.filter((m) => classNameMatchesEnrollment(m.className, enrollment));
  }, [materials, enrollment]);

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

  const streamPosts = useMemo((): StreamPost[] => {
    const posts: StreamPost[] = [
      ...classNotes.map((note) => ({
        id: `note-${note.id}`,
        kind: 'note' as const,
        createdAt: note.createdAt,
        note,
      })),
      ...classAssignments.map((assignment) => ({
        id: `asg-${assignment.id}`,
        kind: 'assignment' as const,
        createdAt: assignment.createdAt || assignment.dueDate,
        assignment,
      })),
      ...classVideos.map((material) => ({
        id: `vid-${material.id}`,
        kind: 'video' as const,
        createdAt: material.createdAt,
        material,
      })),
    ];
    return posts.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [classNotes, classAssignments, classVideos]);

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

  const scheduleLine = [display.day, display.time].filter(Boolean).join(' · ');
  const teacherName = display.teacher || 'Teacher';

  return (
    <div className="space-y-4">
      <Link
        to="/student/courses"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800"
      >
        <ArrowLeft className="h-4 w-4" />
        My Classes
      </Link>

      <div className="relative flex h-36 flex-col justify-end overflow-hidden rounded-xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 px-5 py-4 text-white shadow-sm sm:h-40 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{display.title}</h1>
        {scheduleLine && <p className="mt-1 text-sm text-white/85">{scheduleLine}</p>}
      </div>

      <SlidingTabs
        tabs={TABS}
        value={tab}
        onChange={(v) => setTab(v as WorkspaceTab)}
        labels={{
          stream: 'Stream',
          classwork: 'Classwork',
          notes: 'Lesson Notes',
          materials: 'Materials',
          people: 'People',
        }}
        className="rounded-none border-x-0 border-t-0 bg-transparent"
      />

      <div className="pt-1">
        {tab === 'stream' && (
          <StreamPanel
            posts={streamPosts}
            upcoming={classworkGroups.upcoming}
            teacherName={teacherName}
            onViewAllClasswork={() => setTab('classwork')}
            onOpenMaterials={() => setTab('materials')}
          />
        )}

        {tab === 'classwork' && (
          <ClassworkPanel
            groups={classworkGroups}
            submissionByAssignment={submissionByAssignment}
            empty={classAssignments.length === 0}
          />
        )}

        {tab === 'notes' && <NotesPanel notes={classNotes} />}

        {tab === 'materials' && <MaterialsPanel videos={classVideos} />}

        {tab === 'people' && <PeoplePanel teacherName={display.teacher} />}
      </div>
    </div>
  );
}

function StreamPanel({
  posts,
  upcoming,
  teacherName,
  onViewAllClasswork,
  onOpenMaterials,
}: {
  posts: StreamPost[];
  upcoming: PortalAssignment[];
  teacherName: string;
  onViewAllClasswork: () => void;
  onOpenMaterials: () => void;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row-reverse">
      <aside className="w-full shrink-0 lg:w-72">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-medium text-slate-900">Upcoming</h3>
          {upcoming.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Woohoo, no work due soon!</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {upcoming.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/student/assignments/${encodeURIComponent(a.id)}`}
                    className="block text-sm font-medium text-slate-800 hover:text-primary-700"
                  >
                    {a.title}
                  </Link>
                  <p className="text-xs text-slate-500">{dueLabel(a.dueDate)}</p>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={onViewAllClasswork}
            className="mt-4 text-sm font-medium text-primary-700 hover:underline"
          >
            View all
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-3">
        {posts.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No class activity yet"
            description="Posts from your teacher will appear here."
            compact
          />
        ) : (
          posts.map((post) => (
            <StreamPostCard
              key={post.id}
              post={post}
              teacherName={teacherName}
              onOpenMaterials={onOpenMaterials}
            />
          ))
        )}
      </div>
    </div>
  );
}

function StreamPostCard({
  post,
  teacherName,
  onOpenMaterials,
}: {
  post: StreamPost;
  teacherName: string;
  onOpenMaterials: () => void;
}) {
  if (post.kind === 'note') {
    const author = post.note.teacherName || teacherName;
    return (
      <PostCard author={author} date={post.createdAt}>
        <p className="text-base font-medium text-slate-900">{post.note.noteTitle}</p>
        {post.note.noteContent && (
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{post.note.noteContent}</p>
        )}
      </PostCard>
    );
  }

  if (post.kind === 'assignment') {
    const author = post.assignment.createdByName || teacherName;
    return (
      <PostCard author={author} date={post.createdAt}>
        <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <BookOpen className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900">{post.assignment.title}</p>
            <p className="text-xs text-slate-500">{dueLabel(post.assignment.dueDate)}</p>
            <Link
              to={`/student/assignments/${encodeURIComponent(post.assignment.id)}`}
              className="mt-2 inline-block text-sm font-medium text-primary-700 hover:underline"
            >
              View assignment
            </Link>
          </div>
        </div>
      </PostCard>
    );
  }

  const author = post.material.uploadedByName || teacherName;
  return (
    <PostCard author={author} date={post.createdAt}>
      <button
        type="button"
        onClick={onOpenMaterials}
        className="flex w-full items-start gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-left hover:border-primary-200"
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-800">
          <Video className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">{post.material.title}</p>
          <p className="text-xs text-slate-500">Lesson video · Open Materials</p>
        </div>
      </button>
    </PostCard>
  );
}

function ClassworkPanel({
  groups,
  submissionByAssignment,
  empty,
}: {
  groups: {
    upcoming: PortalAssignment[];
    pastDue: PortalAssignment[];
    completed: PortalAssignment[];
  };
  submissionByAssignment: Map<string, PortalHomework>;
  empty: boolean;
}) {
  if (empty) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="You're all caught up!"
        description="No assignments are waiting for this class."
      />
    );
  }

  const sections = [
    ['Upcoming', groups.upcoming],
    ['Past due', groups.pastDue],
    ['Completed', groups.completed],
  ] as const;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {sections.map(([label, rows]) =>
        rows.length === 0 ? null : (
          <section key={label}>
            <h3 className="mb-2 text-sm font-medium text-slate-500">{label}</h3>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              {rows.map((a) => {
                const status = assignmentWorkStatus(a, submissionByAssignment.get(a.id));
                return (
                  <li key={a.id}>
                    <Link
                      to={`/student/assignments/${encodeURIComponent(a.id)}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
                        <BookOpen className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">{a.title}</p>
                        <p className="text-xs text-slate-500">{status}</p>
                      </div>
                      <p className="shrink-0 text-xs text-slate-500">
                        Due {formatDateDDMMYYYY(a.dueDate)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )
      )}
    </div>
  );
}

function NotesPanel({ notes }: { notes: LessonNote[] }) {
  if (notes.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No lesson notes yet"
        description="Practice notes from your teacher will appear here."
      />
    );
  }

  return (
    <ul className="mx-auto max-w-3xl space-y-3">
      {notes.map((n) => (
        <li key={n.id}>
          <PostCard author={n.teacherName || 'Teacher'} date={n.createdAt}>
            <p className="text-base font-medium text-slate-900">{n.noteTitle}</p>
            {n.noteContent && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{n.noteContent}</p>
            )}
            {n.practiceInstructions && (
              <p className="mt-2 text-sm text-slate-500">{n.practiceInstructions}</p>
            )}
          </PostCard>
        </li>
      ))}
    </ul>
  );
}

function MaterialsPanel({ videos }: { videos: PortalClassMaterial[] }) {
  if (videos.length === 0) {
    return (
      <EmptyState
        icon={FolderOpen}
        title="No videos yet"
        description="Lesson videos from your teacher will appear here."
      />
    );
  }

  return (
    <ul className="mx-auto max-w-3xl space-y-4">
      {videos.map((m) => (
        <li
          key={m.id}
          className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Video className="h-4 w-4 shrink-0 text-primary-600" />
                <span className="truncate">{m.title}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatDateDDMMYYYY(m.createdAt)}
                {m.uploadedByName ? ` · ${m.uploadedByName}` : ''}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Download video"
              onClick={() => void classMaterialsApi.downloadFile(m.id, m.fileName)}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
          <div className="p-4">
            <MaterialVideoPlayer materialId={m.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function PeoplePanel({ teacherName }: { teacherName: string | null }) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section>
        <h3 className="border-b border-slate-200 pb-2 text-sm font-medium text-slate-500">
          Teachers
        </h3>
        <div className="mt-4 flex items-center gap-3">
          <AvatarCircle name={teacherName} />
          <div>
            <p className="text-sm font-medium text-slate-900">{teacherName || 'Your teacher'}</p>
            <p className="text-xs text-slate-500">Teacher</p>
          </div>
        </div>
      </section>
      <section>
        <h3 className="border-b border-slate-200 pb-2 text-sm font-medium text-slate-500">
          Classmates
        </h3>
        <EmptyState
          icon={Users}
          title="Classmates not listed"
          description="Classmate details are not available in the student portal."
          compact
          className="mt-4"
        />
      </section>
    </div>
  );
}
