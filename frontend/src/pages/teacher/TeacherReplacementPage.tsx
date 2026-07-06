import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MoreVertical, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LeaveWorkflowSteps } from '@/components/leave/LeaveWorkflowSteps';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/context/ToastContext';
import { leaveApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { formatPortalSlotDate, portalLeaveStatusLabel } from '@/utils/portalLeave';
import { getApiErrorMessage } from '@/utils/apiError';
import type { PortalLeaveRequest } from '@/types/portal';

function ReplacementActionsMenu({ onManage }: { onManage: () => void }) {
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
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen((v) => !v)}>
        <MoreVertical className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[10rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
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

export default function TeacherReplacementPage() {
  const { error: showError } = useToast();
  const [requests, setRequests] = useState<PortalLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'current' | 'past'>('current');
  const [selected, setSelected] = useState<PortalLeaveRequest | null>(null);
  const [counter, setCounter] = useState({ date: '', start: '10:00', end: '11:00', message: '' });

  const refresh = useCallback(async () => {
    try {
      const data = await leaveApi.getForTeacher();
      setRequests(data);
      if (selected) {
        const updated = data.find((r) => r.id === selected.id);
        if (updated) setSelected(updated);
      }
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not load replacement requests.'));
    }
  }, [showError, selected]);

  useEffect(() => {
    setLoading(true);
    void refresh().finally(() => setLoading(false));
  }, []);

  const current = useMemo(
    () =>
      requests.filter(
        (r) =>
          r.status === 'AwaitingTeacher' &&
          r.teacherResponse !== 'Accepted' &&
          r.teacherResponse !== 'Countered'
      ),
    [requests]
  );

  const past = useMemo(
    () => requests.filter((r) => !current.includes(r)),
    [requests, current]
  );

  const displayed = view === 'current' ? current : past;

  const openManage = (req: PortalLeaveRequest) => {
    setSelected(req);
    setCounter({ date: '', start: '10:00', end: '11:00', message: '' });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Replacement classes"
        description="Accept or suggest another time for make-up sessions."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={view === 'current' ? 'default' : 'outline'}
          onClick={() => setView('current')}
        >
          Current ({current.length})
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === 'past' ? 'default' : 'outline'}
          onClick={() => setView('past')}
        >
          Past ({past.length})
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">Loading…</p>
          ) : displayed.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-500">
              No {view === 'current' ? 'pending' : 'past'} replacement requests.
            </p>
          ) : (
            <DataTable
              embedded
              data={displayed}
              columns={[
                {
                  key: 'student',
                  header: 'Student',
                  render: (r) => r.requestedBy ?? r.branchName,
                },
                {
                  key: 'className',
                  header: 'Class',
                  render: (r) => r.className ?? '—',
                },
                {
                  key: 'sessionDate',
                  header: 'Leave date',
                  render: (r) => formatDateDDMMYYYY(r.sessionDate),
                },
                {
                  key: 'repl',
                  header: 'Proposed',
                  render: (r) =>
                    r.replDate
                      ? formatPortalSlotDate(r.replDate, r.replStart, r.replEnd)
                      : '—',
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
                  render: (r) => <ReplacementActionsMenu onManage={() => openManage(r)} />,
                },
              ]}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Replacement request"
        className="max-w-lg"
      >
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {selected.requestedBy ?? selected.branchName} · {selected.className}
            </p>
            <LeaveWorkflowSteps status={selected.status} />
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <p className="font-medium text-slate-800">Proposed slot</p>
              <p className="text-slate-600">
                {formatPortalSlotDate(selected.replDate, selected.replStart, selected.replEnd)}
              </p>
            </div>

            {view === 'current' && selected.status === 'AwaitingTeacher' && (
              <>
                <Button type="button" onClick={() => void leaveApi.accept(selected.id).then(() => refresh())}>
                  Accept
                </Button>
                <div className="border-t border-slate-100 pt-4">
                  <p className="mb-3 text-sm font-medium text-slate-700">Suggest another time</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={counter.date}
                        onChange={(e) => setCounter((c) => ({ ...c, date: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Start</Label>
                      <Input
                        type="time"
                        value={counter.start}
                        onChange={(e) => setCounter((c) => ({ ...c, start: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>End</Label>
                      <Input
                        type="time"
                        value={counter.end}
                        onChange={(e) => setCounter((c) => ({ ...c, end: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label>Message</Label>
                      <Textarea
                        rows={2}
                        value={counter.message}
                        onChange={(e) => setCounter((c) => ({ ...c, message: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3"
                    disabled={!counter.date}
                    onClick={() =>
                      void leaveApi
                        .counter(selected.id, {
                          counterDate: counter.date,
                          counterStart: counter.start,
                          counterEnd: counter.end,
                          counterMsg: counter.message.trim() || undefined,
                        })
                        .then(() => refresh())
                    }
                  >
                    Send counter-proposal
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
