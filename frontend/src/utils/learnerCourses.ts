import { mockClasses, mockEnrollments } from '@/utils/mockData';
import { resolveMockStudentUserId } from '@/utils/learnerSchedule';
import type { ClassItem, LessonNote } from '@/types';

export interface LearnerClassSummary {
  classId: string;
  className: string;
  teacherName?: string;
  noteCount: number;
}

export interface LearnerCourseGroup {
  courseId: string;
  courseName: string;
  classes: LearnerClassSummary[];
  noteCount: number;
}

export function resolveLearnerStudentId(email?: string, fallbackId?: string): string {
  if (email) return resolveMockStudentUserId(email);
  return fallbackId ?? '4';
}

export function buildLearnerCourseGroups(
  studentUserId: string,
  notes: LessonNote[] = []
): LearnerCourseGroup[] {
  const active = mockEnrollments.filter(
    (e) => e.studentUserId === studentUserId && e.status === 'Active'
  );
  const byCourse = new Map<string, LearnerCourseGroup>();

  for (const e of active) {
    const cls = mockClasses.find((c) => c.id === e.classId);
    const courseId = cls?.courseId ?? 'unknown';
    const courseName = cls?.courseName ?? 'Course';
    const className = e.className ?? cls?.className ?? 'Class';

    if (!byCourse.has(courseId)) {
      byCourse.set(courseId, { courseId, courseName, classes: [], noteCount: 0 });
    }

    const group = byCourse.get(courseId)!;
    const classNotes = notes.filter(
      (n) => n.studentUserId === studentUserId && n.className === className
    );

    group.classes.push({
      classId: e.classId,
      className,
      teacherName: cls?.teacherName,
      noteCount: classNotes.length,
    });
    group.noteCount += classNotes.length;
  }

  return [...byCourse.values()]
    .map((g) => ({
      ...g,
      classes: g.classes.sort((a, b) => a.className.localeCompare(b.className)),
    }))
    .sort((a, b) => a.courseName.localeCompare(b.courseName));
}

export function lessonNotesForClass(
  notes: LessonNote[],
  studentUserId: string,
  className: string
): LessonNote[] {
  return notes
    .filter((n) => n.studentUserId === studentUserId && n.className === className)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function lessonNoteMonthKey(date: string): string {
  return date.slice(0, 7);
}

export function lessonNoteMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function currentLessonNoteMonthKey(monthOffset = 0): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthOffset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function lessonNotesForClassMonth(
  notes: LessonNote[],
  studentUserId: string,
  className: string,
  monthKey: string
): LessonNote[] {
  return lessonNotesForClass(notes, studentUserId, className).filter(
    (n) => lessonNoteMonthKey(n.createdAt) === monthKey
  );
}

export function classMeta(classId: string): ClassItem | undefined {
  return mockClasses.find((c) => c.id === classId);
}
