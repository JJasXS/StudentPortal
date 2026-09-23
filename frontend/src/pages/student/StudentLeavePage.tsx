import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CalendarOff, ChevronLeft, ChevronRight, MoreVertical, Plus } from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { LeaveWorkflowSteps } from '@/components/leave/LeaveWorkflowSteps';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Label, Textarea, Input } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { leaveApi, studentsApi } from '@/api/resources';
import { formatDateDayMonth, formatDateDDMMYYYY, formatTime12h } from '@/utils/dateFormat';
import {
  formatPortalSlotDate,
  isLeaveSessionEligible,
  portalLeaveStatusLabel,
} from '@/utils/portalLeave';
import { getApiErrorMessage } from '@/utils/apiError';
import { cn } from '@/utils/cn';
import type { SqlAccountChild, ErpCalendarEvent } from '@/types/sqlAccount';
import type { PortalLeaveRequest, ReplacementOption } from '@/types/portal';

type Step = 'student' | 'session' | 'list';
type LeaveListTab = 'pending' | 'approved' | 'rejected';

const LEAVE_TABS = ['pending', 'approved', 'rejected'] as const;

function leaveTabForStatus(status: string): LeaveListTab {
  if (status === 'Rejected') return 'rejected';
  if (status === 'Approved' || status === 'Confirmed') return 'approved';
  return 'pending';
}

function displayStudentName(child: SqlAccountChild) {
  return child.branchName?.trim() || child.attention?.trim() || 'Student';
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

function LeaveFromTo({ request }: { request: PortalLeaveRequest }) {
  const previous = formatPortalSlotDate(request.sessionDate, request.sessionStartTime);
  const after =
    request.replDate != null
      ? formatPortalSlotDate(request.replDate, request.replStart, request.replEnd)
      : null;

  if (!after) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Previous (missed)
        </p>
        <p className="mt-1 text-sm font-medium text-slate-800">{previous}</p>
      </div>
      <ArrowRight className="mx-auto hidden h-4 w-4 text-emerald-600 sm:block" aria-hidden />
      <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
          After (make-up)
        </p>
        <p className="mt-1 text-sm font-medium text-emerald-950">{after}</p>
      </div>
    </div>
  );
}

