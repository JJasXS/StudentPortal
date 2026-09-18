import { useEffect, useMemo, useState } from 'react';
import { Calendar, Megaphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { DashboardNotifyFeed } from '@/components/dashboard/DashboardNotifyFeed';
import { DashboardCentreFooter } from '@/components/dashboard/DashboardCentreFooter';
import { StatCard } from '@/components/StatCard';
import { SkeletonCard, SkeletonStatCards } from '@/components/ui/Skeleton';
import { NextLessonCard } from '@/components/student/NextLessonCard';
import { CourseClassLessonNotesExplorer } from '@/components/student/CourseClassLessonNotesExplorer';
import { announcementsApi } from '@/api/resources';
import { useStudentPortalData } from '@/hooks/useStudentPortalData';
import { mockAnnouncements } from '@/utils/mockData';
import { findNextLesson } from '@/utils/nextLesson';
import type { StudentClassCardData } from '@/components/student/StudentClassCard';

export default function StudentDashboard() {
  const { user } = useAuth();
  const { studentUserId, enrollments, classes, lessonNotes, loading: portalLoading } =
    useStudentPortalData();
  const [stats, setStats] = useState({ classes: 0, announcements: 0 });
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  const myClasses = useMemo<StudentClassCardData[]>(
    () =>
      enrollments.map((e) => {
        const cls = classes.find((c) => c.id === e.classId);
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
      }),
    [classes, enrollments]
  );

  useEffect(() => {
    setAnnouncementsLoading(true);
    announcementsApi
      .getAll()
      .catch(() => mockAnnouncements)
      .then((announcements) => {
        setStats({
          classes: enrollments.length,
          announcements: announcements.filter(
            (a) => a.targetRole === 'All' || a.targetRole === 'Student'
          ).length,
        });
      })
      .finally(() => setAnnouncementsLoading(false));
  }, [enrollments.length]);

  const nextLesson = useMemo(() => findNextLesson(myClasses), [myClasses]);
  const loading = portalLoading || announcementsLoading;

  return (
    <div className="space-y-6">
      <PageHeader title="Student Dashboard" description={`Welcome, ${user?.fullName}`} />

      <DashboardNotifyFeed role="Student" />

      {loading ? (
        <SkeletonCard className="mb-6" />
      ) : (
        <NextLessonCard next={nextLesson} />
      )}

      {loading ? (
        <SkeletonCard />
      ) : (
        <CourseClassLessonNotesExplorer
          studentUserId={studentUserId ?? ''}
          notes={lessonNotes}
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

      <DashboardCentreFooter />
    </div>
  );
}
