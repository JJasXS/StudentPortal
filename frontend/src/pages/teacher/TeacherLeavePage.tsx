import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type RefObject } from 'react';
import { CalendarOff, ChevronLeft, MoreVertical, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { LeaveWorkflowSteps } from '@/components/leave/LeaveWorkflowSteps';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Label, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { useToast } from '@/context/ToastContext';
import { calendarApi, leaveApi } from '@/api/resources';
import { formatDateDayMonth, formatTime12h } from '@/utils/dateFormat';
import {
  formatPortalSlotDate,
  isLeaveSessionEligible,
  portalLeaveStatusLabel,
} from '@/utils/portalLeave';
import { getApiErrorMessage } from '@/utils/apiError';
import { cn } from '@/utils/cn';
import type { ErpCalendarEvent } from '@/types/sqlAccount';
import type { PortalLeaveRequest } from '@/types/portal';

type View = 'list' | 'form';
type LeaveListTab = 'pending' | 'approved' | 'rejected';

const LEAVE_TABS = ['pending', 'approved', 'rejected'] as const;

function leaveTabForStatus(status: string): LeaveListTab {
  if (status === 'Rejected') return 'rejected';
  if (status === 'Approved' || status === 'Confirmed') return 'approved';
  return 'pending';
}

function currentMonthLabel() {
  return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function TeacherLeavePage() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [view, setView] = useState<View>('list');
  const [events, setEvents] = useState<ErpCalendarEvent[]>([]);
  const [requests, setRequests] = useState<PortalLeaveRequest[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ErpCalendarEvent | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PortalLeaveRequest | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

  const tabCounts = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0 };
    for (const r of requests) counts[leaveTabForStatus(r.status)] += 1;
    return counts;
  }, [requests]);

  const filteredRequests = useMemo(
    () => requests.filter((r) => leaveTabForStatus(r.status) === listTab),
    [requests, listTab]
  );

  const startNewRequest = () => {
    setSelectedEvent(null);
    setReason('');
    setView('form');
  };

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
      setListTab('pending');
      setView('list');
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

      {view === 'form' ? (
        <TeacherLeaveForm
          loading={loading}
          sessions={upcomingSessions}
          selectedEvent={selectedEvent}
          reason={reason}
          submitting={submitting}
          onSelect={setSelectedEvent}
          onReasonChange={setReason}
          onCancel={() => setView('list')}
          onSubmit={(e) => void handleSubmit(e)}
        />
      ) : (
        <TeacherLeaveList
          loading={loading}
          requests={requests}
          filtered={filteredRequests}
          listTab={listTab}
          tabCounts={tabCounts}
          menuOpen={menuOpen}
          menuRef={menuRef}
          onTabChange={setListTab}
          onMenuToggle={() => setMenuOpen((o) => !o)}
          onNewRequest={() => {
            setMenuOpen(false);
            startNewRequest();
          }}
          onOpenRequest={setSelectedRequest}
        />
      )}

      <TeacherLeaveDetailModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  );
}

