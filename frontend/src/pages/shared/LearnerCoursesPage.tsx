import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { CourseClassLessonNotesExplorer } from '@/components/student/CourseClassLessonNotesExplorer';
import { ParentChildHomeworkPanel } from '@/components/parent/ParentChildHomeworkPanel';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useSqlAccountStudent } from '@/hooks/useSqlAccountStudent';
import { useStudentPortalData } from '@/hooks/useStudentPortalData';
import { learnerCoursesPath } from '@/utils/learnerPortal';

export default function LearnerCoursesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isLearner = user?.role === 'Student' || user?.role === 'Parent';
  const coursesBasePath = learnerCoursesPath(user?.role);

  const { student, loading, hasFetched, error, reload } = useSqlAccountStudent(isLearner);

  const {
    studentUserId,
    lessonNotes,
    loading: studentPortalLoading,
    error: studentPortalError,
  } = useStudentPortalData(!isLearner);

  const studentLabel = useMemo(
    () => student?.studentName?.trim() || user?.fullName || 'Student',
    [student?.studentName, user?.fullName]
  );

  if (isLearner) {
    const waiting = authLoading || loading || !hasFetched;

    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <PageHeader
          title="Assignment"
          description={`Assignment for ${studentLabel}`}
        />

        {waiting ? (
          <SkeletonCard />
        ) : error ? (
          <EmptyState
            icon={Users}
            title="Could not load student"
            description={error}
            actions={[{ label: 'Try again', onClick: reload }]}
          />
        ) : !student?.branchName ? (
          <EmptyState
            icon={Users}
            title="No student found"
            description="Sign in with a customer email linked in SQL Account."
          />
        ) : (
          <Card>
            <CardContent className="p-4">
              <ParentChildHomeworkPanel branchName={student.branchName} />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="My Courses"
        description="Course → class → lesson notes from your teachers"
      />
      {studentPortalLoading ? (
        <SkeletonCard />
      ) : studentPortalError ? (
        <p className="text-sm text-red-600">{studentPortalError}</p>
      ) : (
        <CourseClassLessonNotesExplorer
          studentUserId={studentUserId ?? ''}
          notes={lessonNotes}
          title="Courses"
          coursesBasePath={coursesBasePath}
          urlSync
        />
      )}
    </div>
  );
}
