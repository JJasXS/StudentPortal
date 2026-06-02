import { useEffect, useState } from 'react';
import { Calendar, ClipboardCheck, Clock, MapPin, Megaphone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { enrollmentsApi, attendanceApi, announcementsApi, classesApi } from '@/api/resources';
import { mockEnrollments, mockAttendance, mockAnnouncements, mockClasses } from '@/utils/mockData';
import type { ClassItem, Enrollment } from '@/types';

type StudentClassSummary = Enrollment & {
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  courseName?: string;
};

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ classes: 0, attendance: 0, announcements: 0 });
  const [myClasses, setMyClasses] = useState<StudentClassSummary[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    Promise.all([
      enrollmentsApi.getAll().catch(() => mockEnrollments),
      attendanceApi.getAll().catch(() => mockAttendance),
      announcementsApi.getAll().catch(() => mockAnnouncements),
      classesApi.getAll().catch(() => mockClasses),
    ]).then(([enrollments, attendance, announcements, classes]) => {
      const active = enrollments.filter(
        (e) => e.studentUserId === user.id && e.status === 'Active'
      );

      setStats({
        classes: active.length,
        attendance: attendance.filter((a) => a.studentUserId === user.id).length,
        announcements: announcements.filter(
          (a) => a.targetRole === 'All' || a.targetRole === 'Student'
        ).length,
      });

      setMyClasses(
        active.map((e) => {
          const cls = classes.find((c) => c.id === e.classId);
          return enrichEnrollment(e, cls);
        })
      );
      setLoadingClasses(false);
    });
  }, [user?.id]);

  return (
    <div>
      <PageHeader title="Student Dashboard" description={`Welcome, ${user?.fullName}`} />

      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">My classes</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingClasses ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : myClasses.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
              Currently no class yet
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {myClasses.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <p className="font-medium text-slate-900">{item.className}</p>
                  {item.courseName && (
                    <p className="text-sm text-slate-500">{item.courseName}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    {item.dayOfWeek && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {item.dayOfWeek}
                      </span>
                    )}
                    {item.startTime && item.endTime && (
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {item.startTime}–{item.endTime}
                      </span>
                    )}
                    {item.location && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {item.location}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="My Classes" value={stats.classes} icon={Calendar} />
        <StatCard title="Attendance Records" value={stats.attendance} icon={ClipboardCheck} />
        <StatCard title="Announcements" value={stats.announcements} icon={Megaphone} />
      </div>
    </div>
  );
}

function enrichEnrollment(enrollment: Enrollment, cls?: ClassItem): StudentClassSummary {
  return {
    ...enrollment,
    dayOfWeek: cls?.dayOfWeek,
    startTime: cls?.startTime,
    endTime: cls?.endTime,
    location: cls?.location,
    courseName: cls?.courseName,
  };
}
