import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, GraduationCap, NotebookPen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import {
  buildLearnerCourseGroups,
  currentLessonNoteMonthKey,
  lessonNoteMonthLabel,
  lessonNotesForClassMonth,
  type LearnerCourseGroup,
} from '@/utils/learnerCourses';
import { mockLessonNotes } from '@/utils/mockData';
import type { LessonNote } from '@/types';

type Step = 'courses' | 'classes' | 'notes';

interface CourseClassLessonNotesExplorerProps {
  studentUserId: string;
  notes?: LessonNote[];
  title?: string;
  showViewAllLink?: boolean;
  compact?: boolean;
}

export function CourseClassLessonNotesExplorer({
  studentUserId,
  notes = mockLessonNotes,
  title = 'My courses',
  showViewAllLink = false,
  compact = false,
}: CourseClassLessonNotesExplorerProps) {
  const [step, setStep] = useState<Step>('courses');
  const [selectedCourse, setSelectedCourse] = useState<LearnerCourseGroup | null>(null);
  const [selectedClassName, setSelectedClassName] = useState<string | null>(null);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const studentNotes = useMemo(
    () => notes.filter((n) => n.studentUserId === studentUserId),
    [notes, studentUserId]
  );

  const courseGroups = useMemo(
    () => buildLearnerCourseGroups(studentUserId, studentNotes),
    [studentUserId, studentNotes]
  );

  const monthKey = useMemo(() => currentLessonNoteMonthKey(monthOffset), [monthOffset]);

  const classNotes = useMemo(() => {
    if (!selectedClassName) return [];
    return lessonNotesForClassMonth(studentNotes, studentUserId, selectedClassName, monthKey);
  }, [studentNotes, studentUserId, selectedClassName, monthKey]);

  const isCurrentMonth = monthOffset === 0;

  const goCourses = () => {
    setStep('courses');
    setSelectedCourse(null);
    setSelectedClassName(null);
    setExpandedNoteId(null);
    setMonthOffset(0);
  };

  const goClasses = () => {
    setStep('classes');
    setSelectedClassName(null);
    setExpandedNoteId(null);
    setMonthOffset(0);
  };

  if (courseGroups.length === 0) {
    return (
      <Card>
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="min-w-0">
          {step !== 'courses' && (
            <button
              type="button"
              onClick={step === 'notes' ? goClasses : goCourses}
              className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:underline"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {step === 'notes' ? selectedCourse?.courseName : 'All courses'}
            </button>
          )}
          <CardTitle className="text-base">
            {step === 'courses' && title}
            {step === 'classes' && selectedCourse?.courseName}
            {step === 'notes' && selectedClassName}
          </CardTitle>
          {step === 'notes' && selectedCourse && (
            <p className="text-sm text-slate-500">
              {selectedCourse.courseName} · Review teacher notes by month
            </p>
          )}
        </div>
        {showViewAllLink && step === 'courses' && (
          <Link to="/student/courses" className="text-sm font-medium text-primary-600 hover:underline">
            View all
          </Link>
        )}
      </CardHeader>

      <CardContent className="divide-y divide-slate-100 p-0 pt-0">
        {step === 'courses' &&
          courseGroups.map((group) => (
            <button
              key={group.courseId}
              type="button"
              onClick={() => {
                setSelectedCourse(group);
                setStep('classes');
              }}
              className="flex w-full items-center justify-between gap-3 px-6 py-3.5 text-left transition hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{group.courseName}</p>
                <p className="text-sm text-slate-500">
                  {group.classes.length} class{group.classes.length === 1 ? '' : 'es'}
                  {group.noteCount > 0 && ` · ${group.noteCount} lesson notes`}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </button>
          ))}

        {step === 'classes' &&
          selectedCourse?.classes.map((cls) => (
            <button
              key={cls.classId}
              type="button"
              onClick={() => {
                setSelectedClassName(cls.className);
                setMonthOffset(0);
                setExpandedNoteId(null);
                setStep('notes');
              }}
              className="flex w-full items-center justify-between gap-3 px-6 py-3.5 text-left transition hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{cls.className}</p>
                {cls.teacherName && (
                  <p className="text-sm text-slate-500">{cls.teacherName}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {cls.noteCount > 0 && (
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">
                    {cls.noteCount}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </div>
            </button>
          ))}

        {step === 'notes' && (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
              <button
                type="button"
                onClick={() => {
                  setMonthOffset((m) => m - 1);
                  setExpandedNoteId(null);
                }}
                className="rounded-lg p-1 text-slate-600 hover:bg-slate-100"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-900">
                  {isCurrentMonth ? 'This month' : lessonNoteMonthLabel(monthKey)}
                </p>
                <p className="text-xs text-slate-500">{lessonNoteMonthLabel(monthKey)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMonthOffset((m) => m + 1);
                  setExpandedNoteId(null);
                }}
                disabled={monthOffset >= 0}
                className="rounded-lg p-1 text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Next month"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {classNotes.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-500">
                <NotebookPen className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                No lesson notes for {lessonNoteMonthLabel(monthKey).toLowerCase()}.
              </div>
            ) : (
              <ul className={compact ? 'divide-y divide-slate-100' : ''}>
                {classNotes.map((note) => {
                  const open = expandedNoteId === note.id;
                  return (
                    <li key={note.id}>
                      <button
                        type="button"
                        onClick={() => setExpandedNoteId(open ? null : note.id)}
                        className="flex w-full items-start justify-between gap-3 px-6 py-3.5 text-left transition hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{note.noteTitle}</p>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {note.teacherName ?? 'Teacher'} ·{' '}
                            {formatDateDDMMYYYY(note.createdAt)}
                          </p>
                        </div>
                        <ChevronRight
                          className={`mt-1 h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-90' : ''}`}
                        />
                      </button>
                      {open && (
                        <div className="border-t border-slate-50 bg-slate-50/50 px-6 py-4 text-sm">
                          <p className="leading-relaxed text-slate-700">{note.noteContent}</p>
                          {note.practiceInstructions?.trim() && (
                            <p className="mt-3 text-slate-600">
                              <span className="font-medium text-slate-500">Practice: </span>
                              {note.practiceInstructions}
                            </p>
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
