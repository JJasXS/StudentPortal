import { useEffect, useMemo, useState } from 'react';
import { GraduationCap, Users, Calendar, ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { MergedAnnouncementsPanel } from '@/components/announcements/MergedAnnouncementsPanel';
import { studentsApi, teachersApi, classesApi, enrollmentsApi, announcementsApi } from '@/api/resources';
import { mockStudents, mockTeachers, mockClasses, mockEnrollments, mockAnnouncements } from '@/utils/mockData';
import { splitAnnouncements } from '@/utils/announcements';
import type { Announcement } from '@/types';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ students: 0, teachers: 0, classes: 0, enrollments: 0 });
  const [announcements, setAnnouncements] = useState<Announcement[]>(mockAnnouncements);

  useEffect(() => {
    Promise.all([
      studentsApi.getAll().catch(() => mockStudents),
      teachersApi.getAll().catch(() => mockTeachers),
      classesApi.getAll().catch(() => mockClasses),
      enrollmentsApi.getAll().catch(() => mockEnrollments),
      announcementsApi.getAll().catch(() => mockAnnouncements),
    ]).then(([students, teachers, classes, enrollments, anns]) => {
      setStats({
        students: students.length,
        teachers: teachers.length,
        classes: classes.length,
        enrollments: enrollments.filter((e) => e.status === 'Active').length,
      });
      setAnnouncements(anns);
    });
  }, []);

  const { holidays, forTeachersAndStudents } = useMemo(
    () => splitAnnouncements(announcements),
    [announcements]
  );

  return (
    <div>
      <PageHeader title="Admin Dashboard" description="Overview of your music tuition centre" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Students" value={stats.students} icon={GraduationCap} />
        <StatCard title="Total Teachers" value={stats.teachers} icon={Users} />
        <StatCard title="Active Classes" value={stats.classes} icon={Calendar} />
        <StatCard title="Active Enrollments" value={stats.enrollments} icon={ClipboardList} />
      </div>

      <MergedAnnouncementsPanel
        holidays={holidays}
        general={forTeachersAndStudents}
        variant="dashboard-admin"
        announcementsPath="/admin/announcements"
        generalEmptyMessage="No announcements for teachers or students."
      />
    </div>
  );
}
