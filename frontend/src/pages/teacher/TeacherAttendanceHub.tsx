import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { AttendanceClassRow } from '@/components/AttendanceClassRow';
import { Card, CardContent } from '@/components/ui/Card';
import { classesApi, classSessionsApi } from '@/api/resources';
import { ensureTodaySessions, getTodaySession } from '@/utils/attendanceSession';
import { mockClasses, mockClassSessions } from '@/utils/mockData';
import type { ClassItem, ClassSession } from '@/types';

export default function TeacherAttendanceHub() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [allClasses, allSessions] = await Promise.all([
        classesApi.getAll().catch(() => mockClasses),
        classSessionsApi.getAll().catch(() => mockClassSessions),
      ]);
      const myClasses = allClasses.filter((c) => c.teacherUserId === user.id && c.isActive);
      const myClassIds = new Set(myClasses.map((c) => c.id));
      const mySessions = ensureTodaySessions(
        myClasses,
        allSessions.filter((s) => myClassIds.has(s.classId))
      );
      setClasses(myClasses);
      setSessions(mySessions);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const sessionByClassId = useMemo(() => {
    const map = new Map<string, ClassSession>();
    for (const c of classes) {
      const session = getTodaySession(sessions, c.id);
      if (session) map.set(c.id, session);
    }
    return map;
  }, [classes, sessions]);

  return (
    <div>
      <PageHeader title="Attendance" />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">Loading…</p>
          ) : classes.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">No classes.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {classes.map((c) => (
                <AttendanceClassRow
                  key={c.id}
                  classItem={c}
                  session={sessionByClassId.get(c.id)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
