import type { LessonNote } from '@/types';
import type { PortalHomework } from '@/types/portal';

export function lessonNotesForHomework(
  homework: PortalHomework,
  notes: LessonNote[]
): LessonNote[] {
  return notes
    .filter((note) => {
      if (note.homeworkId && note.homeworkId === homework.id) return true;
      if (note.homeworkId) return false;

      const classMatch =
        note.className &&
        homework.className &&
        note.className.toLowerCase() === homework.className.toLowerCase();
      if (!classMatch) return false;

      const studentName = note.studentName?.trim().toLowerCase() ?? '';
      const submittedBy = homework.submittedBy?.trim().toLowerCase() ?? '';
      const branchName = homework.branchName?.trim().toLowerCase() ?? '';
      const studentMatch =
        (submittedBy && studentName === submittedBy) ||
        (branchName && studentName === branchName);
      if (!studentMatch) return false;

      return new Date(note.createdAt).getTime() >= new Date(homework.createdAt).getTime();
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
