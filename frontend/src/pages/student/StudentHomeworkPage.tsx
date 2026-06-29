import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BookOpenCheck, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useLearnerContext } from '@/hooks/useLearnerContext';
import { mockClasses, mockEnrollments } from '@/utils/mockData';
import { resolveMockStudentUserId } from '@/utils/learnerSchedule';
import { countHomeworkForStudentClass, ensureHomeworkSeeded } from '@/utils/homeworkStore';

interface CourseGroup {
  courseName: string;
  classes: Array<{
    classId: string;
    className: string;
    teacherName?: string;
    uploadCount: number;
  }>;
}

export default function StudentHomeworkPage() {
  const { user } = useLearnerContext();
  const mockStudentId = useMemo(
    () => resolveMockStudentUserId(user?.email),
    [user?.email]
  );

  ensureHomeworkSeeded();

  const courseGroups = useMemo(() => {
    const active = mockEnrollments.filter(
      (e) => e.studentUserId === mockStudentId && e.status === 'Active'
    );
    const byCourse = new Map<string, CourseGroup>();

    for (const e of active) {
      const cls = mockClasses.find((c) => c.id === e.classId);
      const courseName = cls?.courseName ?? 'Course';
      if (!byCourse.has(courseName)) {
        byCourse.set(courseName, { courseName, classes: [] });
      }
      byCourse.get(courseName)!.classes.push({
        classId: e.classId,
        className: e.className ?? cls?.className ?? 'Class',
        teacherName: cls?.teacherName,
        uploadCount: countHomeworkForStudentClass(mockStudentId, e.classId),
      });
    }

    return [...byCourse.values()].sort((a, b) => a.courseName.localeCompare(b.courseName));
  }, [mockStudentId]);

  return (
    <div>
      <PageHeader
        title="Homework"
        description="Choose a class to upload practice files for your teacher"
      />

      {courseGroups.length === 0 ? (
        <EmptyState
          icon={BookOpenCheck}
          title="No classes yet"
          description="Your enrolled classes will appear here when you can submit homework."
        />
      ) : (
        <div className="space-y-4">
          {courseGroups.map((group) => (
            <Card key={group.courseName}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{group.courseName}</CardTitle>
              </CardHeader>
              <CardContent className="divide-y divide-slate-100 p-0 pt-0">
                {group.classes.map((cls) => (
                  <Link
                    key={cls.classId}
                    to={`/student/homework/${cls.classId}`}
                    className="flex items-center justify-between gap-3 px-6 py-3.5 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{cls.className}</p>
                      {cls.teacherName && (
                        <p className="text-sm text-slate-500">{cls.teacherName}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {cls.uploadCount > 0 && (
                        <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                          {cls.uploadCount} upload{cls.uploadCount === 1 ? '' : 's'}
                        </span>
                      )}
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
