import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { AttendanceRoster } from '@/components/AttendanceRoster';
import {
  teacherClassSessionsUrl,
  teacherClassesUrl,
} from '@/utils/attendanceLinks';
import {
  formatClassSchedule,
  formatSessionBreadcrumb,
  formatSessionSchedule,
  resolveTodaySession,
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
  mockClassSessions,
  mockEnrollments,
  mockUsers,
} from '@/utils/mockData';
import { findTeacherClass, mergeClassSessions } from '@/utils/teacherClasses';
import {
  buildAttendanceRoster,
  enrichRosterWithPhones,
  type AttendanceRosterRow,
} from '@/utils/attendanceRoster';
import type { Attendance, ClassItem, ClassSession } from '@/types';

const ROSTER_PAGE_SIZE = 20;

export default function TakeAttendancePage() {
  const { user } = useAuth();
  const { classId = '', sessionId: routeSessionId } = useParams<{
    classId: string;
    sessionId?: string;
  }>();

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [activeSession, setActiveSession] = useState<ClassSession | null>(null);
  const [enrollments, setEnrollments] = useState(mockEnrollments);
  const [roster, setRoster] = useState<AttendanceRosterRow[]>([]);
  const [rosterPage, setRosterPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const sessionId = activeSession?.id ?? '';
  const isSessionRoute = Boolean(routeSessionId);
  const isCancelled = activeSession?.status === 'Cancelled';

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
      classesApi.getAll().catch(() => []),
      classSessionsApi.getAll().catch(() => mockClassSessions),
      enrollmentsApi.getAll().catch(() => mockEnrollments),
    ])
      .then(([allClasses, allSessions, allEnrollments]) => {
        if (cancelled) return;

        const cls = findTeacherClass(allClasses, classId, user);
        if (!cls) {
          setClassItem(null);
          setActiveSession(null);
          return;
        }

        const classSessions = mergeClassSessions(allSessions, classId);

        const resolveSession = async () => {
          if (routeSessionId) {
            return classSessions.find((s) => s.id === routeSessionId) ?? null;
          }
          return resolveTodaySession(cls, classSessions);
        };

        void resolveSession().then((session) => {
          if (cancelled) return;
          setClassItem(cls);
          setActiveSession(session);
        });

        const enrollmentKey = (e: (typeof mockEnrollments)[0]) =>
          `${e.studentUserId}-${e.classId}`;
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
  }, [user?.id, user?.email, classId, routeSessionId]);

  const applyRoster = useCallback(
    (records: typeof mockAttendance) => {
      const built = buildAttendanceRoster(sessionId, classId, enrollments, records);
      setRoster(enrichRosterWithPhones(built, phoneByUserId));
    },
    [sessionId, classId, enrollments, phoneByUserId]
  );

  useEffect(() => {
    if (!sessionId || !classId || isCancelled) {
      setRoster([]);
      return;
    }

    attendanceApi
      .getBySession(sessionId)
      .then(applyRoster)
      .catch(() => {
        applyRoster(mockAttendance.filter((a) => a.classSessionId === sessionId));
      });
  }, [sessionId, classId, applyRoster, isCancelled]);

  const markedCount = roster.filter((r) => r.status).length;
  const enrolledCount = roster.length;
  const rosterTotalPages = Math.max(1, Math.ceil(enrolledCount / ROSTER_PAGE_SIZE));
  const rosterPageClamped = Math.min(rosterPage, rosterTotalPages);
  const rosterPageStart = (rosterPageClamped - 1) * ROSTER_PAGE_SIZE;
  const rosterPageEnd = Math.min(rosterPageStart + ROSTER_PAGE_SIZE, enrolledCount);
  const paginatedRoster = useMemo(
    () => roster.slice(rosterPageStart, rosterPageEnd),
    [roster, rosterPageStart, rosterPageEnd]
  );
  const showRosterPagination = enrolledCount > ROSTER_PAGE_SIZE;

  useEffect(() => {
    setRosterPage(1);
  }, [sessionId]);

  useEffect(() => {
    if (rosterPage > rosterTotalPages) {
      setRosterPage(rosterTotalPages);
    }
  }, [rosterPage, rosterTotalPages]);

  const handlePaginatedRosterChange = (updated: AttendanceRosterRow[]) => {
    setRoster((prev) => {
      const next = [...prev];
      updated.forEach((row, i) => {
        next[rosterPageStart + i] = row;
      });
      return next;
    });
  };

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
        <Link to={teacherClassesUrl()} className="text-primary-600 hover:underline">
          Back to my classes
        </Link>
      </div>
    );
  }

  const breadcrumbs = isSessionRoute
    ? [
        { label: 'My Classes', to: teacherClassesUrl() },
        { label: classItem?.className ?? 'Class', to: teacherClassSessionsUrl(classId) },
        { label: 'Attendance' },
      ]
    : [
        { label: 'My Classes', to: teacherClassesUrl() },
        { label: classItem?.className ?? 'Attendance' },
      ];

  const pageTitle = isSessionRoute ? 'Take attendance' : (classItem?.className ?? 'Attendance');
  const pageDescription = activeSession
    ? formatSessionSchedule(activeSession)
    : classItem
      ? formatClassSchedule(classItem)
      : undefined;

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />

      <PageHeader
        title={pageTitle}
        description={pageDescription}
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
              disabled={saving || roster.length === 0 || isCancelled}
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
              disabled={saving || roster.length === 0 || isCancelled}
              onClick={handleSave}
            >
              {saving ? 'Saving…' : 'Save attendance'}
            </Button>
          </>
        }
      />

      {isSessionRoute && activeSession && (
        <p className="mb-4 text-sm text-slate-600">
          <span className="font-medium text-slate-800">{formatSessionBreadcrumb(activeSession)}</span>
          {' — '}
          Mark everyone enrolled in this class below.
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-6">
            <h2 className="text-sm font-semibold text-slate-900">
              Class roster
              {enrolledCount > 0 && (
                <span className="ml-2 font-normal text-slate-500">
                  ({enrolledCount} student{enrolledCount === 1 ? '' : 's'} in this class)
                </span>
              )}
            </h2>
          </div>

          {loading ? (
            <p className="p-8 text-center text-sm text-slate-500">Loading…</p>
          ) : !classItem ? (
            <div className="m-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center sm:m-6">
              <p className="font-medium text-slate-700">Class not found</p>
              <p className="mt-1 text-sm text-slate-500">This class is not assigned to you.</p>
            </div>
          ) : routeSessionId && !activeSession ? (
            <div className="m-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center sm:m-6">
              <p className="font-medium text-slate-700">Session not found</p>
              <Link
                to={teacherClassSessionsUrl(classId)}
                className="mt-2 inline-block text-sm text-primary-600 hover:underline"
              >
                Back to sessions
              </Link>
            </div>
          ) : !activeSession ? (
            <div className="m-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center sm:m-6">
              <p className="font-medium text-slate-700">No session today</p>
              <p className="mt-1 text-sm text-slate-500">
                Pick a lesson from{' '}
                <Link
                  to={teacherClassSessionsUrl(classId)}
                  className="text-primary-600 hover:underline"
                >
                  class sessions
                </Link>{' '}
                to take attendance.
              </p>
            </div>
          ) : isCancelled ? (
            <div className="m-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center sm:m-6">
              <p className="font-medium text-slate-700">Session cancelled</p>
              <p className="mt-1 text-sm text-slate-500">Attendance is not taken for this session.</p>
            </div>
          ) : roster.length === 0 ? (
            <div className="m-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center sm:m-6">
              <p className="font-medium text-slate-700">No students enrolled</p>
              <p className="mt-1 text-sm text-slate-500">Add enrollments to build a roster.</p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 text-sm text-slate-500">
                <span>
                  {showRosterPagination
                    ? `Showing ${rosterPageStart + 1}–${rosterPageEnd} of ${enrolledCount}`
                    : `${enrolledCount} student${enrolledCount === 1 ? '' : 's'}`}
                </span>
                <span>
                  {markedCount} of {enrolledCount} marked
                </span>
              </div>
              <AttendanceRoster
                rows={paginatedRoster}
                onChange={handlePaginatedRosterChange}
                disabled={saving}
              />
              {showRosterPagination && (
                <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 sm:px-6">
                  <p className="text-sm text-slate-600">
                    Page {rosterPageClamped} of {rosterTotalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={rosterPageClamped <= 1 || saving}
                      onClick={() => setRosterPage((p) => Math.max(1, p - 1))}
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={rosterPageClamped >= rosterTotalPages || saving}
                      onClick={() =>
                        setRosterPage((p) => Math.min(rosterTotalPages, p + 1))
                      }
                      aria-label="Next page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {isSessionRoute && (
        <p className="mt-4 text-center text-sm">
          <Link
            to={teacherClassSessionsUrl(classId)}
            className="text-primary-600 hover:text-primary-700 hover:underline"
          >
            ← Back to sessions
          </Link>
        </p>
      )}
    </div>
  );
}
