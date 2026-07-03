import { useEffect, useMemo, useState } from 'react';
import { Calendar, Megaphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useLearnerContext } from '@/hooks/useLearnerContext';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { SkeletonCard, SkeletonStatCards } from '@/components/ui/Skeleton';
import { NextLessonCard } from '@/components/student/NextLessonCard';
import { CourseClassLessonNotesExplorer } from '@/components/student/CourseClassLessonNotesExplorer';
import { announcementsApi } from '@/api/resources';
import { mockAnnouncements, mockEnrollments, mockLessonNotes } from '@/utils/mockData';
import { resolveLearnerStudentId } from '@/utils/learnerCourses';
import { findNextLesson } from '@/utils/nextLesson';
import { mockClasses } from '@/utils/mockData';
import type { StudentClassCardData } from '@/components/student/StudentClassCard';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { studentUserId, loading: learnerLoading } = useLearnerContext();
  const mockStudentId = useMemo(
    () => studentUserId ?? resolveLearnerStudentId(user?.email, user?.id),
    [studentUserId, user?.email, user?.id]
  );
  const [stats, setStats] = useState({ classes: 0, announcements: 0 });
  const [myClasses, setMyClasses] = useState<StudentClassCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mockStudentId || learnerLoading) return;

    setLoading(true);
    announcementsApi
      .getAll()
      .catch(() => mockAnnouncements)
      .then((announcements) => {
        const active = mockEnrollments.filter(
          (e) => e.studentUserId === mockStudentId && e.status === 'Active'
        );
        setStats({
          classes: active.length,
          announcements: announcements.filter(
            (a) => a.targetRole === 'All' || a.targetRole === 'Student'
          ).length,
        });

        setMyClasses(
          active.map((e) => {
            const cls = mockClasses.find((c) => c.id === e.classId);
            return {
              id: e.id,
              className: e.className ?? cls?.className ?? 'Class',
              courseName: cls?.courseName,
              dayOfWeek: cls?.dayOfWeek,
              startTime: cls?.startTime,
              endTime: cls?.endTime,
              location: cls?.location,
              teacherName: cls?.teacherName,
            };
          })
        );
      })
      .finally(() => setLoading(false));
  }, [mockStudentId, learnerLoading]);

  const nextLesson = useMemo(() => findNextLesson(myClasses), [myClasses]);

  return (
    <div className="space-y-6">
      <PageHeader title="Student Dashboard" description={`Welcome, ${user?.fullName}`} />

      {loading ? (
        <SkeletonCard className="mb-6" />
      ) : (
        <NextLessonCard next={nextLesson} />
      )}

      {loading ? (
        <SkeletonCard />
      ) : (
        <CourseClassLessonNotesExplorer
          studentUserId={mockStudentId}
          notes={mockLessonNotes}
          title="My courses"
          showViewAllLink
          compact
        />
      )}

      {loading ? (
        <SkeletonStatCards count={2} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard title="My Classes" value={stats.classes} icon={Calendar} />
          <StatCard title="Announcements" value={stats.announcements} icon={Megaphone} />
        </div>
      )}
    </div>
  );
}
