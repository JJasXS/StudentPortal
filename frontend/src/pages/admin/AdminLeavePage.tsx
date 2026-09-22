import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, MoreVertical } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LeaveWorkflowSteps } from '@/components/leave/LeaveWorkflowSteps';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Label, Textarea, Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PortalMenu } from '@/components/ui/PortalMenu';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/context/ToastContext';
import { leaveApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { formatPortalSlotDate, portalLeaveStatusLabel } from '@/utils/portalLeave';
import { getApiErrorMessage } from '@/utils/apiError';
import type { PortalLeaveRequest } from '@/types/portal';

function leaveModalTitle(request: PortalLeaveRequest) {
  const name = request.branchName?.trim() || '';
  const email = request.requestedBy?.trim() || '';
  if (name && email && email.includes('@') && name.toLowerCase() !== email.toLowerCase()) {
    return `${name} (${email})`;
  }
  return name || email || 'Leave request';
}

function LeaveActionsMenu({ onManage }: { onManage: () => void }) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div ref={anchorRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Manage leave"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
      <PortalMenu open={open} onClose={close} anchorRef={anchorRef} minWidth={160}>
        <button
          type="button"
          role="menuitem"
          className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          onClick={() => {
            close();
            onManage();
          }}
        >
          Manage
        </button>
      </PortalMenu>
    </div>
  );
}