function ReplacementDetails({ request }: { request: PortalLeaveRequest }) {
  if (request.status === 'Confirmed' && request.replDate) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Replacement scheduled
        </p>
        <p className="mt-1 font-semibold text-emerald-950">{request.className ?? 'Class'}</p>
        <div className="mt-3">
          <LeaveFromTo request={request} />
        </div>
      </div>
    );
  }

  if (!request.needsReplacement) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
      <p className="font-medium">Replacement pending</p>
      <p className="mt-1 text-amber-800/90">
        Admin will review your preferred slots and confirm a make-up class.
      </p>
      {request.replOptions && request.replOptions.length > 0 && (
        <ul className="mt-3 space-y-1.5 border-t border-amber-200/80 pt-3">
          {request.replOptions.map((slot) => (
            <li key={`${slot.date}-${slot.time}`} className="text-sm">
              Preferred: {formatDateDDMMYYYY(slot.date)} · {slot.time}
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
  const [listTab, setListTab] = useState<LeaveListTab>('pending');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

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

  const tabCounts = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0 };
    for (const r of requests) {
      counts[leaveTabForStatus(r.status)] += 1;
    }
    return counts;
  }, [requests]);

  const filteredRequests = useMemo(
    () => requests.filter((r) => leaveTabForStatus(r.status) === listTab),
    [requests, listTab]
  );

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

  const backLabel =
    step === 'session' && !isSelfStudent && children.length > 1
      ? 'Select student'
      : 'Back to requests';

  const goBack = () => {
    if (step === 'session' && !isSelfStudent && children.length > 1) {
      setStep('student');
      setSelectedEvent(null);
      return;
    }
    setStep('list');
    setSelectedChild(null);
    setSelectedEvent(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leave"
        description="Request leave for an upcoming class. We’ll review and help arrange a replacement if needed."
        actions={
          step !== 'list' ? (
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
            >
              <ChevronLeft className="h-4 w-4" />
              {backLabel}
            </button>
          ) : undefined
        }
      />

      {step === 'student' && !isSelfStudent && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
            <h2 className="text-sm font-semibold text-slate-900">Select student</h2>
          </div>
          <ul className="divide-y divide-slate-100">
            {children.map((child) => (
              <li key={child.branchName}>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChild(child);
                    void loadSessions(child);
                    setStep('session');
                  }}
                  className="flex w-full items-center justify-between px-4 py-3.5 text-left transition hover:bg-slate-50 sm:px-5"
                >
                  <span className="font-medium text-slate-900">{displayStudentName(child)}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 'session' && selectedChild && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4 sm:px-5 lg:px-6">
            <h2 className="text-base font-semibold text-slate-900">Submit leave</h2>
            <p className="text-sm text-slate-500 sm:text-right">
              Showing sessions in {currentMonthLabel()} only (at least 24 hours before class).
            </p>
          </div>

          {upcomingSessions.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState
                icon={CalendarOff}
                title="No eligible sessions"
                description={`No sessions in ${currentMonthLabel()} are available for leave. Sessions must be at least 24 hours away.`}
                compact
              />
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)}>
              <div className="grid gap-6 p-4 lg:grid-cols-2 lg:gap-8 sm:p-5 lg:p-6">
                <section className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Class session
                  </p>
                  <ul className="max-h-[min(28rem,55vh)] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                    {upcomingSessions.map((s) => {
                      const selected = selectedEvent?.id === s.id;
                      return (
                        <li key={s.id}>
                          <button
                            type="button"
                            onClick={() => pickSession(s)}
                            className={cn(
                              'grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 text-left transition sm:gap-4',
                              selected
                                ? 'bg-primary-50 ring-inset ring-1 ring-primary-200'
                                : 'hover:bg-slate-50'
                            )}
                          >
                            <span className="min-w-0 truncate text-sm font-semibold text-slate-900">
                              {s.className ?? 'Class'}
                            </span>
                            <span className="shrink-0 text-sm text-slate-600 sm:min-w-[6.5rem] sm:text-right">
                              {formatDateDayMonth(s.sessionDate)}
                            </span>
                            <span className="shrink-0 text-sm tabular-nums text-slate-600 sm:min-w-[4.25rem] sm:text-right">
                              {formatTime12h(s.startTime)}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {!selectedEvent && (
                    <p className="text-xs text-slate-500">Select a session to continue.</p>
                  )}
                </section>

                <div className="flex flex-col gap-6">
                  <section className="space-y-2">
                    <Label htmlFor="leaveReason">Reason</Label>
                    <Textarea
                      id="leaveReason"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={5}
                      placeholder="Why you need leave…"
                      required
                    />
                  </section>

                  <section className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                          Preferred make-up (optional)
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Add dates and times you can attend. Admin will pick one.
                          {replacementMinDate
                            ? ` On or after ${formatDateDDMMYYYY(replacementMinDate)}.`
                            : ' Select a session first.'}
                        </p>
                      </div>
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
                  </section>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-5">
                <Button type="button" variant="outline" onClick={() => setStep('list')}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || !selectedEvent}>
                  {submitting ? 'Submitting…' : 'Submit leave request'}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {step === 'list' && (
        <>
          {loading ? (
            <p className="py-8 text-center text-sm text-slate-500">Loading leave requests…</p>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={CalendarOff}
              title="No leave requests yet"
              description="When you cannot attend a class, submit a request and we will help arrange a replacement if needed."
              actions={[
                {
                  label: '+ New request',
                  onClick: () => startNewRequest(),
                },
              ]}
            />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <SlidingTabs
                tabs={LEAVE_TABS}
                value={listTab}
                onChange={(v) => setListTab(v as LeaveListTab)}
                labels={{
                  pending: 'Pending',
                  approved: 'Approved',
                  rejected: 'Rejected',
                }}
                counts={tabCounts}
                trailing={
                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setMenuOpen((o) => !o)}
                      disabled={loading || children.length === 0}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
                      aria-label="More actions"
                      aria-expanded={menuOpen}
                      aria-haspopup="menu"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {menuOpen && (
                      <div
                        role="menu"
                        className="absolute right-0 top-full z-20 mt-1 min-w-[10rem] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                          onClick={() => {
                            setMenuOpen(false);
                            startNewRequest();
                          }}
                        >
                          <Plus className="h-4 w-4 text-slate-400" />
                          New request
                        </button>
                      </div>
                    )}
                  </div>
                }
              />
              <div className="space-y-3 border-t border-slate-100 p-4 sm:p-5">
                {filteredRequests.length === 0 ? (
                  <EmptyState
                    icon={CalendarOff}
                    title={
                      listTab === 'pending'
                        ? 'No pending requests'
                        : listTab === 'approved'
                          ? 'No approved requests'
                          : 'No rejected requests'
                    }
                    description={
                      listTab === 'pending'
                        ? 'New leave requests awaiting review will show here.'
                        : listTab === 'approved'
                          ? 'Approved and confirmed leave will show here.'
                          : 'Rejected leave requests will show here.'
                    }
                    compact
                  />
                ) : (
                  <ul className="space-y-3">
                    {filteredRequests.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedRequest(r)}
                          className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50/80 sm:gap-4"
                        >
                          <p className="min-w-0 truncate text-sm font-semibold text-slate-900">
                            {r.className ?? 'Class'}
                          </p>
                          <span className="shrink-0 text-sm text-slate-600 sm:min-w-[6.5rem] sm:text-right">
                            {formatDateDayMonth(r.sessionDate)}
                          </span>
                          <span className="shrink-0 text-sm tabular-nums text-slate-600 sm:min-w-[4.25rem] sm:text-right">
                            {formatTime12h(r.sessionStartTime)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
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
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-600">
                {selectedRequest.branchName} ·{' '}
                {formatPortalSlotDate(
                  selectedRequest.sessionDate,
                  selectedRequest.sessionStartTime
                )}
              </p>
              <StatusBadge
                status={selectedRequest.status}
                label={portalLeaveStatusLabel(selectedRequest.status)}
              />
            </div>

            {selectedRequest.reason && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Reason
                </p>
                <p className="mt-1 text-sm text-slate-800">{selectedRequest.reason}</p>
              </div>
            )}

            {selectedRequest.adminNote && (
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Admin note
                </p>
                <p className="mt-1 text-sm text-slate-700">{selectedRequest.adminNote}</p>
              </div>
            )}

            <ReplacementDetails request={selectedRequest} />

            <div className="border-t border-slate-100 pt-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Progress
              </p>
              <LeaveWorkflowSteps
                status={selectedRequest.status}
                submitterLabel={isSelfStudent ? 'You submit' : 'Parent submits'}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
