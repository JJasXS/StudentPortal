import { useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { CourseClassLessonNotesExplorer } from '@/components/student/CourseClassLessonNotesExplorer';
import { useLearnerContext } from '@/hooks/useLearnerContext';
import { mockLessonNotes } from '@/utils/mockData';
import { resolveLearnerStudentId } from '@/utils/learnerCourses';

export default function LearnerCoursesPage() {
  const { user } = useLearnerContext();
  const mockStudentId = useMemo(
    () => resolveLearnerStudentId(user?.email, user?.id),
    [user?.email, user?.id]
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="My Courses"
        description="Course → class → lesson notes from your teachers"
      />
      <CourseClassLessonNotesExplorer
        studentUserId={mockStudentId}
        notes={mockLessonNotes}
        title="Courses"
        urlSync
      />
    </div>
  );
}
