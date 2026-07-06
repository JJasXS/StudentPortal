import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarOff, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LeaveWorkflowSteps } from '@/components/leave/LeaveWorkflowSteps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Label, Select, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { leaveApi, parentsApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { formatPortalSlotDate, portalLeaveStatusLabel } from '@/utils/portalLeave';
import { getApiErrorMessage } from '@/utils/apiError';
import type { SqlAccountChild, ErpCalendarEvent } from '@/types/sqlAccount';
import type { PortalLeaveRequest } from '@/types/portal';

type Step = 'child' | 'session' | 'list';

function ReplacementDetails({ request }: { request: PortalLeaveRequest }) {
  if (!request.needsReplacement) return null;

  const finalDate =
    request.teacherResponse === 'Countered' && request.counterDate
      ? request.counterDate
      : request.replDate;
  const finalStart =
    request.teacherResponse === 'Countered' && request.counterStart
      ? request.counterStart
      : request.replStart;
  const finalEnd =
    request.teacherResponse === 'Countered' && request.counterEnd
      ? request.counterEnd
      : request.replEnd;

  if (request.status !== 'Confirmed') {
    return (
      <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
        Replacement in progress — admin and teacher are arranging a make-up class.
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Replacement class
      </p>
      <p className="mt-1 font-medium text-emerald-950">{request.className}</p>
      <p className="text-sm text-emerald-800">
        {formatPortalSlotDate(finalDate, finalStart, finalEnd)}
      </p>
      {request.replTeacher && (
        <p className="mt-1 text-sm text-emerald-700">Teacher: {request.replTeacher}</p>
      )}
    </div>
  );
}

export default function StudentLeavePage() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [step, setStep] = useState<Step>('list');
  const [children, setChildren] = useState<SqlAccountChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<SqlAccountChild | null>(null);
  const [events, setEvents] = useState<ErpCalendarEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ErpCalendarEvent | null>(null);
  const [requests, setRequests] = useState<PortalLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await leaveApi.getMine();
      setRequests(data);
    } catch {
      setRequests([]);
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'Parent') {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([parentsApi.getMySqlAccountChildren(), leaveApi.getMine()])
      .then(([childData, leaveData]) => {
        setChildren(childData.children);
        setRequests(leaveData);
      })
      .catch(() => {
        setChildren([]);
        setRequests([]);
      })
      .finally(() => setLoading(false));
  }, [user?.role]);

  const upcomingSessions = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => e.status !== 'Cancelled' && new Date(e.sessionDate) >= now)
      .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime());
  }, [events]);

  const loadSessions = async (child: SqlAccountChild) => {
    try {
      const data = await parentsApi.getMyCalendarEvents(child.branchName);
      setEvents(data);
    } catch {
      setEvents([]);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedChild || !selectedEvent || !reason.trim()) return;
    setSubmitting(true);
    try {
      await leaveApi.submit({
        occurrenceId: selectedEvent.id.startsWith('occ-') ? selectedEvent.id.slice(4) : selectedEvent.id,
        docKey: selectedEvent.docKey,
        seq: selectedEvent.seq,
        branchName: selectedChild.branchName,
        sessionDate: selectedEvent.sessionDate,
        reason: reason.trim(),
      });
      setReason('');
      setSelectedEvent(null);
      setSelectedChild(null);
      setStep('list');
      await refresh();
      showSuccess('Leave request submitted.');
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not submit leave request.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== 'Parent') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Leave requests"
          description="Leave is requested by parents for enrolled children."
        />
        <EmptyState
          icon={CalendarOff}
          title="Parent account required"
          description="Please sign in as a parent to request leave."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Leave requests"
        description="Request leave for an upcoming class session. Admin will review and arrange a replacement if needed."
        actions={
          step === 'list' ? (
            <Button type="button" size="sm" onClick={() => setStep('child')}>
              <Plus className="mr-1.5 h-4 w-4" />
              New request
            </Button>
          ) : undefined
        }
      />

      {step !== 'list' && (
        <button
          type="button"
          onClick={() => {
            if (step === 'session') {
              setStep('child');
              setSelectedEvent(null);
            } else {
              setStep('list');
              setSelectedChild(null);
            }
          }}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 'session' ? selectedChild?.branchName : 'Back to requests'}
        </button>
      )}

      {step === 'child' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select child</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-slate-100 p-0">
            {children.map((child) => (
              <button
                key={child.branchName}
                type="button"
                onClick={() => {
                  setSelectedChild(child);
                  void loadSessions(child);
                  setStep('session');
                }}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">{child.branchName}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 'session' && selectedChild && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select session</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <p className="text-sm text-slate-500">No upcoming sessions for this child.</p>
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="leaveSession">Upcoming session</Label>
                  <Select
                    id="leaveSession"
                    value={selectedEvent?.id ?? ''}
                    onChange={(ev) => {
                      const picked = upcomingSessions.find((s) => s.id === ev.target.value);
                      setSelectedEvent(picked ?? null);
                    }}
                    required
                  >
                    <option value="">Select session…</option>
                    {upcomingSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.className} — {formatDateDDMMYYYY(s.sessionDate)}
                        {s.startTime ? ` ${s.startTime}` : ''}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="leaveReason">Reason</Label>
                  <Textarea
                    id="leaveReason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Brief reason for leave…"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep('list')}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || !selectedEvent}>
                    Submit request
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {step === 'list' && (
        <>
          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={CalendarOff}
              title="No leave requests"
              description="Submit a request when your child cannot attend a class."
            />
          ) : (
            <div className="space-y-4">
              {requests.map((req) => (
                <Card key={req.id} className="overflow-hidden">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{req.className}</CardTitle>
                        <p className="text-sm text-slate-500">
                          {req.branchName} · Leave for {formatDateDDMMYYYY(req.sessionDate)}
                        </p>
                      </div>
                      <StatusBadge status={req.status} label={portalLeaveStatusLabel(req.status)} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-4">
                    <p className="text-sm text-slate-700">{req.reason}</p>
                    {req.adminNote && (
                      <p className="text-sm text-slate-500">
                        <span className="font-medium">Admin: </span>
                        {req.adminNote}
                      </p>
                    )}
                    {req.needsReplacement && <ReplacementDetails request={req} />}
                    <LeaveWorkflowSteps status={req.status} compact />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
