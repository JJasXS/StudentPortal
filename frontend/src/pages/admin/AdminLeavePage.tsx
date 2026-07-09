import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, MoreVertical } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LeaveWorkflowSteps } from '@/components/leave/LeaveWorkflowSteps';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Label, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/context/ToastContext';
import { leaveApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { formatPortalSlotDate, portalLeaveStatusLabel } from '@/utils/portalLeave';
import { getApiErrorMessage } from '@/utils/apiError';
import type { PortalLeaveRequest } from '@/types/portal';

function LeaveActionsMenu({ onManage }: { onManage: () => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <Button type="button" variant="ghost" size="sm" aria-label="Manage leave" onClick={() => setOpen((v) => !v)}>
        <MoreVertical className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              onManage();
            }}
          >
            Manage
          </button>
        </div>
      )}
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
  };

  const closeManage = () => setSelected(null);

  const handleDecide = async (approve: boolean, withSlot = false) => {
    if (!selected) return;
    const [chosenDate, chosenTime] = withSlot ? chosenSlot.split('|') : [undefined, undefined];
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
        description="Review leave and confirm replacement slots proposed by parents."
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant={filter === 'action' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('action')}
        >
          Needs action
        </Button>
        <Button
          type="button"
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
        >
          All requests
        </Button>
      </div>

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
                  key: 'student',
                  header: 'Student',
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
                  className: 'max-w-[14rem] whitespace-normal',
                  render: (r) => r.className ?? '—',
                },
                {
                  key: 'sessionDate',
                  header: 'Session on leave',
                  sortable: true,
                  sortType: 'date',
                  getSortValue: (r) => r.sessionDate,
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
                  key: 'replOptions',
                  header: 'Proposed replacements',
                  className: 'max-w-[14rem] whitespace-normal',
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
        title={selected ? `${selected.requestedBy ?? selected.branchName} — leave` : 'Leave request'}
        className="max-w-2xl"
      >
        {selected && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <p>
                <span className="font-medium text-slate-900">Session on leave:</span>{' '}
                {selected.className} · {formatDateDDMMYYYY(selected.sessionDate)}
              </p>
              {selected.replOptions && selected.replOptions.length > 0 ? (
                <p className="mt-1 text-slate-600">
                  Parent proposed {selected.replOptions.length} replacement slot
                  {selected.replOptions.length === 1 ? '' : 's'} (choose one below).
                </p>
              ) : (
                <p className="mt-1 text-slate-600">No replacement slots proposed.</p>
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
                {selected.replOptions && selected.replOptions.length > 0 && (
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

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => void handleDecide(false)}>
                    Reject
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void handleDecide(true)}>
                    Approve (cancel session)
                  </Button>
                  {selected.replOptions && selected.replOptions.length > 0 && (
                    <Button
                      type="button"
                      disabled={!chosenSlot}
                      onClick={() => void handleDecide(true, true)}
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
