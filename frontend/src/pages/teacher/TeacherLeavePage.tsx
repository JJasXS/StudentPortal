import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Label, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/context/ToastContext';
import { calendarApi, leaveApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { formatPortalSlotDate, isLeaveSessionEligible, portalLeaveStatusLabel } from '@/utils/portalLeave';
import { getApiErrorMessage } from '@/utils/apiError';
import type { ErpCalendarEvent } from '@/types/sqlAccount';
import type { PortalLeaveRequest } from '@/types/portal';

function sessionLabel(event: ErpCalendarEvent) {
  const date = formatDateDDMMYYYY(event.sessionDate);
  const time = event.startTime ? ` · ${event.startTime}` : '';
  const student = event.studentName ?? event.branchName;
  return `${event.className ?? 'Class'} — ${student} — ${date}${time}`;
}

export default function TeacherLeavePage() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [events, setEvents] = useState<ErpCalendarEvent[]>([]);
  const [requests, setRequests] = useState<PortalLeaveRequest[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ErpCalendarEvent | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await leaveApi.getTeacherMine();
      setRequests(data);
    } catch {
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([calendarApi.getEvents(), leaveApi.getTeacherMine()])
      .then(([erpAll, leaveData]) => {
        const teacherName = user.fullName?.toLowerCase();
        const mine = erpAll.filter(
          (e) =>
            (e.teacherUserId && e.teacherUserId === user.id) ||
            (teacherName && e.teacherName?.toLowerCase() === teacherName)
        );
        setEvents(mine);
        setRequests(leaveData);
      })
      .catch(() => {
        setEvents([]);
        setRequests([]);
      })
      .finally(() => setLoading(false));
  }, [user?.id, user?.fullName]);

  const upcomingSessions = useMemo(
    () =>
      events
        .filter(
          (e) =>
            e.status !== 'Cancelled' &&
            isLeaveSessionEligible(e.sessionDate, e.startTime)
        )
        .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()),
    [events]
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !reason.trim()) return;
    setSubmitting(true);
    try {
      await leaveApi.submitTeacher({
        occurrenceId: selectedEvent.id.startsWith('occ-')
          ? selectedEvent.id.slice(4)
          : selectedEvent.id,
        docKey: selectedEvent.docKey ?? 0,
        seq: selectedEvent.seq ?? 0,
        branchName: selectedEvent.branchName ?? selectedEvent.studentName ?? '',
        sessionDate: selectedEvent.sessionDate,
        startTime: selectedEvent.startTime,
        reason: reason.trim(),
      });
      showSuccess('Leave request submitted.');
      setReason('');
      setSelectedEvent(null);
      await refresh();
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not submit leave request.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leave"
        description="Request leave for your upcoming classes. Admin will review and notify students."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submit leave</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading sessions…</p>
          ) : upcomingSessions.length === 0 ? (
            <EmptyState
              icon={CalendarOff}
              title="No eligible sessions"
              description="Sessions must be in the current month and at least 24 hours away."
            />
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <Label htmlFor="session">Session</Label>
                <select
                  id="session"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={selectedEvent?.id ?? ''}
                  onChange={(ev) => {
                    const next = upcomingSessions.find((s) => s.id === ev.target.value) ?? null;
                    setSelectedEvent(next);
                  }}
                >
                  <option value="">Select a session…</option>
                  {upcomingSessions.map((session) => (
                    <option key={session.id} value={session.id}>
                      {sessionLabel(session)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Reason for leave"
                  required
                />
              </div>
              <Button type="submit" disabled={!selectedEvent || !reason.trim() || submitting}>
                {submitting ? 'Submitting…' : 'Submit leave request'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My leave requests</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            embedded
            data={requests}
            emptyMessage="No leave requests yet."
            columns={[
              {
                key: 'class',
                header: 'Class',
                render: (r) => (
                  <div>
                    <p className="font-medium text-slate-900">{r.className ?? 'Class'}</p>
                    <p className="text-xs text-slate-500">{r.branchName}</p>
                  </div>
                ),
              },
              {
                key: 'session',
                header: 'Session',
                render: (r) => formatPortalSlotDate(r.sessionDate, undefined, undefined),
              },
              {
                key: 'status',
                header: 'Status',
                render: (r) => (
                  <StatusBadge status={r.status} label={portalLeaveStatusLabel(r.status)} />
                ),
              },
              {
                key: 'replacement',
                header: 'Replacement',
                render: (r) =>
                  r.status === 'Confirmed' && r.replDate ? (
                    <span className="text-sm text-emerald-800">
                      {formatPortalSlotDate(r.replDate, r.replStart ?? undefined, r.replEnd ?? undefined)}
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">—</span>
                  ),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
