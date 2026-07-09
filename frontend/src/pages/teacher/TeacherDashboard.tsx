import { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { DashboardNotifyFeed } from '@/components/dashboard/DashboardNotifyFeed';
import { TodayClassesList } from '@/components/TodayClassesList';
import { classesApi, classSessionsApi } from '@/api/resources';
import { mockClassSessions } from '@/utils/mockData';
import { mergeTeacherClasses } from '@/utils/teacherClasses';
import { buildTodaySchedule, formatTodayHeading } from '@/utils/teacherSchedule';
import type { ClassItem, ClassSession } from '@/types';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      classesApi.getAll().catch(() => []),
      classSessionsApi.getAll().catch(() => mockClassSessions),
    ])
      .then(([allClasses, allSessions]) => {
        const myClasses = mergeTeacherClasses(allClasses, user);
        const myClassIds = new Set(myClasses.map((c) => c.id));
        setClasses(myClasses);
        setSessions(allSessions.filter((s) => myClassIds.has(s.classId)));
      })
      .catch(() => {
        const myClasses = mergeTeacherClasses([], user);
        const myClassIds = new Set(myClasses.map((c) => c.id));
        setClasses(myClasses);
        setSessions(mockClassSessions.filter((s) => myClassIds.has(s.classId)));
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const todayClasses = useMemo(
    () => buildTodaySchedule(classes, sessions),
    [classes, sessions]
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description={
          user?.fullName
            ? `Welcome back, ${user.fullName} · ${formatTodayHeading()}`
            : formatTodayHeading()
        }
      />

      <DashboardNotifyFeed role="Teacher" />

      {!loading && todayClasses.length === 0 && (
        <p className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
          <CalendarDays className="h-5 w-5 text-slate-400" />
          No classes scheduled for today.
        </p>
      )}

      <TodayClassesList items={todayClasses} loading={loading} />
    </div>
  );
}
