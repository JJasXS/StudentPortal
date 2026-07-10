import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { CourseClassLessonNotesExplorer } from '@/components/student/CourseClassLessonNotesExplorer';
import { ParentChildHomeworkPanel } from '@/components/parent/ParentChildHomeworkPanel';
import { DataTable } from '@/components/ui/DataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { homeworkApi } from '@/api/resources';
import { useSqlAccountChildren } from '@/hooks/useSqlAccountChildren';
import { useStudentPortalData } from '@/hooks/useStudentPortalData';
import type { SqlAccountChild } from '@/types/sqlAccount';
import { learnerCoursesPath } from '@/utils/learnerPortal';
export default function LearnerCoursesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isParent = user?.role === 'Parent';
  const coursesBasePath = learnerCoursesPath(user?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const { courseId } = useParams();
  const selectedBranchKey = searchParams.get('child');
  const activeChildKey = resolveActiveChildKey(selectedBranchKey, courseId);

  const { children, loading, hasFetched, error, reload } = useSqlAccountChildren(isParent);
  const [pendingByBranch, setPendingByBranch] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!isParent || !hasFetched) return;
    homeworkApi
      .getPendingCount()
      .then((data) => {
        const map: Record<string, number> = {};
        for (const row of data.byBranch) {
          map[row.branchName.trim().toLowerCase()] = row.pendingCount;
        }
        setPendingByBranch(map);
      })
      .catch(() => setPendingByBranch({}));
  }, [isParent, hasFetched]);

  const selectedChild = useMemo(
    () => children.find((c) => branchKey(c) === activeChildKey) ?? null,
    [children, activeChildKey]
  );

  const childrenLoading = isParent && (authLoading || loading || !hasFetched);

  const {
    studentUserId,
    lessonNotes,
    loading: studentPortalLoading,
    error: studentPortalError,
  } = useStudentPortalData(!isParent);

  const showChildDetail = Boolean(activeChildKey);

  if (isParent) {
    const childLabel = selectedChild
      ? displayBranchName(selectedChild)
      : activeChildKey || 'Child';

    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <PageHeader
          title="Assignment"
          description={
            showChildDetail ? `Assignment for ${childLabel}` : undefined
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
              Student
            </button>

            <Card>
              <CardContent className="p-4">
                {selectedChild && (
                  <ParentChildHomeworkPanel branchName={selectedChild.branchName} />
                )}
                {!selectedChild && activeChildKey && (
                  <ParentChildHomeworkPanel branchName={activeChildKey} />
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
                        header: 'Student',
                        render: (c: SqlAccountChild) => {
                          const key = branchKey(c);
                          const pending = pendingByBranch[key] ?? 0;
                          return (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="relative font-medium text-primary-600 hover:underline"
                                onClick={() => setSearchParams({ child: key })}
                              >
                                {displayBranchName(c)}
                                {pending > 0 && (
                                  <span
                                    className="absolute -right-2.5 -top-1 h-2 w-2 rounded-full bg-red-500"
                                    aria-hidden
                                  />
                                )}
                              </button>
                              {pending > 0 && (
                                <span className="text-xs text-red-600">
                                  ({pending} homework pending)
                                </span>
                              )}
                            </div>
                          );
                        },
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
