import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { PageBackLink } from '@/components/PageBackLink';
import { AttendanceRoster } from '@/components/AttendanceRoster';
import { teacherAttendanceHubUrl } from '@/utils/attendanceLinks';
import {
  ensureTodaySessions,
  formatClassSchedule,
  getTodaySession,
} from '@/utils/attendanceSession';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import {
  attendanceApi,
  classesApi,
  classSessionsApi,
  enrollmentsApi,
} from '@/api/resources';
import {
  mockAttendance,
  mockClasses,
  mockClassSessions,
  mockEnrollments,
  mockUsers,
} from '@/utils/mockData';
import {
  buildAttendanceRoster,
  enrichRosterWithPhones,
  type AttendanceRosterRow,
} from '@/utils/attendanceRoster';
import type { Attendance, ClassItem, ClassSession } from '@/types';

export default function TakeAttendancePage() {
  const { user } = useAuth();
  const { classId = '' } = useParams<{ classId: string }>();

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [todaySession, setTodaySession] = useState<ClassSession | null>(null);
  const [enrollments, setEnrollments] = useState(mockEnrollments);
  const [roster, setRoster] = useState<AttendanceRosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const sessionId = todaySession?.id ?? '';

  const phoneByUserId = useMemo(() => {
    const map: Record<string, string | undefined> = {};
    for (const u of mockUsers) {
      if (u.phoneNumber) map[u.id] = u.phoneNumber;
    }
    return map;
  }, []);

  useEffect(() => {
    if (!user?.id || !classId) return;

    let cancelled = false;
    setLoading(true);

    Promise.all([
      classesApi.getAll().catch(() => mockClasses),
      classSessionsApi.getAll().catch(() => mockClassSessions),
      enrollmentsApi.getAll().catch(() => mockEnrollments),
    ])
      .then(([allClasses, allSessions, allEnrollments]) => {
        if (cancelled) return;

        const cls = allClasses.find((c) => c.id === classId && c.teacherUserId === user.id);
        if (!cls) {
          setClassItem(null);
          setTodaySession(null);
          return;
        }

        const classSessions = allSessions.filter((s) => s.classId === classId);
        const withToday = ensureTodaySessions([cls], classSessions);
        const session = getTodaySession(withToday, classId) ?? null;

        setClassItem(cls);
        setTodaySession(session);

        const enrollmentKey = (e: (typeof mockEnrollments)[0]) => `${e.studentUserId}-${e.classId}`;
        const seen = new Set(allEnrollments.map(enrollmentKey));
        setEnrollments([
          ...allEnrollments,
          ...mockEnrollments.filter((m) => !seen.has(enrollmentKey(m))),
        ]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id, classId]);

  const applyRoster = useCallback(
    (records: typeof mockAttendance) => {
      const built = buildAttendanceRoster(sessionId, classId, enrollments, records);
      setRoster(enrichRosterWithPhones(built, phoneByUserId));
    },
    [sessionId, classId, enrollments, phoneByUserId]
  );

  useEffect(() => {
    if (!sessionId || !classId) {
      setRoster([]);
      return;
    }

    attendanceApi
      .getBySession(sessionId)
      .then(applyRoster)
      .catch(() => {
        applyRoster(mockAttendance.filter((a) => a.classSessionId === sessionId));
      });
  }, [sessionId, classId, applyRoster]);

  const markedCount = roster.filter((r) => r.status).length;

  const handleSave = async () => {
    if (!sessionId) return;
    const unmarked = roster.filter((r) => !r.status).length;
    if (unmarked > 0) {
      setMessage(`${unmarked} unmarked`);
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const updated: AttendanceRosterRow[] = [];
      for (const row of roster) {
        const status = row.status as Attendance['status'];
        const payload = {
          classSessionId: sessionId,
          studentUserId: row.studentUserId,
          status,
          remarks: row.remarks || undefined,
        };
        if (row.id) {
          const saved =
            import.meta.env.VITE_USE_MOCK === 'true'
              ? { ...payload, id: row.id, studentName: row.studentName }
              : await attendanceApi.update(row.id, payload);
          updated.push({
            id: saved.id ?? row.id,
            studentUserId: row.studentUserId,
            studentName: row.studentName,
            status: row.status as AttendanceRosterRow['status'],
            remarks: row.remarks,
          });
        } else {
          const saved =
            import.meta.env.VITE_USE_MOCK === 'true'
              ? { ...payload, id: crypto.randomUUID(), studentName: row.studentName }
              : await attendanceApi.create(payload);
          updated.push({
            id: saved.id,
            studentUserId: row.studentUserId,
            studentName: row.studentName,
            status: row.status as AttendanceRosterRow['status'],
            remarks: row.remarks,
          });
        }
      }
      setRoster(updated);
      setMessage('Saved');
    } catch {
      setMessage('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (!classId) {
    return (
      <div className="py-12 text-center text-sm text-slate-500">
        <Link to={teacherAttendanceHubUrl()} className="text-primary-600 hover:underline">
          Back to attendance
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageBackLink to={teacherAttendanceHubUrl()} label="Attendance" />

      <PageHeader
        title={classItem?.className ?? 'Roster'}
        description={classItem ? formatClassSchedule(classItem) : undefined}
        actions={
          <>
            {message && (
              <span
                className={
                  message === 'Saved'
                    ? 'self-center text-sm text-emerald-600'
                    : 'self-center text-sm text-amber-600'
                }
              >
                {message}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving || roster.length === 0}
              onClick={() =>
                setRoster(
                  roster.map((r) => ({ ...r, status: 'Present' as Attendance['status'] }))
                )
              }
            >
              All present
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saving || roster.length === 0}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">Loading…</p>
          ) : !classItem ? (
            <div className="m-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center sm:m-6">
              <p className="font-medium text-slate-700">Class not found</p>
              <p className="mt-1 text-sm text-slate-500">This class is not assigned to you.</p>
            </div>
          ) : !todaySession ? (
            <div className="m-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center sm:m-6">
              <p className="font-medium text-slate-700">No session today</p>
              <p className="mt-1 text-sm text-slate-500">
                There is no lesson scheduled for this class today.
              </p>
            </div>
          ) : roster.length === 0 ? (
            <div className="m-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center sm:m-6">
              <p className="font-medium text-slate-700">No students enrolled</p>
              <p className="mt-1 text-sm text-slate-500">Add enrollments to build a roster.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-end border-b border-slate-200 px-4 py-2.5 text-sm text-slate-500">
                {markedCount} of {roster.length} marked
              </div>
              <AttendanceRoster rows={roster} onChange={setRoster} disabled={saving} />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
