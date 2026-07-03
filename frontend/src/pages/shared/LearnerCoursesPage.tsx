import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { CourseClassLessonNotesExplorer } from '@/components/student/CourseClassLessonNotesExplorer';
import { SqlAccountBranchCard } from '@/components/parent/SqlAccountBranchCard';
import { SqlAccountChildEnrollmentsList } from '@/components/parent/SqlAccountChildEnrollmentsList';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useSqlAccountChildren } from '@/hooks/useSqlAccountChildren';
import { useSqlAccountChildEnrollments } from '@/hooks/useSqlAccountChildEnrollments';
import { mockLessonNotes } from '@/utils/mockData';
import { resolveLearnerStudentId } from '@/utils/learnerCourses';
import { learnerCoursesPath } from '@/utils/learnerPortal';

export default function LearnerCoursesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isParent = user?.role === 'Parent';
  const parentReady = isParent && !authLoading;
  const coursesBasePath = learnerCoursesPath(user?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const { courseId } = useParams();
  const selectedBranchKey = searchParams.get('child');
  const activeChildKey = resolveActiveChildKey(selectedBranchKey, courseId);

  const { children, loading, error } = useSqlAccountChildren(parentReady);

  const selectedChild = useMemo(
    () => children.find((c) => branchKey(c) === activeChildKey) ?? null,
    [children, activeChildKey]
  );

  const enrollmentsBranchName =
    selectedChild?.branchName?.trim() || activeChildKey || null;
  const {
    enrollments,
    loading: enrollmentsLoading,
    error: enrollmentsError,
  } = useSqlAccountChildEnrollments(
    enrollmentsBranchName,
    parentReady && Boolean(activeChildKey)
  );

  const mockStudentId = useMemo(
    () => resolveLearnerStudentId(user?.email, user?.id),
    [user?.email, user?.id]
  );

  const showChildDetail = Boolean(activeChildKey);

  if (isParent) {
    const childLabel = selectedChild
      ? displayBranchName(selectedChild)
      : activeChildKey || 'Child';

    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="My Children"
          description={
            showChildDetail
              ? `Enrolled classes for ${childLabel} from SQL Account`
              : 'Children linked to your SQL Account family record'
          }
        />

        {showChildDetail ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
            >
              <ChevronLeft className="h-4 w-4" />
              All children
            </button>

            {selectedChild ? (
              <SqlAccountBranchCard child={selectedChild} selected />
            ) : loading ? (
              <SkeletonCard />
            ) : (
              <EmptyState
                title="Child not found"
                description={`"${activeChildKey}" is not linked to your SQL Account record.`}
              />
            )}

            <SqlAccountChildEnrollmentsList
              branchName={childLabel}
              enrollments={enrollments}
              loading={enrollmentsLoading}
              error={enrollmentsError}
              title={`${childLabel} — enrolled classes`}
            />
          </div>
        ) : (
          <>
            {loading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : error ? (
              <EmptyState title="Could not load children" description={error} />
            ) : children.length === 0 ? (
              <EmptyState
                title="No children found"
                description="Your SQL Account record has no branch names yet. Contact the centre if this looks wrong."
              />
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {children.map((child, index) => (
                  <SqlAccountBranchCard
                    key={branchKey(child)}
                    child={child}
                    index={index}
                    onClick={() => setSearchParams({ child: branchKey(child) })}
                  />
                ))}
              </div>
            )}
          </>
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
      <CourseClassLessonNotesExplorer
        studentUserId={mockStudentId}
        notes={mockLessonNotes}
        title="Courses"
        coursesBasePath={coursesBasePath}
        urlSync
      />
    </div>
  );
}

function normalizeBranchKey(key: string | null): string {
  if (!key) return '';
  try {
    return decodeURIComponent(key).trim().toLowerCase();
  } catch {
    return key.trim().toLowerCase();
  }
}

const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Child drill-in from ?child= or legacy /parent/children/:courseId path (branch name). */
function resolveActiveChildKey(childParam: string | null, courseId: string | undefined): string {
  const fromQuery = normalizeBranchKey(childParam);
  if (fromQuery) return fromQuery;
  if (courseId && !GUID_PATTERN.test(courseId)) {
    return normalizeBranchKey(courseId);
  }
  return '';
}

function branchKey(child: { branchName: string; attention?: string | null }) {
  return (child.branchName?.trim() || child.attention?.trim() || 'child').toLowerCase();
}

function displayBranchName(child: { branchName: string; attention?: string | null }) {
  return child.branchName?.trim() || child.attention?.trim() || 'Child';
}
