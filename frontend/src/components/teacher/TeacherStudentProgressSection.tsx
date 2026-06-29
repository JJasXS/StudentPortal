import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, Users, ClipboardCheck, BookOpen } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { StudentProgressGrid } from '@/components/StudentProgressGrid';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { lessonNotesApi } from '@/api/resources';
import { mockLessonNotes } from '@/utils/mockData';
import { getMockProgressForTeacher } from '@/utils/mockStudentProgress';
import type { TeacherProgressData } from '@/types/progress';

interface TeacherStudentProgressSectionProps {
  teacherUserId?: string;
  lessonNotesCount?: number;
  /** Hide top-level heading and summary stat row (e.g. on dashboard) */
  embedded?: boolean;
}

export function TeacherStudentProgressSection({
  teacherUserId,
  lessonNotesCount,
  embedded = false,
}: TeacherStudentProgressSectionProps) {
  const [progress, setProgress] = useState<TeacherProgressData>(() =>
    getMockProgressForTeacher(teacherUserId)
  );
  const [liveNotes, setLiveNotes] = useState(lessonNotesCount ?? 0);

  useEffect(() => {
    setProgress(getMockProgressForTeacher(teacherUserId));
  }, [teacherUserId]);

  useEffect(() => {
    if (lessonNotesCount != null) {
      setLiveNotes(lessonNotesCount);
      return;
    }
    if (!teacherUserId) return;
    lessonNotesApi
      .getAll()
      .catch(() => mockLessonNotes)
      .then((notes) => {
        setLiveNotes(notes.filter((n) => n.teacherUserId === teacherUserId).length);
      });
  }, [teacherUserId, lessonNotesCount]);

  const summary = useMemo(() => {
    const students = progress.students;
    const avgAttendance =
      students.length > 0
        ? Math.round(students.reduce((s, r) => s + r.attendanceRate, 0) / students.length)
        : 0;
    const avgSkill =
      students.length > 0
        ? Math.round(students.reduce((s, r) => s + r.skillScore, 0) / students.length)
        : 0;
    const improving = students.filter((r) => r.trend === 'up').length;
    return { avgAttendance, avgSkill, improving, studentCount: students.length };
  }, [progress]);

  const content = (
    <>
      {!embedded && (
        <>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Student progress</h2>
            <p className="mt-0.5 text-sm text-slate-500">Per-student overview across your classes</p>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Students" value={summary.studentCount} icon={Users} />
            <StatCard
              title="Avg attendance"
              value={`${summary.avgAttendance}%`}
              icon={ClipboardCheck}
            />
            <StatCard title="Avg skill score" value={`${summary.avgSkill}/100`} icon={TrendingUp} />
            <StatCard
              title="Lesson notes"
              value={liveNotes || progress.students.length}
              icon={BookOpen}
              description="Recorded for your classes"
            />
          </div>
        </>
      )}

      {embedded && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Students" value={summary.studentCount} icon={Users} />
          <StatCard
            title="Avg attendance"
            value={`${summary.avgAttendance}%`}
            icon={ClipboardCheck}
          />
          <StatCard title="Avg skill" value={`${summary.avgSkill}/100`} icon={TrendingUp} />
          <StatCard
            title="Improving"
            value={summary.improving}
            icon={BookOpen}
            description={`of ${summary.studentCount} students`}
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student roster</CardTitle>
          <p className="text-sm font-normal text-slate-500">
            Hover cells for attendance, sessions, and skill details
          </p>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <StudentProgressGrid students={progress.students} />
        </CardContent>
      </Card>
    </>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return <section className="mt-8">{content}</section>;
}
