import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import {
  ensureLeaveSeeded,
  formatSlotDate,
  getReplacementRequestsForTeacher,
  leaveStatusLabel,
  loadLeaveRequests,
  teacherAcceptReplacement,
  teacherCounterReplacement,
} from '@/utils/leaveRequestStore';
import type { LeaveRequest } from '@/types/leaveRequest';

export default function TeacherReplacementPage() {
  const { user } = useAuth();
  ensureLeaveSeeded();

  const [requests, setRequests] = useState<LeaveRequest[]>(() =>
    user ? getReplacementRequestsForTeacher(user.id) : []
  );
  const [counterForms, setCounterForms] = useState<
    Record<string, { date: string; start: string; end: string; message: string }>
  >({});

  const refresh = () => {
    if (!user) return;
    setRequests(getReplacementRequestsForTeacher(user.id));
    loadLeaveRequests();
  };

  const pending = useMemo(
    () => requests.filter((r) => r.status === 'AwaitingTeacher' && r.replacement?.teacherResponse === 'Pending'),
    [requests]
  );

  const getCounter = (id: string) =>
    counterForms[id] ?? { date: '', start: '10:00', end: '11:00', message: '' };

  const setCounter = (id: string, patch: Partial<(typeof counterForms)[string]>) => {
    setCounterForms((prev) => ({ ...prev, [id]: { ...getCounter(id), ...patch } }));
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Replacement classes"
        description="Accept or suggest another time for make-up sessions."
        actions={
          <Button type="button" variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {pending.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            No pending replacement requests.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((req) => {
            const rep = req.replacement!;
            const counter = getCounter(req.id);
            return (
              <Card key={req.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{req.studentName}</CardTitle>
                      <p className="text-sm text-slate-500">
                        {req.className} · Original leave{' '}
                        {formatDateDDMMYYYY(req.sessionDate)}
                      </p>
                    </div>
                    <StatusBadge status={req.status} label={leaveStatusLabel(req.status)} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-medium text-slate-800">Proposed slot</p>
                    <p className="text-slate-600">
                      {formatSlotDate(rep.proposedDate, rep.proposedStartTime, rep.proposedEndTime)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => {
                      teacherAcceptReplacement(req.id);
                      refresh();
                    }}>
                      Accept
                    </Button>
                  </div>

                  <div className="border-t border-slate-100 pt-4">
                    <p className="mb-3 text-sm font-medium text-slate-700">Suggest another time</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={counter.date}
                          onChange={(e) => setCounter(req.id, { date: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Start</Label>
                        <Input
                          type="time"
                          value={counter.start}
                          onChange={(e) => setCounter(req.id, { start: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label>End</Label>
                        <Input
                          type="time"
                          value={counter.end}
                          onChange={(e) => setCounter(req.id, { end: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Message</Label>
                        <Textarea
                          rows={2}
                          placeholder="Optional note to admin…"
                          value={counter.message}
                          onChange={(e) => setCounter(req.id, { message: e.target.value })}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3"
                      disabled={!counter.date}
                      onClick={() => {
                        teacherCounterReplacement(req.id, {
                          teacherCounterDate: counter.date,
                          teacherCounterStartTime: counter.start,
                          teacherCounterEndTime: counter.end,
                          teacherMessage: counter.message.trim() || undefined,
                        });
                        refresh();
                      }}
                    >
                      Send counter-proposal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {requests.filter((r) => r.status !== 'AwaitingTeacher' || r.replacement?.teacherResponse !== 'Pending').length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Recent</h2>
          {requests
            .filter((r) => r.status !== 'AwaitingTeacher' || r.replacement?.teacherResponse !== 'Pending')
            .map((req) => (
              <Card key={`recent-${req.id}`} className="border-slate-100 bg-slate-50/40">
                <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span>
                    {req.studentName} · {req.className}
                  </span>
                  <StatusBadge status={req.status} label={leaveStatusLabel(req.status)} />
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
