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
import { leaveApi, studentsApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { formatPortalSlotDate, formatLeaveReplacementFromTo, isLeaveSessionEligible, portalLeaveStatusLabel } from '@/utils/portalLeave';
import { getApiErrorMessage } from '@/utils/apiError';
import { cn } from '@/utils/cn';
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

function toIsoDate(value?: string | null) {
  const iso = value?.trim().slice(0, 10) ?? '';
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : '';
}

/** Half-hour clock values from 6:00 AM through midnight (00:00). */
const HALF_HOUR_TIMES = [
  ...Array.from({ length: 36 }, (_, i) => {
    const totalHalf = 12 + i; // 06:00 … 23:30
    const hours = Math.floor(totalHalf / 2);
    const minutes = totalHalf % 2 === 0 ? '00' : '30';
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }),
  '00:00',
];

function formatHalfHourLabel(value: string) {
  const [hStr, mStr] = value.split(':');
  const hours = Number(hStr);
  const minutes = mStr ?? '00';
  if (Number.isNaN(hours)) return value;
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes} ${period}`;
}

function currentMonthLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function ReplacementDetails({ request }: { request: PortalLeaveRequest }) {
  if (request.status === 'Confirmed' && request.replDate) {
    const fromTo = formatLeaveReplacementFromTo(request);
    return (
      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Replacement scheduled
        </p>
        <p className="mt-1 font-medium text-emerald-950">{request.className ?? 'Class'}</p>
        {fromTo && (
          <p className="mt-1 text-sm text-emerald-800">
            <span className="font-medium">From</span> {formatPortalSlotDate(request.sessionDate, request.sessionStartTime)}
            <br />
            <span className="font-medium">To</span> {formatPortalSlotDate(request.replDate, request.replStart, request.replEnd)}
          </p>
        )}
      </div>
    );
  }

  if (!request.needsReplacement) return null;

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
    if (user?.role !== 'Student' && user?.role !== 'Parent') {
      setLoading(false);
      return;
    }
    setLoading(true);
    Promise.all([studentsApi.getMySqlAccount(), leaveApi.getMine()])
      .then(([account, leaveData]) => {
        setChildren([
          {
            branchName: account.branchName,
            attention: account.studentName,
            email: account.email,
            phone: account.phone,
          },
        ]);
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

  const replacementMinDate = toIsoDate(selectedEvent?.sessionDate);

  const pickSession = (picked: ErpCalendarEvent | null) => {
    const minDate = toIsoDate(picked?.sessionDate);
    setSelectedEvent(picked);
    setReplacementSlots((rows) =>
      rows.map((row) =>
        row.date && minDate && row.date < minDate ? { ...row, date: '' } : row
      )
    );
  };

  const loadSessions = async (child: SqlAccountChild) => {
    try {
      const data = await studentsApi.getMyCalendarEvents(child.branchName);
      setEvents(data);
    } catch {
      setEvents([]);
    }
  };

  const isSelfStudent = user?.role === 'Student';

  const startNewRequest = (childList: SqlAccountChild[] = children) => {
    if (isSelfStudent || childList.length === 1) {
      const child = childList[0];
      if (!child) return;
      setSelectedChild(child);
      setSelectedEvent(null);
      void loadSessions(child);
      setStep('session');
      return;
    }
    setStep('student');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedChild || !selectedEvent || !reason.trim()) return;
    setSubmitting(true);
    try {
      const minDate = toIsoDate(selectedEvent.sessionDate);
      const replacementOptions = replacementSlots.filter((s) => {
        const date = s.date.trim();
        const time = s.time.trim();
        if (!date || !time) return false;
        if (minDate && date < minDate) return false;
        return true;
      });
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

  if (user?.role !== 'Student' && user?.role !== 'Parent') {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <PageHeader
          title="Leave requests"
          description="Leave is requested by students for enrolled classes."
        />
        <EmptyState
          icon={CalendarOff}
          title="Student account required"
          description="Please sign in as a student to request leave."
        />
      </div>
    );
  }

  return (
    <div className={cn('mx-auto space-y-6', step === 'list' ? 'max-w-5xl' : 'max-w-2xl')}>
      <PageHeader
        title="Leave"
        description="Request leave for an upcoming class session. Admin will review and arrange a replacement if needed."
        actions={
          step === 'list' ? (
            <Button type="button" size="sm" onClick={() => startNewRequest()} disabled={loading || children.length === 0}>
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
            if (step === 'session' && !isSelfStudent && children.length > 1) {
              setStep('student');
              setSelectedEvent(null);
              return;
            }
            setStep('list');
            setSelectedChild(null);
            setSelectedEvent(null);
          }}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 'session' && !isSelfStudent && children.length > 1
            ? 'Select student'
            : 'Back to requests'}
        </button>
      )}

      {step === 'student' && !isSelfStudent && (
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
                      pickSession(picked ?? null);
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
                    Add one row per date and time you could attend a make-up class. Admin will pick
                    one option.
                    {replacementMinDate
                      ? ` Replacement dates must be on or after ${formatDateDDMMYYYY(replacementMinDate)}.`
                      : ' Select a session first to choose replacement dates.'}
                  </p>
                  {replacementSlots.map((slot, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                      <Input
                        type="date"
                        value={slot.date}
                        min={replacementMinDate || undefined}
                        disabled={!replacementMinDate}
                        onChange={(e) =>
                          setReplacementSlots((rows) =>
                            rows.map((row, i) =>
                              i === index ? { ...row, date: e.target.value } : row
                            )
                          )
                        }
                      />
                      <select
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                        value={HALF_HOUR_TIMES.includes(slot.time) ? slot.time : ''}
                        disabled={!replacementMinDate}
                        onChange={(e) =>
                          setReplacementSlots((rows) =>
                            rows.map((row, i) =>
                              i === index ? { ...row, time: e.target.value } : row
                            )
                          )
                        }
                      >
                        <option value="">Time…</option>
                        {HALF_HOUR_TIMES.map((t) => (
                          <option key={t} value={t}>
                            {formatHalfHourLabel(t)}
                          </option>
                        ))}
                      </select>
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
                      wrap: true,
                      colWidth: '40%',
                      className: 'min-w-0',
                      render: (r) => (
                        <span className="line-clamp-2 break-words" title={r.className ?? undefined}>
                          {r.className ?? '—'}
                        </span>
                      ),
                    },
                    {
                      key: 'branchName',
                      header: 'Student',
                      colWidth: '6rem',
                      render: (r) => r.branchName,
                    },
                    {
                      key: 'sessionDate',
                      header: 'Leave date',
                      colWidth: '7rem',
                      render: (r) => formatPortalSlotDate(r.sessionDate, r.sessionStartTime),
                    },
                    {
                      key: 'replacement',
                      header: 'Replacement',
                      wrap: true,
                      colWidth: '14rem',
                      className: 'min-w-0',
                      render: (r) => {
                        if (r.status === 'Confirmed' && r.replDate) {
                          return (
                            <span className="text-sm text-slate-700">
                              <span className="text-slate-500">From </span>
                              {formatPortalSlotDate(r.sessionDate, r.sessionStartTime)}
                              <br />
                              <span className="text-slate-500">To </span>
                              {formatPortalSlotDate(r.replDate, r.replStart, r.replEnd)}
                            </span>
                          );
                        }
                        if (r.needsReplacement) {
                          return <span className="text-sm text-amber-700">Pending</span>;
                        }
                        return <span className="text-slate-400">—</span>;
                      },
                    },
                    {
                      key: 'status',
                      header: 'Status',
                      colWidth: '9rem',
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
              {selectedRequest.branchName} ·{' '}
              {formatPortalSlotDate(selectedRequest.sessionDate, selectedRequest.sessionStartTime)}
            </p>
            <p className="text-sm text-slate-800">{selectedRequest.reason}</p>
            {selectedRequest.adminNote && (
              <p className="text-sm text-slate-500">
                <span className="font-medium">Admin: </span>
                {selectedRequest.adminNote}
              </p>
            )}
            <ReplacementDetails request={selectedRequest} />
            <LeaveWorkflowSteps status={selectedRequest.status} />
          </div>
        )}
      </Modal>
    </div>
  );
}
