import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { CalendarOff, ChevronLeft, ChevronRight, MoreVertical, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LeaveWorkflowSteps } from '@/components/leave/LeaveWorkflowSteps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Label, Textarea, Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { leaveApi, parentsApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { formatPortalSlotDate, isLeaveSessionEligible, portalLeaveStatusLabel } from '@/utils/portalLeave';
import { getApiErrorMessage } from '@/utils/apiError';
import type { SqlAccountChild, ErpCalendarEvent } from '@/types/sqlAccount';
import type { PortalLeaveRequest, ReplacementOption } from '@/types/portal';

type Step = 'student' | 'session' | 'list';

function displayStudentName(child: SqlAccountChild) {
  return child.branchName?.trim() || child.attention?.trim() || 'Student';
}

function sessionLabel(event: ErpCalendarEvent) {
  const date = formatDateDDMMYYYY(event.sessionDate);
  const time = event.startTime ? ` · ${event.startTime}` : '';
  return `${event.className ?? 'Class'} — ${date}${time}`;
}

function currentMonthLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function ReplacementDetails({ request }: { request: PortalLeaveRequest }) {
  if (!request.needsReplacement) return null;

  if (request.status !== 'Confirmed') {
    return (
      <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
        Replacement pending — admin will review your preferred slots.
        {request.replOptions && request.replOptions.length > 0 && (
          <ul className="mt-2 space-y-1">
            {request.replOptions.map((slot) => (
              <li key={`${slot.date}-${slot.time}`}>
                {formatDateDDMMYYYY(slot.date)} · {slot.time}
              </li>
            ))}
          </ul>
        )}
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
        {formatPortalSlotDate(request.replDate, request.replStart, request.replEnd)}
      </p>
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
  const [replacementSlots, setReplacementSlots] = useState<ReplacementOption[]>([{ date: '', time: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PortalLeaveRequest | null>(null);

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
    return events
      .filter(
        (e) =>
          e.status !== 'Cancelled' &&
          isLeaveSessionEligible(e.sessionDate, e.startTime)
      )
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
      const replacementOptions = replacementSlots.filter((s) => s.date.trim() && s.time.trim());
      await leaveApi.submit({
        occurrenceId: selectedEvent.id.startsWith('occ-') ? selectedEvent.id.slice(4) : selectedEvent.id,
        docKey: selectedEvent.docKey,
        seq: selectedEvent.seq,
        branchName: selectedChild.branchName,
        sessionDate: selectedEvent.sessionDate,
        startTime: selectedEvent.startTime,
        reason: reason.trim(),
        replacementOptions: replacementOptions.length > 0 ? replacementOptions : undefined,
      });
      setReason('');
      setReplacementSlots([{ date: '', time: '' }]);
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
        title="Leave"
        description="Request leave for an upcoming class session. Admin will review and arrange a replacement if needed."
        actions={
          step === 'list' ? (
            <Button type="button" size="sm" onClick={() => setStep('student')}>
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
              setStep('student');
              setSelectedEvent(null);
            } else {
              setStep('list');
              setSelectedChild(null);
            }
          }}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 'session' ? 'Select student' : 'Back to requests'}
        </button>
      )}

      {step === 'student' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Select student</CardTitle>
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
                <span className="font-medium text-slate-900">{displayStudentName(child)}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 'session' && selectedChild && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Submit leave</CardTitle>
            <p className="text-sm text-slate-500">
              Showing sessions in {currentMonthLabel()} only (at least 24 hours before class).
            </p>
          </CardHeader>
          <CardContent>
            {upcomingSessions.length === 0 ? (
              <EmptyState
                icon={CalendarOff}
                title="No eligible sessions"
                description={`No sessions in ${currentMonthLabel()} are available for leave. Sessions must be at least 24 hours away.`}
              />
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                <div>
                  <Label htmlFor="leaveSession">Session</Label>
                  <select
                    id="leaveSession"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={selectedEvent?.id ?? ''}
                    onChange={(ev) => {
                      const picked = upcomingSessions.find((s) => s.id === ev.target.value);
                      setSelectedEvent(picked ?? null);
                    }}
                    required
                  >
                    <option value="">Select a session…</option>
                    {upcomingSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {sessionLabel(s)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="leaveReason">Reason</Label>
                  <Textarea
                    id="leaveReason"
                    className="mt-1"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="Reason for leave"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Preferred replacement slots (optional)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setReplacementSlots((rows) => [...rows, { date: '', time: '' }])
                      }
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add slot
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Add one row per date and time you could attend a make-up class. Admin will pick one option.
                  </p>
                  {replacementSlots.map((slot, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <Input
                        type="date"
                        value={slot.date}
                        onChange={(e) =>
                          setReplacementSlots((rows) =>
                            rows.map((row, i) =>
                              i === index ? { ...row, date: e.target.value } : row
                            )
                          )
                        }
                      />
                      <Input
                        type="time"
                        value={slot.time}
                        onChange={(e) =>
                          setReplacementSlots((rows) =>
                            rows.map((row, i) =>
                              i === index ? { ...row, time: e.target.value } : row
                            )
                          )
                        }
                      />
                      {replacementSlots.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setReplacementSlots((rows) => rows.filter((_, i) => i !== index))
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep('list')}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || !selectedEvent}>
                    {submitting ? 'Submitting…' : 'Submit leave request'}
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
              description="Submit a request when your student cannot attend a class."
            />
          ) : (
            <Card>
              <CardContent className="p-0">
                <DataTable
                  embedded
                  data={requests}
                  columns={[
                    {
                      key: 'className',
                      header: 'Class',
                      render: (r) => r.className ?? '—',
                    },
                    {
                      key: 'branchName',
                      header: 'Student',
                      render: (r) => r.branchName,
                    },
                    {
                      key: 'sessionDate',
                      header: 'Leave date',
                      render: (r) => formatDateDDMMYYYY(r.sessionDate),
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      render: (r) => (
                        <StatusBadge status={r.status} label={portalLeaveStatusLabel(r.status)} />
                      ),
                    },
                    {
                      key: 'actions',
                      header: '',
                      colWidth: '3rem',
                      sticky: 'end',
                      align: 'right',
                      render: (r) => (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedRequest(r)}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      ),
                    },
                  ]}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Modal
        open={Boolean(selectedRequest)}
        onClose={() => setSelectedRequest(null)}
        title={selectedRequest?.className ?? 'Leave request'}
        className="max-w-lg"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {selectedRequest.branchName} · {formatDateDDMMYYYY(selectedRequest.sessionDate)}
            </p>
            <p className="text-sm text-slate-800">{selectedRequest.reason}</p>
            {selectedRequest.adminNote && (
              <p className="text-sm text-slate-500">
                <span className="font-medium">Admin: </span>
                {selectedRequest.adminNote}
              </p>
            )}
            {selectedRequest.needsReplacement && <ReplacementDetails request={selectedRequest} />}
            <LeaveWorkflowSteps status={selectedRequest.status} />
          </div>
        )}
      </Modal>
    </div>
  );
}