export default function AdminLeavePage() {
  const { error: showError } = useToast();
  const [requests, setRequests] = useState<PortalLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'action'>('action');
  const [selected, setSelected] = useState<PortalLeaveRequest | null>(null);
  const [note, setNote] = useState('');
  const [chosenSlot, setChosenSlot] = useState('');
  const [teacherReplDate, setTeacherReplDate] = useState('');
  const [teacherReplTime, setTeacherReplTime] = useState('');

  const refresh = useCallback(async () => {
    try {
      const data = await leaveApi.getAll();
      setRequests(data);
      if (selected) {
        const updated = data.find((r) => r.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not load leave requests.'));
    }
  }, [showError, selected]);

  useEffect(() => {
    setLoading(true);
    leaveApi
      .getAll()
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return requests;
    return requests.filter((r) => r.status === 'Pending');
  }, [requests, filter]);

  const openManage = (req: PortalLeaveRequest) => {
    setSelected(req);
    setNote('');
    setChosenSlot(req.replOptions?.[0] ? `${req.replOptions[0].date}|${req.replOptions[0].time}` : '');
    setTeacherReplDate('');
    setTeacherReplTime('');
  };

  const closeManage = () => setSelected(null);

  const handleDecide = async (approve: boolean, withSlot = false, teacherSlot = false) => {
    if (!selected) return;
    let chosenDate: string | undefined;
    let chosenTime: string | undefined;
    if (withSlot && teacherSlot) {
      chosenDate = teacherReplDate || undefined;
      chosenTime = teacherReplTime || undefined;
    } else if (withSlot) {
      [chosenDate, chosenTime] = chosenSlot.split('|');
    }
    try {
      await leaveApi.decide(selected.id, {
        approve,
        adminNote: note || undefined,
        chosenDate,
        chosenTime,
      });
      await refresh();
      closeManage();
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not update leave request.'));
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leave requests"
        description="Review parent and teacher leave requests; confirm replacements."
        actions={
          <div
            role="group"
            aria-label="Filter leave requests"
            className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5"
          >
            <button
              type="button"
              onClick={() => setFilter('action')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === 'action'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Needs action
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All requests
            </button>
          </div>
        }
      />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">Loading leave requests…</p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center text-sm text-slate-500">
              <ClipboardList className="mb-2 h-10 w-10 text-slate-300" />
              No leave requests in this view.
            </div>
          ) : (
            <DataTable
              embedded
              data={filtered}
              columns={[
                {
                  key: 'requester',
                  header: 'From',
                  render: (r) => (
                    <span className="text-sm text-slate-700">
                      {r.requesterType === 'Teacher' ? 'Teacher' : 'Parent'}
                    </span>
                  ),
                },
                {
                  key: 'student',
                  header: 'Requester / Student',
                  render: (r) => (
                    <div>
                      <p className="font-medium text-slate-900">{r.requestedBy ?? r.branchName}</p>
                      <p className="text-xs text-slate-500">{r.branchName}</p>
                    </div>
                  ),
                },
                {
                  key: 'className',
                  header: 'Class',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (r) => r.className ?? '',
                  className: 'min-w-0 max-w-[14rem]',
                  wrap: true,
                  render: (r) => (
                    <span className="line-clamp-2 break-words" title={r.className ?? undefined}>
                      {r.className ?? '—'}
                    </span>
                  ),
                },
                {
                  key: 'sessionDate',
                  header: 'Session on leave',
                  sortable: true,
                  sortType: 'date',
                  getSortValue: (r) => r.sessionDate,
                  colWidth: '8rem',
                  render: (r) => formatDateDDMMYYYY(r.sessionDate),
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
                  key: 'replOptions',
                  header: 'Proposed replacements',
                  className: 'min-w-0 max-w-[14rem]',
                  wrap: true,
                  render: (r) =>
                    r.replOptions && r.replOptions.length > 0 ? (
                      <ul className="space-y-0.5 text-sm text-slate-700">
                        {r.replOptions.map((slot) => (
                          <li key={`${slot.date}-${slot.time}`}>
                            {formatDateDDMMYYYY(slot.date)} · {slot.time}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-slate-400">None</span>
                    ),
                },
                {
                  key: 'actions',
                  header: '',
                  colWidth: '4.5rem',
                  sticky: 'end',
                  align: 'right',
                  render: (r) => <LeaveActionsMenu onManage={() => openManage(r)} />,
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={closeManage}
        title={selected ? leaveModalTitle(selected) : 'Leave request'}
        className="max-w-2xl"
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">
                  {selected.requesterType === 'Teacher' ? 'Teacher leave' : 'Parent leave'}:
                </span>{' '}
                {selected.className} · {formatDateDDMMYYYY(selected.sessionDate)}
              </p>
              {selected.requesterType !== 'Teacher' && selected.replOptions && selected.replOptions.length > 0 ? (
                <p className="mt-1 text-slate-600">
                  Parent proposed {selected.replOptions.length} replacement slot
                  {selected.replOptions.length === 1 ? '' : 's'} (choose one below).
                </p>
              ) : selected.requesterType !== 'Teacher' ? (
                <p className="mt-1 text-slate-600">No replacement slots proposed.</p>
              ) : (
                <p className="mt-1 text-slate-600">Admin may schedule a replacement when approving.</p>
              )}
            </div>
            <p className="text-sm text-slate-800">{selected.reason}</p>
            <LeaveWorkflowSteps status={selected.status} />

            <Textarea
              placeholder="Admin note (optional)…"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            {selected.status === 'Pending' && (
              <div className="space-y-4 border-t border-slate-100 pt-4">
                {selected.requesterType !== 'Teacher' && selected.replOptions && selected.replOptions.length > 0 && (
                  <div className="space-y-2">
                    <Label>Parent&apos;s preferred replacement slots</Label>
                    <div className="space-y-2">
                      {selected.replOptions.map((slot) => {
                        const key = `${slot.date}|${slot.time}`;
                        return (
                          <label
                            key={key}
                            className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                          >
                            <input
                              type="radio"
                              name="replacement-slot"
                              value={key}
                              checked={chosenSlot === key}
                              onChange={() => setChosenSlot(key)}
                            />
                            <span className="text-sm text-slate-800">
                              {formatDateDDMMYYYY(slot.date)} · {slot.time}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selected.requesterType === 'Teacher' && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="teacher-repl-date">Replacement date</Label>
                      <Input
                        id="teacher-repl-date"
                        type="date"
                        value={teacherReplDate}
                        onChange={(e) => setTeacherReplDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="teacher-repl-time">Replacement start time</Label>
                      <Input
                        id="teacher-repl-time"
                        type="time"
                        value={teacherReplTime}
                        onChange={(e) => setTeacherReplTime(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => void handleDecide(false)}>
                    Reject
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void handleDecide(true)}>
                    Approve (cancel session)
                  </Button>
                  {selected.requesterType !== 'Teacher' && selected.replOptions && selected.replOptions.length > 0 && (
                    <Button
                      type="button"
                      disabled={!chosenSlot}
                      onClick={() => void handleDecide(true, true)}
                    >
                      Approve &amp; schedule replacement
                    </Button>
                  )}
                  {selected.requesterType === 'Teacher' && (
                    <Button
                      type="button"
                      disabled={!teacherReplDate || !teacherReplTime}
                      onClick={() => void handleDecide(true, true, true)}
                    >
                      Approve &amp; schedule replacement
                    </Button>
                  )}
                </div>
              </div>
            )}

            {selected.status === 'Confirmed' && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900">
                Confirmed replacement:{' '}
                {formatPortalSlotDate(selected.replDate, selected.replStart, selected.replEnd)}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
