import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTabs } from '@/components/ui/StatusTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { attendanceApi, classSessionsApi, enrollmentsApi } from '@/api/resources';
import { mockRedeemCheckIn, loadExtraMockAttendance } from '@/utils/mockAttendanceCheckIn';
import {
  mockAttendance,
  mockClassSessions,
  mockEnrollments,
} from '@/utils/mockData';
import { ATTENDANCE_STATUSES } from '@/utils/constants';
import { filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import type { Attendance } from '@/types';

export default function StudentAttendancePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [statusTab, setStatusTab] = useState('All');
  const [code, setCode] = useState('');
  const [checkInMessage, setCheckInMessage] = useState('');
  const [checkInError, setCheckInError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAttendance = () => {
    attendanceApi
      .getAll()
      .then((data) => {
        const mine = data.filter((a) => a.studentUserId === user?.id);
        const extras = loadExtraMockAttendance().filter((a) => a.studentUserId === user?.id);
        const ids = new Set(mine.map((a) => `${a.classSessionId}-${a.studentUserId}`));
        setAttendance([...mine, ...extras.filter((e) => !ids.has(`${e.classSessionId}-${e.studentUserId}`))]);
      })
      .catch(() => {
        const base = mockAttendance.filter((a) => a.studentUserId === user?.id);
        const extras = loadExtraMockAttendance().filter((a) => a.studentUserId === user?.id);
        setAttendance([...base, ...extras]);
      });
  };

  useEffect(() => {
    if (!user?.id) return;
    loadAttendance();
  }, [user?.id]);

  const statusCounts = useMemo(
    () => getStatusCounts(attendance, (a) => a.status, ATTENDANCE_STATUSES),
    [attendance]
  );

  const filtered = useMemo(
    () => filterByStatus(attendance, statusTab, (a) => a.status),
    [attendance, statusTab]
  );

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckInError('');
    setCheckInMessage('');
    const trimmed = code.trim();
    if (trimmed.length !== 5) {
      setCheckInError('Enter the 5-digit code from your teacher.');
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
          setCheckInError('Invalid code, outside class time, or you are not enrolled in that class.');
          return;
        }
        setCheckInMessage(`Checked in to ${record.className ?? 'class'} successfully.`);
        setCode('');
        loadAttendance();
        return;
      }
      const record = await attendanceApi.redeemCheckIn(trimmed);
      setCheckInMessage(`Checked in to ${record.className ?? 'class'} successfully.`);
      setCode('');
      loadAttendance();
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setCheckInError(msg ?? 'Could not check in. Check the code and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="My Attendance" description="Check in with a class code or view your history" />

      <Card className="mb-6">
        <CardContent className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Check in to class</h2>
          <p className="mt-1 text-sm text-slate-600">
            Enter the 5-digit code your teacher displays during class.
          </p>
          <form onSubmit={handleCheckIn} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Label htmlFor="check-in-code">5-digit code</Label>
              <Input
                id="check-in-code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={5}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                placeholder="00000"
                className="mt-1 font-mono text-lg tracking-[0.35em]"
              />
            </div>
            <Button type="submit" disabled={submitting || code.length !== 5}>
              {submitting ? 'Checking in…' : 'Check in'}
            </Button>
          </form>
          {checkInMessage && (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {checkInMessage}
            </p>
          )}
          {checkInError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {checkInError}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <StatusTabs
            statuses={ATTENDANCE_STATUSES}
            value={statusTab}
            onChange={setStatusTab}
            counts={statusCounts}
          />
          <DataTable
            data={filtered}
            columns={[
              { key: 'sessionDate', header: 'Date' },
              { key: 'className', header: 'Class' },
              { key: 'status', header: 'Status' },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
