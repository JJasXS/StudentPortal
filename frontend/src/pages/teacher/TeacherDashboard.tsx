import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { DashboardNotifyFeed } from '@/components/dashboard/DashboardNotifyFeed';
import { DashboardCentreFooter } from '@/components/dashboard/DashboardCentreFooter';
import { DashboardSummaryCards } from '@/components/teacher/DashboardSummaryCards';
import { NextClassCard } from '@/components/teacher/NextClassCard';
import { TeacherQuickActions } from '@/components/teacher/TeacherQuickActions';
import { TodayScheduleTimeline } from '@/components/teacher/TodayScheduleTimeline';
import { WeekOverviewStrip } from '@/components/teacher/WeekOverviewStrip';
import { classesApi, calendarApi, classSessionsApi } from '@/api/resources';
import { mockClassSessions } from '@/utils/mockData';
import { buildTeacherClassList, mergeTeacherClasses } from '@/utils/teacherClasses';
import {
  countUpcomingInDays,
  findNextClassItem,
  formatTodayHeading,
  resolveTeacherTodaySchedule,
  sumEnrolledStudents,
  weekClassCounts,
} from '@/utils/teacherSchedule';
import type { Announcement, ClassItem, ClassSession } from '@/types';
import type { ErpCalendarEvent } from '@/types/sqlAccount';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [erpEvents, setErpEvents] = useState<ErpCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [attentionCount, setAttentionCount] = useState(0);
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      classesApi.getAll().catch(() => [] as ClassItem[]),
      classSessionsApi.getAll().catch(() => mockClassSessions),
      isMock
        ? Promise.resolve([] as ErpCalendarEvent[])
        : calendarApi.getEvents().catch(() => [] as ErpCalendarEvent[]),
    ])
      .then(([allClasses, allSessions, events]) => {
        const myClasses = isMock
          ? mergeTeacherClasses(allClasses, user)
          : buildTeacherClassList(allClasses, events, user);
        const myClassIds = new Set(myClasses.map((c) => c.id));
        setClasses(myClasses);
        setSessions(allSessions.filter((s) => myClassIds.has(s.classId)));
        setErpEvents(events);
      })
      .catch(() => {
        const myClasses = mergeTeacherClasses([], user);
        const myClassIds = new Set(myClasses.map((c) => c.id));
        setClasses(myClasses);
        setSessions(mockClassSessions.filter((s) => myClassIds.has(s.classId)));
        setErpEvents([]);
      })
      .finally(() => setLoading(false));
  }, [user, isMock]);

  const todayClasses = useMemo(() => {
    if (!user) return [];
    return resolveTeacherTodaySchedule(classes, sessions, erpEvents, user);
  }, [classes, sessions, erpEvents, user]);

  const nextClass = useMemo(() => findNextClassItem(todayClasses), [todayClasses]);

  const upcomingCount = useMemo(() => {
    if (!user) return 0;
    return countUpcomingInDays(erpEvents, sessions, classes, user, 7);
  }, [erpEvents, sessions, classes, user]);

  const weekDays = useMemo(() => {
    if (!user) return [];
    return weekClassCounts(erpEvents, sessions, classes, user);
  }, [erpEvents, sessions, classes, user]);

  const todayHint = useMemo(() => {
    if (todayClasses.length === 0) return 'No classes today';
    const first = todayClasses[0];
    return `${first.startTime} onwards`;
  }, [todayClasses]);

  const handleFeedLoaded = useCallback((items: Announcement[]) => {
    setAttentionCount(items.filter((i) => !i.isRead).length);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description={formatTodayHeading()} />

      <DashboardSummaryCards
        loading={loading}
        stats={{
          todayCount: todayClasses.length,
          todayHint,
          studentCount: sumEnrolledStudents(classes),
          upcomingCount,
          attentionCount,
        }}
      />

      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <NextClassCard item={nextClass} loading={loading} />
        <DashboardNotifyFeed role="Teacher" onFeedLoaded={handleFeedLoaded} />
      </div>

      <TodayScheduleTimeline items={todayClasses} loading={loading} />

      <TeacherQuickActions />

      <WeekOverviewStrip days={weekDays} loading={loading} />

      <DashboardCentreFooter />
    </div>
  );
}
