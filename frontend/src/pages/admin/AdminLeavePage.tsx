import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, MoreVertical } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LeaveWorkflowSteps } from '@/components/leave/LeaveWorkflowSteps';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/context/ToastContext';
import { leaveApi, teachersApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { formatPortalSlotDate, portalLeaveStatusLabel } from '@/utils/portalLeave';
import { getApiErrorMessage } from '@/utils/apiError';
import type { PortalLeaveRequest } from '@/types/portal';
import type { SqlAccountCalendarTeacher } from '@/types/sqlAccount';

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
  const [erpTeachers, setErpTeachers] = useState<SqlAccountCalendarTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'action'>('action');
  const [selected, setSelected] = useState<PortalLeaveRequest | null>(null);
  const [note, setNote] = useState('');
  const [replForm, setReplForm] = useState({
    replTeacher: '',
    date: '',
    start: '10:00',
    end: '11:00',
  });

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
    Promise.all([leaveApi.getAll(), teachersApi.getCalendarFilter()])
      .then(([leaveData, teacherData]) => {
        setRequests(leaveData);
        setErpTeachers(teacherData);
      })
      .catch(() => {
        setRequests([]);
        setErpTeachers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return requests;
    return requests.filter((r) =>
      ['Pending', 'ReplacementNeeded', 'TeacherCountered'].includes(r.status)
    );
  }, [requests, filter]);

  const openManage = (req: PortalLeaveRequest) => {
    setSelected(req);
    setNote('');
    setReplForm({
      replTeacher: req.replTeacher ?? '',
      date: req.replDate?.slice(0, 10) ?? '',
      start: req.replStart ?? '10:00',
      end: req.replEnd ?? '11:00',
    });
  };

  const closeManage = () => setSelected(null);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leave requests"
        description="Review leave and arrange replacements."
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
                  header: 'Leave date',
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
                  key: 'replTeacher',
                  header: 'Replacement',
                  render: (r) => r.replTeacher ?? '—',
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
            <p className="text-sm text-slate-600">
              {selected.className} · {formatDateDDMMYYYY(selected.sessionDate)}
            </p>
            <p className="text-sm text-slate-800">{selected.reason}</p>
            <LeaveWorkflowSteps status={selected.status} />

            <Textarea
              placeholder="Admin note (optional)…"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            {selected.status === 'Pending' && (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void leaveApi
                      .review(selected.id, { adminNote: note, approve: false, needsReplacement: false })
                      .then(() => refresh())
                  }
                >
                  Reject
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    void leaveApi
                      .review(selected.id, { adminNote: note, approve: true, needsReplacement: false })
                      .then(() => refresh())
                  }
                >
                  Approve (no replacement)
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    void leaveApi
                      .review(selected.id, {
                        adminNote: note || 'Approved — replacement required.',
                        approve: true,
                        needsReplacement: true,
                      })
                      .then(() => refresh())
                  }
                >
                  Approve + replacement
                </Button>
              </div>
            )}

            {selected.status === 'ReplacementNeeded' && (
              <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Replacement teacher</Label>
                  <Select
                    value={replForm.replTeacher}
                    onChange={(e) => setReplForm((f) => ({ ...f, replTeacher: e.target.value }))}
                  >
                    <option value="">Select teacher…</option>
                    {erpTeachers.map((t) => (
                      <option key={t.erpUserId} value={t.fullName} disabled={!t.portalUserId}>
                        {t.fullName}
                        {!t.portalUserId ? ' (no portal login)' : ''}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={replForm.date}
                    onChange={(e) => setReplForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label>Start</Label>
                    <Input
                      type="time"
                      value={replForm.start}
                      onChange={(e) => setReplForm((f) => ({ ...f, start: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>End</Label>
                    <Input
                      type="time"
                      value={replForm.end}
                      onChange={(e) => setReplForm((f) => ({ ...f, end: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <Button
                    type="button"
                    disabled={!replForm.replTeacher || !replForm.date}
                    onClick={() =>
                      void leaveApi
                        .proposeReplacement(selected.id, {
                          replTeacher: replForm.replTeacher,
                          replDate: replForm.date,
                          replStart: replForm.start,
                          replEnd: replForm.end,
                        })
                        .then(() => refresh())
                    }
                  >
                    Send to teacher
                  </Button>
                </div>
              </div>
            )}

            {selected.status === 'AwaitingTeacher' && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-sm text-blue-900">
                Waiting for {selected.replTeacher} — proposed{' '}
                {formatPortalSlotDate(selected.replDate, selected.replStart, selected.replEnd)}
                {selected.teacherResponse === 'Accepted' && (
                  <span className="ml-1 font-medium">· Teacher accepted</span>
                )}
              </div>
            )}

            {selected.status === 'TeacherCountered' && (
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2 text-sm">
                  <p className="font-medium text-violet-900">Teacher counter-proposal</p>
                  <p className="text-violet-800">
                    {formatPortalSlotDate(
                      selected.counterDate,
                      selected.counterStart,
                      selected.counterEnd
                    )}
                  </p>
                  {selected.counterMsg && (
                    <p className="mt-1 text-violet-700">{selected.counterMsg}</p>
                  )}
                </div>
                <Button type="button" onClick={() => void leaveApi.confirm(selected.id).then(() => refresh())}>
                  Confirm schedule
                </Button>
              </div>
            )}

            {selected.status === 'AwaitingTeacher' && selected.teacherResponse === 'Accepted' && (
              <Button type="button" onClick={() => void leaveApi.confirm(selected.id).then(() => refresh())}>
                Confirm schedule
              </Button>
            )}

            {selected.status === 'Confirmed' && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900">
                Confirmed replacement:{' '}
                {formatPortalSlotDate(selected.replDate, selected.replStart, selected.replEnd)} with{' '}
                {selected.replTeacher}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
