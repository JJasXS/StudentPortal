import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  MapPin,
  NotebookPen,
  User,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { cn } from '@/utils/cn';
import {
  buildLearnerCourseGroups,
  classMeta,
  currentLessonNoteMonthKey,
  isValidMonthKey,
  lessonNoteMonthLabel,
  lessonNotesForClassMonth,
  monthOffsetForKey,
  studentCoursesUrl,
  type LearnerCourseGroup,
} from '@/utils/learnerCourses';
import { mockLessonNotes } from '@/utils/mockData';
import type { LessonNote } from '@/types';

type Step = 'courses' | 'classes' | 'notes';

const COURSE_ACCENTS = [
  'border-violet-200 bg-violet-50/60 text-violet-900',
  'border-sky-200 bg-sky-50/60 text-sky-900',
  'border-amber-200 bg-amber-50/60 text-amber-900',
  'border-emerald-200 bg-emerald-50/60 text-emerald-900',
  'border-rose-200 bg-rose-50/60 text-rose-900',
];

interface CourseClassLessonNotesExplorerProps {
  studentUserId: string;
  notes?: LessonNote[];
  title?: string;
  showViewAllLink?: boolean;
  compact?: boolean;
  /** Sync course / class / month / note selection to the URL (full page). */
  urlSync?: boolean;
}

function formatClassSchedule(classId: string) {
  const cls = classMeta(classId);
  if (!cls) return null;
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  return `${cls.dayOfWeek} · ${fmt(cls.startTime)} – ${fmt(cls.endTime)}`;
}

