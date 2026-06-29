import { useEffect, useMemo, useState } from 'react';
import { Calendar, ClipboardCheck, Megaphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { SkeletonCard, SkeletonStatCards } from '@/components/ui/Skeleton';
import { NextLessonCard } from '@/components/student/NextLessonCard';
import { CourseClassLessonNotesExplorer } from '@/components/student/CourseClassLessonNotesExplorer';
import { StudentQuickLinks } from '@/components/student/StudentQuickLinks';
import { announcementsApi } from '@/api/resources';
import { mockAnnouncements, mockAttendance, mockEnrollments, mockLessonNotes } from '@/utils/mockData';
import { resolveLearnerStudentId } from '@/utils/learnerCourses';
import { findNextLesson } from '@/utils/nextLesson';
import { mockClasses } from '@/utils/mockData';
import type { StudentClassCardData } from '@/components/student/StudentClassCard';

export default function StudentDashboard() {
  const { user } = useAuth();
  const mockStudentId = useMemo(
    () => resolveLearnerStudentId(user?.email, user?.id),
    [user?.email, user?.id]
  );
  const [stats, setStats] = useState({ classes: 0, attendance: 0, announcements: 0 });
  const [myClasses, setMyClasses] = useState<StudentClassCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mockStudentId) return;

    setLoading(true);
    announcementsApi
      .getAll()
      .catch(() => mockAnnouncements)
      .then((announcements) => {
        const active = mockEnrollments.filter(
          (e) => e.studentUserId === mockStudentId && e.status === 'Active'
        );
        const mineAttendance = mockAttendance.filter((a) => a.studentUserId === mockStudentId);

        setStats({
          classes: active.length,
          attendance: mineAttendance.length,
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
              attendedCount: mineAttendance.filter((a) => a.className === e.className).length,
            };
          })
        );
      })
      .finally(() => setLoading(false));
  }, [mockStudentId]);

  const nextLesson = useMemo(() => findNextLesson(myClasses), [myClasses]);

  return (
    <div className="space-y-6">
      <PageHeader title="Student Dashboard" description={`Welcome, ${user?.fullName}`} />

      <StudentQuickLinks />

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
        <SkeletonStatCards count={3} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard title="My Classes" value={stats.classes} icon={Calendar} />
          <StatCard title="Attendance Records" value={stats.attendance} icon={ClipboardCheck} />
          <StatCard title="Announcements" value={stats.announcements} icon={Megaphone} />
        </div>
      )}
    </div>
  );
}
