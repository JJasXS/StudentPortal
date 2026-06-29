import { useEffect, useMemo, useState } from 'react';
import { ClipboardCheck, KeyRound } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/PageHeader';
import { CheckInCodeInput, CHECK_IN_CODE_LENGTH } from '@/components/student/CheckInCodeInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonListRows, SkeletonTableRows } from '@/components/ui/Skeleton';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  attendanceApi,
  classSessionsApi,
  enrollmentsApi,
  classesApi,
} from '@/api/resources';
import { mockRedeemCheckIn, loadExtraMockAttendance } from '@/utils/mockAttendanceCheckIn';
import {
  mockAttendance,
  mockClassSessions,
  mockEnrollments,
  mockClasses,
} from '@/utils/mockData';
import { buildClassAttendanceSummaries, type ClassAttendanceSummary } from '@/utils/studentAttendanceStats';
import type { Attendance } from '@/types';

type MainTab = 'Check in' | 'Attendance';

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [mainTab, setMainTab] = useState<MainTab>('Check in');
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [classSummaries, setClassSummaries] = useState<ClassAttendanceSummary[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAttendance = () => {
    setLoading(true);
    attendanceApi
      .getAll()
      .then((data) => {
        const mine = data.filter((a) => a.studentUserId === user?.id);
        const extras = loadExtraMockAttendance().filter((a) => a.studentUserId === user?.id);
        const ids = new Set(mine.map((a) => `${a.classSessionId}-${a.studentUserId}`));
        setAttendance([
          ...mine,
          ...extras.filter((e) => !ids.has(`${e.classSessionId}-${e.studentUserId}`)),
        ]);
      })
      .catch(() => {
        const base = mockAttendance.filter((a) => a.studentUserId === user?.id);
        const extras = loadExtraMockAttendance().filter((a) => a.studentUserId === user?.id);
        setAttendance([...base, ...extras]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user?.id) return;
    loadAttendance();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([
      enrollmentsApi.getAll().catch(() => mockEnrollments),
      classesApi.getAll().catch(() => mockClasses),
    ]).then(([enrollments, classes]) => {
      const meta = new Map(classes.map((c) => [c.id, { courseName: c.courseName }]));
      setClassSummaries(
        buildClassAttendanceSummaries(enrollments, attendance, user.id, meta)
      );
    });
  }, [user?.id, attendance]);

  useEffect(() => {
    if (classSummaries.length === 0) {
      setSelectedClassId('');
      return;
    }
    if (!classSummaries.some((s) => s.classId === selectedClassId)) {
      setSelectedClassId(classSummaries[0].classId);
    }
  }, [classSummaries, selectedClassId]);

  const selectedSummary = useMemo(
    () => classSummaries.find((s) => s.classId === selectedClassId),
    [classSummaries, selectedClassId]
  );

  const classAttendance = useMemo(() => {
    if (!selectedSummary) return [];
    return attendance
      .filter((a) => a.className === selectedSummary.className)
      .sort((a, b) => (b.sessionDate ?? '').localeCompare(a.sessionDate ?? ''));
  }, [attendance, selectedSummary]);

  const classTabIds = useMemo(() => classSummaries.map((s) => s.classId), [classSummaries]);

  const classTabLabels = useMemo(
    () => Object.fromEntries(classSummaries.map((s) => [s.classId, s.className])),
    [classSummaries]
  );

  const classTabCounts = useMemo(
    () => Object.fromEntries(classSummaries.map((s) => [s.classId, s.attendedCount])),
    [classSummaries]
  );

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length !== CHECK_IN_CODE_LENGTH) {
      showError('Enter the full 5-digit code from your teacher.');
      return;
    }

    setSubmitting(true);
    try {
      if (import.meta.env.VITE_USE_MOCK === 'true') {
        const sessions = await classSessionsApi.getAll().catch(() => mockClassSessions);
        const enrollments = await enrollmentsApi.getAll().catch(() => mockEnrollments);
        const record = mockRedeemCheckIn(
          trimmed,
          user!.id,
          user!.fullName,
          sessions,
          enrollments
        );
        if (!record) {
          showError('Invalid code, outside class time, or you are not enrolled in that class.');
          return;
        }
        showSuccess(`Checked in to ${record.className ?? 'class'} successfully.`);
        setCode('');
        loadAttendance();
        setMainTab('Attendance');
        return;
      }
      const record = await attendanceApi.redeemCheckIn(trimmed);
      showSuccess(`Checked in to ${record.className ?? 'class'} successfully.`);
      setCode('');
      loadAttendance();
      setMainTab('Attendance');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      showError(msg ?? 'Could not check in. Check the code and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="My Attendance"
        description="Check in with your teacher's code or view sessions attended per class"
      />

      <Card className="overflow-hidden">
        <SlidingTabs
          tabs={['Check in', 'Attendance'] as const}
          value={mainTab}
          onChange={(v) => setMainTab(v as MainTab)}
        />

        <CardContent className="space-y-0 p-0">
          {mainTab === 'Check in' ? (
            <div className="mx-auto max-w-sm px-4 py-8 text-center sm:px-6">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                <KeyRound className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Enter check-in code</h2>
              <p className="mt-1 text-sm text-slate-600">
                Type the 5-digit code your teacher shows in class.
              </p>
              <form onSubmit={handleCheckIn} className="mt-6 space-y-5">
                <div>
                  <p id="check-in-code-label" className="sr-only">
                    5-digit check-in code
                  </p>
                  <CheckInCodeInput value={code} onChange={setCode} disabled={submitting} />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || code.length !== CHECK_IN_CODE_LENGTH}
                >
                  {submitting ? 'Checking in…' : 'Check in'}
                </Button>
              </form>
            </div>
          ) : loading ? (
            <div className="space-y-4 p-4 sm:p-6">
              <SkeletonTableRows rows={1} cols={3} />
              <SkeletonListRows rows={4} />
            </div>
          ) : classSummaries.length === 0 ? (
            <div className="p-4 sm:p-6">
              <EmptyState
                icon={ClipboardCheck}
                title="No classes enrolled"
                description="Once you are enrolled, pick a class tab here to see your attendance."
                compact
              />
            </div>
          ) : (
            <>
              <SlidingTabs
                tabs={classTabIds}
                value={selectedClassId}
                onChange={setSelectedClassId}
                labels={classTabLabels}
                counts={classTabCounts}
                className="border-b border-slate-200 bg-slate-50/50"
              />

              <div className="space-y-4 p-4 sm:p-6">
                {selectedSummary && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      {selectedSummary.courseName ?? 'Class'}
                    </p>
                    <p className="mt-0.5 text-lg font-semibold text-slate-900">
                      {selectedSummary.className}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-primary-700">
                      {selectedSummary.attendedCount}
                      <span className="ml-1 text-sm font-medium text-slate-500">
                        {selectedSummary.attendedCount === 1 ? 'session' : 'sessions'} attended
                      </span>
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="mb-3 text-sm font-semibold text-slate-900">Session history</h3>
                  {classAttendance.length === 0 ? (
                    <EmptyState
                      icon={ClipboardCheck}
                      title="No sessions yet"
                      description="Your attendance for this class will show here after your first lesson."
                      compact
                    />
                  ) : (
                    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                      {classAttendance.map((record) => (
                        <li
                          key={record.id}
                          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                        >
                          <span className="text-sm font-medium text-slate-900">
                            {record.sessionDate ?? '—'}
                          </span>
                          <StatusBadge status={record.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
