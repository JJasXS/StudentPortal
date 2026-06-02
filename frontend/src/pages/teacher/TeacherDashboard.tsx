import { useEffect, useMemo, useState } from 'react';
import { Calendar, ClipboardCheck, Lightbulb, NotebookPen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import { TodayClassesList } from '@/components/TodayClassesList';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { classesApi, classSessionsApi, lessonNotesApi } from '@/api/resources';
import { mockClasses, mockClassSessions, mockLessonNotes } from '@/utils/mockData';
import { buildTodaySchedule } from '@/utils/teacherSchedule';
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

  return (
    <div>
      <PageHeader
        title="Teacher Dashboard"
        description={`Welcome, ${user?.fullName}`}
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

      <TodayClassesList items={todayClasses} loading={loading} />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard title="My Classes" value={classes.length} icon={Calendar} />
        <StatCard title="Sessions" value={sessions.length} icon={ClipboardCheck} />
        <StatCard title="Lesson Notes" value={notesCount} icon={NotebookPen} />
      </div>

      <Modal open={tipsOpen} onClose={() => setTipsOpen(false)} title="Quick tips" className="max-w-md">
        <ul className="space-y-3 text-sm text-slate-600">
          <li className="flex gap-3 rounded-lg bg-slate-50 p-3">
            <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
            <span>
              <strong className="text-slate-900">My classes today</strong> — see what&apos;s on your
              schedule for the current day, including times and rooms.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg bg-slate-50 p-3">
            <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
            <span>
              <strong className="text-slate-900">View</strong> — open any class on today&apos;s schedule
              to see time, room, topic, and enrollment.
            </span>
          </li>
          <li className="flex gap-3 rounded-lg bg-slate-50 p-3">
            <NotebookPen className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" />
            <span>
              <strong className="text-slate-900">Lesson notes</strong> — record progress and practice
              homework for students to review.
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
