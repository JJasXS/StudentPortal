import { useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { CourseClassLessonNotesExplorer } from '@/components/student/CourseClassLessonNotesExplorer';
import { ParentChildHomeworkPanel } from '@/components/parent/ParentChildHomeworkPanel';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useSqlAccountChildren } from '@/hooks/useSqlAccountChildren';
import { useSqlAccountChildEnrollments } from '@/hooks/useSqlAccountChildEnrollments';
import { useStudentPortalData } from '@/hooks/useStudentPortalData';
import type { SqlAccountChild } from '@/types/sqlAccount';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { learnerCoursesPath } from '@/utils/learnerPortal';

type ChildTab = 'classes' | 'homework';

export default function LearnerCoursesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isParent = user?.role === 'Parent';
  const coursesBasePath = learnerCoursesPath(user?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const { courseId } = useParams();
  const selectedBranchKey = searchParams.get('child');
  const activeChildKey = resolveActiveChildKey(selectedBranchKey, courseId);
  const childTab = (searchParams.get('tab') === 'homework' ? 'homework' : 'classes') as ChildTab;

  const { children, loading, hasFetched, error, reload } = useSqlAccountChildren(isParent);

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
    isParent && Boolean(activeChildKey)
  );

  const childrenLoading = isParent && (authLoading || loading || !hasFetched);

  const {
    studentUserId,
    lessonNotes,
    loading: studentPortalLoading,
    error: studentPortalError,
  } = useStudentPortalData(!isParent);

  const showChildDetail = Boolean(activeChildKey);

  const setChildTab = (tab: ChildTab) => {
    const params = new URLSearchParams(searchParams);
    if (tab === 'homework') params.set('tab', 'homework');
    else params.delete('tab');
    setSearchParams(params);
  };

  if (isParent) {
    const childLabel = selectedChild
      ? displayBranchName(selectedChild)
      : activeChildKey || 'Child';

    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <PageHeader
          title="Assignment"
          description={
            showChildDetail
              ? `Classes and homework for ${childLabel}`
              : 'Children linked to your SQL Account'
          }
        />

        {showChildDetail ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
            >
              <ChevronLeft className="h-4 w-4" />
              All children
            </button>

            <Card>
              <SlidingTabs
                tabs={['classes', 'homework'] as const}
                value={childTab}
                onChange={(v) => setChildTab(v as ChildTab)}
                labels={{ classes: 'Classes', homework: 'Homework' }}
              />
              <CardContent className="p-0">
                {childTab === 'classes' && (
                  enrollmentsLoading ? (
                    <p className="px-4 py-8 text-sm text-slate-500">Loading classes…</p>
                  ) : enrollmentsError ? (
                    <p className="px-4 py-8 text-sm text-red-600">{enrollmentsError}</p>
                  ) : (
                    <DataTable
                      embedded
                      data={enrollments}
                      emptyMessage={`No classes enrolled for ${childLabel}.`}
                      columns={[
                        {
                          key: 'className',
                          header: 'Class',
                          render: (e) => e.className ?? '—',
                        },
                        {
                          key: 'conductedBy',
                          header: 'Teacher',
                          render: (e) => e.conductedBy ?? '—',
                        },
                        {
                          key: 'schedule',
                          header: 'Day / time',
                          render: (e) =>
                            e.classDay && e.classTime
                              ? `${e.classDay} ${e.classTime}`
                              : e.classDay ?? '—',
                        },
                        {
                          key: 'from',
                          header: 'From',
                          render: (e) =>
                            e.classDate ? formatDateDDMMYYYY(e.classDate.slice(0, 10)) : '—',
                        },
                      ]}
                    />
                  )
                )}
                {childTab === 'homework' && selectedChild && (
                  <div className="p-4">
                    <ParentChildHomeworkPanel branchName={selectedChild.branchName} />
                  </div>
                )}
                {childTab === 'homework' && !selectedChild && activeChildKey && (
                  <div className="p-4">
                    <ParentChildHomeworkPanel branchName={activeChildKey} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {childrenLoading ? (
              <SkeletonCard />
            ) : error ? (
              <EmptyState
                icon={Users}
                title="Could not load children"
                description={error}
                actions={[{ label: 'Try again', onClick: reload }]}
              />
            ) : children.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No children found"
                description="Sign in with a parent email linked in SQL Account."
              />
            ) : (
              <Card>
                <CardContent className="p-0">
                  <DataTable
                    embedded
                    data={children}
                    columns={[
                      {
                        key: 'branchName',
                        header: 'Branch',
                        render: (c: SqlAccountChild) => (
                          <button
                            type="button"
                            className="font-medium text-primary-600 hover:underline"
                            onClick={() => setSearchParams({ child: branchKey(c) })}
                          >
                            {displayBranchName(c)}
                          </button>
                        ),
                      },
                      {
                        key: 'attention',
                        header: 'Attention',
                        render: (c: SqlAccountChild) => c.attention || '—',
                      },
                      {
                        key: 'email',
                        header: 'Email',
                        render: (c: SqlAccountChild) => c.email || '—',
                      },
                    ]}
                  />
                </CardContent>
              </Card>
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
