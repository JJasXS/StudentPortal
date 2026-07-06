import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/context/ToastContext';
import { leaveApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { formatPortalSlotDate, portalLeaveStatusLabel } from '@/utils/portalLeave';
import { getApiErrorMessage } from '@/utils/apiError';
import type { PortalLeaveRequest } from '@/types/portal';

export default function TeacherReplacementPage() {
  const { error: showError } = useToast();
  const [requests, setRequests] = useState<PortalLeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [counterForms, setCounterForms] = useState<
    Record<string, { date: string; start: string; end: string; message: string }>
  >({});

  const refresh = useCallback(async () => {
    try {
      const data = await leaveApi.getForTeacher();
      setRequests(data);
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not load replacement requests.'));
    }
  }, [showError]);

  useEffect(() => {
    setLoading(true);
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  const pending = useMemo(
    () =>
      requests.filter(
        (r) => r.status === 'AwaitingTeacher' && r.teacherResponse !== 'Accepted' && r.teacherResponse !== 'Countered'
      ),
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
          <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : pending.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-slate-500">
            No pending replacement requests.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((req) => {
            const counter = getCounter(req.id);
            return (
              <Card key={req.id}>
                <CardHeader className="pb-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{req.requestedBy ?? req.branchName}</CardTitle>
                      <p className="text-sm text-slate-500">
                        {req.className} · Original leave{' '}
                        {formatDateDDMMYYYY(req.sessionDate)}
                      </p>
                    </div>
                    <StatusBadge status={req.status} label={portalLeaveStatusLabel(req.status)} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <p className="font-medium text-slate-800">Proposed slot</p>
                    <p className="text-slate-600">
                      {formatPortalSlotDate(req.replDate, req.replStart, req.replEnd)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => void leaveApi.accept(req.id).then(() => refresh())}>
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
                      onClick={() =>
                        void leaveApi
                          .counter(req.id, {
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {requests.filter((r) => !pending.includes(r)).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700">Recent</h2>
          {requests
            .filter((r) => !pending.includes(r))
            .map((req) => (
              <Card key={`recent-${req.id}`} className="border-slate-100 bg-slate-50/40">
                <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span>
                    {req.requestedBy ?? req.branchName} · {req.className}
                  </span>
                  <StatusBadge status={req.status} label={portalLeaveStatusLabel(req.status)} />
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