function Breadcrumbs({
  items,
}: {
  items: Array<{ label: string; href?: string; onClick?: () => void }>;
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1 text-xs">
      {items.map((item, i) => (
        <span key={item.label + i} className="inline-flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300" />}
          {item.href ? (
            <Link to={item.href} className="font-medium text-primary-600 hover:underline">
              {item.label}
            </Link>
          ) : item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className="font-medium text-primary-600 hover:underline"
            >
              {item.label}
            </button>
          ) : (
            <span className="font-medium text-slate-500">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function CourseClassLessonNotesExplorer({
  studentUserId,
  notes = mockLessonNotes,
  title = 'My courses',
  showViewAllLink = false,
  compact = false,
  urlSync = false,
}: CourseClassLessonNotesExplorerProps) {
  const navigate = useNavigate();
  const { courseId: urlCourseId, classId: urlClassId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [localCourseId, setLocalCourseId] = useState<string | null>(null);
  const [localClassId, setLocalClassId] = useState<string | null>(null);
  const [localMonthOffset, setLocalMonthOffset] = useState(0);
  const [localNoteId, setLocalNoteId] = useState<string | null>(null);

  const studentNotes = useMemo(
    () => notes.filter((n) => n.studentUserId === studentUserId),
    [notes, studentUserId]
  );

  const courseGroups = useMemo(
    () => buildLearnerCourseGroups(studentUserId, studentNotes),
    [studentUserId, studentNotes]
  );

  const courseId = urlSync ? (urlCourseId ?? null) : localCourseId;
  const classId = urlSync ? (urlClassId ?? null) : localClassId;

  const selectedCourse = useMemo(
    () => courseGroups.find((g) => g.courseId === courseId) ?? null,
    [courseGroups, courseId]
  );

  const selectedClass = useMemo(
    () => selectedCourse?.classes.find((c) => c.classId === classId) ?? null,
    [selectedCourse, classId]
  );

  const selectedClassName = selectedClass?.className ?? null;

  const step: Step = useMemo(() => {
    if (courseId && classId && selectedClassName) return 'notes';
    if (courseId && selectedCourse) return 'classes';
    return 'courses';
  }, [courseId, classId, selectedClassName, selectedCourse]);

  const monthKey = useMemo(() => {
    if (urlSync) {
      const param = searchParams.get('month');
      if (isValidMonthKey(param)) return param;
      return currentLessonNoteMonthKey(0);
    }
    return currentLessonNoteMonthKey(localMonthOffset);
  }, [urlSync, searchParams, localMonthOffset]);

  const expandedNoteId = urlSync ? searchParams.get('note') : localNoteId;
  const isCurrentMonth = monthKey === currentLessonNoteMonthKey(0);

  useEffect(() => {
    if (!urlSync || courseGroups.length === 0) return;
    if (urlCourseId && !courseGroups.some((g) => g.courseId === urlCourseId)) {
      navigate('/student/courses', { replace: true });
      return;
    }
    if (urlCourseId && urlClassId && selectedCourse) {
      const valid = selectedCourse.classes.some((c) => c.classId === urlClassId);
      if (!valid) {
        navigate(studentCoursesUrl({ courseId: urlCourseId }), { replace: true });
      }
    }
  }, [urlSync, urlCourseId, urlClassId, courseGroups, selectedCourse, navigate]);

  const classNotes = useMemo(() => {
    if (!selectedClassName) return [];
    return lessonNotesForClassMonth(studentNotes, studentUserId, selectedClassName, monthKey);
  }, [studentNotes, studentUserId, selectedClassName, monthKey]);

  const goCourses = () => {
    if (urlSync) {
      navigate('/student/courses');
      return;
    }
    setLocalCourseId(null);
    setLocalClassId(null);
    setLocalNoteId(null);
    setLocalMonthOffset(0);
  };

  const goClasses = (targetCourseId: string) => {
    if (urlSync) {
      navigate(studentCoursesUrl({ courseId: targetCourseId }));
      return;
    }
    setLocalClassId(null);
    setLocalNoteId(null);
    setLocalMonthOffset(0);
  };

  const openClass = (targetCourseId: string, targetClassId: string) => {
    if (urlSync) {
      navigate(studentCoursesUrl({ courseId: targetCourseId, classId: targetClassId }));
      return;
    }
    setLocalCourseId(targetCourseId);
    setLocalClassId(targetClassId);
    setLocalNoteId(null);
    setLocalMonthOffset(0);
  };

  const openCourse = (group: LearnerCourseGroup) => {
    if (urlSync) {
      navigate(studentCoursesUrl({ courseId: group.courseId }));
      return;
    }
    setLocalCourseId(group.courseId);
    setLocalClassId(null);
    setLocalNoteId(null);
    setLocalMonthOffset(0);
  };

  const shiftMonth = (delta: number) => {
    const offset = monthOffsetForKey(monthKey) + delta;
    const nextKey = currentLessonNoteMonthKey(offset);
    if (offset > 0) return;

    if (urlSync && courseId && classId) {
      const params = new URLSearchParams(searchParams);
      if (offset === 0) params.delete('month');
      else params.set('month', nextKey);
      params.delete('note');
      setSearchParams(params, { replace: true });
      return;
    }
    setLocalMonthOffset(offset);
    setLocalNoteId(null);
  };

  const toggleNote = (noteId: string) => {
    const open = expandedNoteId === noteId;
    if (urlSync && courseId && classId) {
      const params = new URLSearchParams(searchParams);
      if (open) params.delete('note');
      else params.set('note', noteId);
      setSearchParams(params, { replace: true });
      return;
    }
    setLocalNoteId(open ? null : noteId);
  };

  if (courseGroups.length === 0) {
    return (
      <Card className="overflow-hidden border-slate-200/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <EmptyState
            icon={GraduationCap}
            title="No courses yet"
            description="Your enrolled courses will appear here."
          />
        </CardContent>
      </Card>
    );
  }

  const breadcrumbItems: Array<{ label: string; href?: string; onClick?: () => void }> = [
    {
      label: 'Courses',
      ...(urlSync
        ? { href: '/student/courses' }
        : { onClick: step !== 'courses' ? goCourses : undefined }),
    },
  ];
  if (step !== 'courses' && selectedCourse) {
    breadcrumbItems.push({
      label: selectedCourse.courseName,
      ...(step === 'notes'
        ? urlSync
          ? { href: studentCoursesUrl({ courseId: selectedCourse.courseId }) }
          : { onClick: () => goClasses(selectedCourse.courseId) }
        : {}),
    });
  }
  if (step === 'notes' && selectedClassName) {
    breadcrumbItems.push({ label: selectedClassName });
  }

  return (
    <Card className="overflow-hidden border-slate-200/80 shadow-sm">
      <CardHeader className="space-y-0 border-b border-slate-100 bg-gradient-to-br from-white to-slate-50/80 pb-4">
        <div className="flex flex-row items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {step !== 'courses' && (
              <Breadcrumbs items={breadcrumbItems} />
            )}
            <CardTitle className="text-lg font-semibold tracking-tight text-slate-900">
              {step === 'courses' && title}
              {step === 'classes' && selectedCourse?.courseName}
              {step === 'notes' && selectedClassName}
            </CardTitle>
            {step === 'courses' && (
              <p className="mt-1 text-sm text-slate-500">
                Select a course, then a class, to read lesson notes from your teachers.
              </p>
            )}
            {step === 'classes' && selectedCourse && (
              <p className="mt-1 text-sm text-slate-500">
                {selectedCourse.classes.length} class
                {selectedCourse.classes.length === 1 ? '' : 'es'} · pick one to view notes
              </p>
            )}
            {step === 'notes' && selectedCourse && (
              <p className="mt-1 text-sm text-slate-500">
                {selectedCourse.courseName}
                {selectedClass?.teacherName ? ` · ${selectedClass.teacherName}` : ''}
              </p>
            )}
          </div>
          {showViewAllLink && step === 'courses' && (
            <Link
              to="/student/courses"
              className="shrink-0 text-sm font-medium text-primary-600 hover:underline"
            >
              View all
            </Link>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {step === 'courses' && (
          <ul className={cn(compact ? 'divide-y divide-slate-100' : 'grid gap-3 p-4 sm:grid-cols-2')}>
            {courseGroups.map((group, index) => {
              const accent = COURSE_ACCENTS[index % COURSE_ACCENTS.length];
              return (
                <li key={group.courseId}>
                  <button
                    type="button"
                    onClick={() => openCourse(group)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 text-left transition',
                      compact
                        ? 'px-6 py-3.5 hover:bg-slate-50'
                        : cn(
                            'rounded-xl border p-4 shadow-sm hover:shadow-md',
                            accent
                          )
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!compact && (
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/80 shadow-sm">
                            <BookOpen className="h-4 w-4 opacity-70" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold">{group.courseName}</p>
                          <p className={cn('text-sm', compact ? 'text-slate-500' : 'opacity-80')}>
                            {group.classes.length} class{group.classes.length === 1 ? '' : 'es'}
                            {group.noteCount > 0 && ` · ${group.noteCount} notes`}
                          </p>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {step === 'classes' && selectedCourse && (
          <ul className="divide-y divide-slate-100">
            {selectedCourse.classes.map((cls) => {
              const schedule = formatClassSchedule(cls.classId);
              const meta = classMeta(cls.classId);
              return (
                <li key={cls.classId}>
                  <button
                    type="button"
                    onClick={() => openClass(selectedCourse.courseId, cls.classId)}
                    className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700">
                        {(cls.teacherName ?? 'T').charAt(0)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{cls.className}</p>
                        {cls.teacherName && (
                          <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                            <User className="h-3.5 w-3.5" />
                            {cls.teacherName}
                          </p>
                        )}
                        {schedule && (
                          <p className="mt-0.5 text-xs text-slate-400">{schedule}</p>
                        )}
                        {meta?.location && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                            <MapPin className="h-3 w-3" />
                            {meta.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {cls.noteCount > 0 && (
                        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                          {cls.noteCount}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {step === 'notes' && (
          <>
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => shiftMonth(-1)}
                aria-label="Previous month"
                className="shrink-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex min-w-0 flex-col items-center gap-0.5">
                <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-700">
                  {isCurrentMonth ? 'This month' : lessonNoteMonthLabel(monthKey)}
                </span>
                {!isCurrentMonth && (
                  <p className="text-xs text-slate-400">{lessonNoteMonthLabel(monthKey)}</p>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => shiftMonth(1)}
                disabled={isCurrentMonth}
                aria-label="Next month"
                className="shrink-0 disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {classNotes.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <NotebookPen className="mx-auto mb-3 h-10 w-10 text-slate-200" />
                <p className="text-sm font-medium text-slate-600">No lesson notes</p>
                <p className="mt-1 text-sm text-slate-400">
                  Nothing recorded for {lessonNoteMonthLabel(monthKey).toLowerCase()}.
                </p>
              </div>
            ) : (
              <ul className="space-y-3 p-4">
                {classNotes.map((note) => {
                  const open = expandedNoteId === note.id;
                  return (
                    <li
                      key={note.id}
                      className={cn(
                        'overflow-hidden rounded-xl border transition',
                        open
                          ? 'border-primary-200 bg-primary-50/20 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleNote(note.id)}
                        className="flex w-full items-start justify-between gap-3 px-4 py-3.5 text-left"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{note.noteTitle}</p>
                          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {note.teacherName ?? 'Teacher'}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span>{formatDateDDMMYYYY(note.createdAt)}</span>
                          </p>
                        </div>
                        <ChevronRight
                          className={cn(
                            'mt-1 h-4 w-4 shrink-0 text-slate-400 transition-transform',
                            open && 'rotate-90 text-primary-500'
                          )}
                        />
                      </button>
                      {open && (
                        <div className="border-t border-slate-100/80 px-4 py-4 text-sm">
                          <p className="leading-relaxed text-slate-700">{note.noteContent}</p>
                          {note.practiceInstructions?.trim() && (
                            <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-amber-950">
                              <p className="text-xs font-semibold uppercase tracking-wide text-amber-700/80">
                                Practice
                              </p>
                              <p className="mt-1">{note.practiceInstructions}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
