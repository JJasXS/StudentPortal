import { GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { StudentClassCard } from '@/components/student/StudentClassCard';
import { CourseClassLessonNotesExplorer } from '@/components/student/CourseClassLessonNotesExplorer';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useSqlAccountStudent } from '@/hooks/useSqlAccountStudent';
import { useSqlAccountChildEnrollments } from '@/hooks/useSqlAccountChildEnrollments';
import { useStudentPortalData } from '@/hooks/useStudentPortalData';
import { learnerCoursesPath } from '@/utils/learnerPortal';

export default function LearnerCoursesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isLearner = user?.role === 'Student' || user?.role === 'Parent';
  const coursesBasePath = learnerCoursesPath(user?.role);

  const { student, loading, hasFetched, error, reload } = useSqlAccountStudent(isLearner);
  const { enrollments, loading: enrollmentsLoading } = useSqlAccountChildEnrollments(
    student?.branchName ?? null,
    isLearner && Boolean(student?.branchName)
  );

  const {
    studentUserId,
    lessonNotes,
    loading: studentPortalLoading,
    error: studentPortalError,
  } = useStudentPortalData(!isLearner);

  if (isLearner) {
    const waiting = authLoading || loading || !hasFetched || enrollmentsLoading;

    return (
      <div className="space-y-5">
        <PageHeader
          title="My Classes"
          description="View your classes, learning materials and assignments."
          actions={
            <Link
              to="/student/todo"
              className="text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              Open To Do
            </Link>
          }
        />

        {waiting ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : error ? (
          <EmptyState
            icon={GraduationCap}
            title="Could not load student"
            description={error}
            actions={[{ label: 'Try again', onClick: reload }]}
          />
        ) : !student?.branchName ? (
          <EmptyState
            icon={GraduationCap}
            title="No classes yet"
            description="Your enrolled classes will appear here once your account is linked."
          />
        ) : enrollments.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title="No classes yet"
            description="Your enrolled classes will appear here."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((en) => (
              <StudentClassCard key={`${en.docKey}-${en.seq}`} enrollment={en} />
            ))}
          </div>
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