function TeacherLeaveForm({
  loading,
  sessions,
  selectedEvent,
  reason,
  submitting,
  onSelect,
  onReasonChange,
  onCancel,
  onSubmit,
}: {
  loading: boolean;
  sessions: ErpCalendarEvent[];
  selectedEvent: ErpCalendarEvent | null;
  reason: string;
  submitting: boolean;
  onSelect: (event: ErpCalendarEvent) => void;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          aria-label="Back to leave requests"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-base font-semibold text-slate-900">New leave request</h2>
          <p className="text-xs text-slate-500">
            Choose a {currentMonthLabel()} session at least 24 hours away.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="px-4 py-10 text-center text-sm text-slate-500 sm:px-5">Loading sessions…</p>
      ) : sessions.length === 0 ? (
        <div className="p-4 sm:p-5">
          <EmptyState
            icon={CalendarOff}
            title="No eligible sessions"
            description="Sessions must be in the current month and at least 24 hours away."
            actions={[{ label: 'Back', onClick: onCancel }]}
          />
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <div className="grid items-start gap-6 p-4 sm:p-5 lg:grid-cols-2">
            <section className="flex min-h-0 flex-col gap-3">
              <div className="min-h-[2.75rem]">
                <Label>Upcoming sessions</Label>
                <p className="mt-1 text-xs text-slate-500">
                  {sessions.length} eligible session{sessions.length === 1 ? '' : 's'}
                </p>
              </div>
              <ul className="max-h-[22rem] min-h-[14rem] flex-1 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
                {sessions.map((s) => {
                  const selected = selectedEvent?.id === s.id;
                  const student = s.studentName ?? s.branchName;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(s)}
                        className={cn(
                          'grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 text-left transition sm:gap-4',
                          selected
                            ? 'bg-primary-50 ring-1 ring-inset ring-primary-200'
                            : 'hover:bg-slate-50'
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-slate-900">
                            {s.className ?? 'Class'}
                          </span>
                          {student && (
                            <span className="mt-0.5 block truncate text-xs text-slate-500">
                              {student}
                            </span>
                          )}
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

            <section className="flex min-h-0 flex-col gap-3">
              <div className="min-h-[2.75rem]">
                <Label htmlFor="leaveReason">Reason</Label>
                <p className="mt-1 text-xs text-slate-500">Why you need leave for this class</p>
              </div>
              <Textarea
                id="leaveReason"
                value={reason}
                onChange={(e) => onReasonChange(e.target.value)}
                className="min-h-[14rem] flex-1 resize-y lg:min-h-[22rem]"
                placeholder="Why you need leave…"
                required
              />
              {selectedEvent && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Submitting for{' '}
                  <span className="font-medium text-slate-800">
                    {selectedEvent.className ?? 'Class'}
                  </span>{' '}
                  on {formatDateDayMonth(selectedEvent.sessionDate)}{' '}
                  {formatTime12h(selectedEvent.startTime)}
                </p>
              )}
            </section>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:px-5">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !selectedEvent || !reason.trim()}>
              {submitting ? 'Submitting…' : 'Submit leave request'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function TeacherLeaveList({
  loading,
  requests,
  filtered,
  listTab,
  tabCounts,
  menuOpen,
  menuRef,
  onTabChange,
  onMenuToggle,
  onNewRequest,
  onOpenRequest,
}: {
  loading: boolean;
  requests: PortalLeaveRequest[];
  filtered: PortalLeaveRequest[];
  listTab: LeaveListTab;
  tabCounts: Record<LeaveListTab, number>;
  menuOpen: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  onTabChange: (tab: LeaveListTab) => void;
  onMenuToggle: () => void;
  onNewRequest: () => void;
  onOpenRequest: (request: PortalLeaveRequest) => void;
}) {
  if (loading) {
    return <p className="py-8 text-center text-sm text-slate-500">Loading leave requests…</p>;
  }

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={CalendarOff}
        title="No leave requests yet"
        description="When you cannot teach a class, submit a request so admin can notify students and arrange cover."
        actions={[{ label: '+ New request', onClick: onNewRequest }]}
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <SlidingTabs
        tabs={LEAVE_TABS}
        value={listTab}
        onChange={(v) => onTabChange(v as LeaveListTab)}
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
              onClick={onMenuToggle}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
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
                  onClick={onNewRequest}
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
        {filtered.length === 0 ? (
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
            {filtered.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onOpenRequest(r)}
                  className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50/80 sm:gap-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {r.className ?? 'Class'}
                    </p>
                    {r.branchName && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">{r.branchName}</p>
                    )}
                  </div>
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
  );
}

function TeacherLeaveDetailModal({
  request,
  onClose,
}: {
  request: PortalLeaveRequest | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={Boolean(request)}
      onClose={onClose}
      title={request?.className ?? 'Leave request'}
      className="max-w-lg"
    >
      {request && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">
              {[request.branchName, formatPortalSlotDate(request.sessionDate, request.sessionStartTime)]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <StatusBadge
              status={request.status}
              label={portalLeaveStatusLabel(request.status)}
            />
          </div>

          {request.reason && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Reason
              </p>
              <p className="mt-1 text-sm text-slate-800">{request.reason}</p>
            </div>
          )}

          {request.adminNote && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                Admin note
              </p>
              <p className="mt-1 text-sm text-slate-700">{request.adminNote}</p>
            </div>
          )}

          {request.status === 'Confirmed' && request.replDate && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Replacement scheduled
              </p>
              <p className="mt-1 text-sm font-medium text-emerald-950">
                {formatPortalSlotDate(request.replDate, request.replStart, request.replEnd)}
              </p>
            </div>
          )}

          <div className="border-t border-slate-100 pt-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Progress
            </p>
            <LeaveWorkflowSteps status={request.status} submitterLabel="You submit" />
          </div>
        </div>
      )}
    </Modal>
  );
}
