import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  ClipboardCheck,
  Lightbulb,
  NotebookPen,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { TodayClassesList } from '@/components/TodayClassesList';
import { TeacherQuickActions } from '@/components/teacher/TeacherQuickActions';
import { TeacherStudentProgressSection } from '@/components/teacher/TeacherStudentProgressSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { classesApi, classSessionsApi, lessonNotesApi } from '@/api/resources';
import { mockClasses, mockClassSessions, mockLessonNotes } from '@/utils/mockData';
import { buildTodaySchedule, formatTodayHeading } from '@/utils/teacherSchedule';
import type { ClassItem, ClassSession } from '@/types';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [notesCount, setNotesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [tipsOpen, setTipsOpen] = useState(false);

  useEffect(() => {
    if (!user?.id) return;

    setLoading(true);
    Promise.all([
      classesApi.getAll().catch(() => mockClasses),
      classSessionsApi.getAll().catch(() => mockClassSessions),
      lessonNotesApi.getAll().catch(() => mockLessonNotes),
    ])
      .then(([allClasses, allSessions, notes]) => {
        const myClasses = allClasses.filter((c) => c.teacherUserId === user.id);
        const myClassIds = new Set(myClasses.map((c) => c.id));
        setClasses(myClasses);
        setSessions(allSessions.filter((s) => myClassIds.has(s.classId)));
        setNotesCount(notes.filter((n) => n.teacherUserId === user.id).length);
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const todayClasses = useMemo(
    () => buildTodaySchedule(classes, sessions),
    [classes, sessions]
  );

  const todayLabel = formatTodayHeading();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={
          user?.fullName
            ? `Welcome back, ${user.fullName} · ${todayLabel}`
            : todayLabel
        }
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => setTipsOpen(true)}
            className="gap-2 border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100"
          >
            <Lightbulb className="h-4 w-4 text-amber-600" />
            Quick tips
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="My classes" value={classes.length} icon={Calendar} />
        <StatCard
          title="Today"
          value={todayClasses.length}
          icon={CalendarDays}
          description={todayClasses.length === 1 ? 'class today' : 'classes today'}
        />
        <StatCard title="Sessions" value={sessions.length} icon={ClipboardCheck} />
        <StatCard
          title="Lesson notes"
          value={notesCount}
          icon={NotebookPen}
          description="Recorded for your students"
        />
      </div>

      <TeacherQuickActions />

      <TodayClassesList items={todayClasses} loading={loading} />

      <Card>
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-lg">Student progress</CardTitle>
          <p className="text-sm font-normal text-slate-500">
            Analytics across your classes — attendance, skills, and roster
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <TeacherStudentProgressSection
            teacherUserId={user?.id}
            lessonNotesCount={notesCount}
            embedded
          />
        </CardContent>
      </Card>

      <Modal open={tipsOpen} onClose={() => setTipsOpen(false)} title="Quick tips" className="max-w-md">
        <ul className="space-y-3 text-sm text-slate-600">
          <li className="flex gap-3 rounded-lg bg-slate-50 p-3">
            <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
            <span>
              <strong className="text-slate-900">Today&apos;s schedule</strong> — your classes for
              the day appear at the top with times and rooms.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg bg-slate-50 p-3">
            <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
            <span>
              <strong className="text-slate-900">Attendance</strong> — open a class from My Classes
              to take attendance or share a check-in code.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg bg-slate-50 p-3">
            <NotebookPen className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
            <span>
              <strong className="text-slate-900">Lesson notes</strong> — record homework and
              progress so students and parents can review.
            </span>
          </li>
        </ul>
        <div className="mt-4 flex justify-end">
          <Button type="button" onClick={() => setTipsOpen(false)}>
            Got it
          </Button>
        </div>
      </Modal>
    </div>
  );
}
