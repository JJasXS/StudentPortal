import { useMemo, useState } from 'react';
import { ArrowLeft, BookOpenCheck, ChevronRight, FileText } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  mockClasses,
  mockCourses,
  mockEnrollments,
  mockStudents,
} from '@/utils/mockData';
import {
  ensureHomeworkSeeded,
  loadHomeworkForCourse,
  loadHomeworkForCourseStudent,
} from '@/utils/homeworkStore';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';

type Step = 'courses' | 'students' | 'homework';

export default function AdminHomeworkPage() {
  const [step, setStep] = useState<Step>('courses');
  const [courseId, setCourseId] = useState<string | null>(null);
  const [studentUserId, setStudentUserId] = useState<string | null>(null);

  ensureHomeworkSeeded();

  const activeCourses = useMemo(
    () => mockCourses.filter((c) => c.isActive).sort((a, b) => a.courseName.localeCompare(b.courseName)),
    []
  );

  const selectedCourse = useMemo(
    () => mockCourses.find((c) => c.id === courseId),
    [courseId]
  );

  const courseClassIds = useMemo(() => {
    if (!courseId) return new Set<string>();
    return new Set(mockClasses.filter((c) => c.courseId === courseId).map((c) => c.id));
  }, [courseId]);

  const studentsInCourse = useMemo(() => {
    if (!courseId) return [];
    const seen = new Set<string>();
    const list: Array<{ userId: string; fullName: string; uploadCount: number }> = [];

    for (const e of mockEnrollments) {
      if (e.status !== 'Active' || !courseClassIds.has(e.classId) || seen.has(e.studentUserId)) {
        continue;
      }
      seen.add(e.studentUserId);
      const profile = mockStudents.find((s) => s.userId === e.studentUserId);
      const uploads = loadHomeworkForCourseStudent(courseId, e.studentUserId);
      list.push({
        userId: e.studentUserId,
        fullName: profile?.fullName ?? e.studentName ?? 'Student',
        uploadCount: uploads.length,
      });
    }

    return list.sort((a, b) => a.fullName.localeCompare(b.fullName));
  }, [courseId, courseClassIds]);

  const selectedStudent = useMemo(
    () => studentsInCourse.find((s) => s.userId === studentUserId),
    [studentsInCourse, studentUserId]
  );

  const homeworkItems = useMemo(() => {
    if (!courseId || !studentUserId) return [];
    return loadHomeworkForCourseStudent(courseId, studentUserId);
  }, [courseId, studentUserId]);

  const courseUploadCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const course of activeCourses) {
      counts.set(course.id, loadHomeworkForCourse(course.id).length);
    }
    return counts;
  }, [activeCourses]);

  const goCourses = () => {
    setStep('courses');
    setCourseId(null);
    setStudentUserId(null);
  };

  const goStudents = () => {
    setStep('students');
    setStudentUserId(null);
  };

  if (step === 'homework' && selectedCourse && selectedStudent) {
    return (
      <div>
        <button
          type="button"
          onClick={goStudents}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          {selectedCourse.courseName}
        </button>

        <PageHeader
          title={selectedStudent.fullName}
          description={`Homework uploads · ${selectedCourse.courseName}`}
        />

        {homeworkItems.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No homework yet"
            description="This student has not uploaded any files for this course."
          />
        ) : (
          <Card>
            <CardContent className="divide-y divide-slate-100 p-0">
              {homeworkItems.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-4 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{item.fileName}</p>
                    <p className="mt-0.5 text-sm text-slate-500">{item.className}</p>
                    {item.note && (
                      <p className="mt-1 text-sm text-slate-600">{item.note}</p>
                    )}
                  </div>
                  <time className="shrink-0 text-xs text-slate-400">
                    {formatDateDDMMYYYY(item.uploadedAt)}
                  </time>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  if (step === 'students' && selectedCourse) {
    return (
      <div>
        <button
          type="button"
          onClick={goCourses}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          All courses
        </button>

        <PageHeader
          title={selectedCourse.courseName}
          description="Select a student to view their homework uploads"
        />

        {studentsInCourse.length === 0 ? (
          <EmptyState
            icon={BookOpenCheck}
            title="No students enrolled"
            description="No active enrollments for this course yet."
          />
        ) : (
          <Card>
            <CardContent className="divide-y divide-slate-100 p-0">
              {studentsInCourse.map((student) => (
                <button
                  key={student.userId}
                  type="button"
                  onClick={() => {
                    setStudentUserId(student.userId);
                    setStep('homework');
                  }}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900">{student.fullName}</p>
                    <p className="text-sm text-slate-500">
                      {student.uploadCount} upload{student.uploadCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Homework"
        description="Browse student uploads by course"
      />

      <Card>
        <CardContent className="divide-y divide-slate-100 p-0">
          {activeCourses.map((course) => {
            const count = courseUploadCounts.get(course.id) ?? 0;
            const studentCount = new Set(
              mockEnrollments
                .filter(
                  (e) =>
                    e.status === 'Active' &&
                    mockClasses.some((c) => c.courseId === course.id && c.id === e.classId)
                )
                .map((e) => e.studentUserId)
            ).size;

            return (
              <button
                key={course.id}
                type="button"
                onClick={() => {
                  setCourseId(course.id);
                  setStep('students');
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-slate-50"
              >
                <div>
                  <p className="font-medium text-slate-900">{course.courseName}</p>
                  <p className="text-sm text-slate-500">
                    {studentCount} student{studentCount === 1 ? '' : 's'} · {count} upload
                    {count === 1 ? '' : 's'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
