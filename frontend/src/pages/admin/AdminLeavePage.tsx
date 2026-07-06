import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LeaveWorkflowSteps } from '@/components/leave/LeaveWorkflowSteps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/context/ToastContext';
import { leaveApi, teachersApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { formatPortalSlotDate, portalLeaveStatusLabel } from '@/utils/portalLeave';
import { getApiErrorMessage } from '@/utils/apiError';
import type { PortalLeaveRequest } from '@/types/portal';
import type { TeacherProfile } from '@/types';

export default function AdminLeavePage() {
  const { error: showError } = useToast();
  const [requests, setRequests] = useState<PortalLeaveRequest[]>([]);
  const [teachers, setTeachers] = useState<TeacherProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'action'>('action');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [replacementForms, setReplacementForms] = useState<
    Record<string, { replTeacher: string; date: string; start: string; end: string }>
  >({});

  const refresh = useCallback(async () => {
    try {
      const data = await leaveApi.getAll();
      setRequests(data);
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not load leave requests.'));
    }
  }, [showError]);

  useEffect(() => {
    setLoading(true);
    Promise.all([leaveApi.getAll(), teachersApi.getAll()])
      .then(([leaveData, teacherData]) => {
        setRequests(leaveData);
        setTeachers(teacherData.filter((t) => t.isActive));
      })
      .catch(() => {
        setRequests([]);
        setTeachers([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return requests;
    return requests.filter((r) =>
      ['Pending', 'ReplacementNeeded', 'TeacherCountered'].includes(r.status)
    );
  }, [requests, filter]);

  const getNote = (id: string) => notes[id] ?? '';
  const getForm = (id: string) =>
    replacementForms[id] ?? { replTeacher: '', date: '', start: '10:00', end: '11:00' };

  const setForm = (id: string, patch: Partial<(typeof replacementForms)[string]>) => {
    setReplacementForms((prev) => ({ ...prev, [id]: { ...getForm(id), ...patch } }));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave requests"
        description="Review student leave, approve or reject, and arrange replacement classes."
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

      {loading ? (
        <p className="text-sm text-slate-500">Loading leave requests…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-10 text-center text-sm text-slate-500">
            <ClipboardList className="mb-2 h-10 w-10 text-slate-300" />
            No leave requests in this view.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((req) => {
            const form = getForm(req.id);
            return (
              <Card key={req.id} className="overflow-hidden">
                <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base">{req.requestedBy ?? req.branchName}</CardTitle>
                      <p className="text-sm text-slate-500">
                        {req.className} · {req.branchName} · Leave{' '}
                        {formatDateDDMMYYYY(req.sessionDate)}
                      </p>
                    </div>
                    <StatusBadge status={req.status} label={portalLeaveStatusLabel(req.status)} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <p className="text-sm text-slate-700">{req.reason}</p>
                  <LeaveWorkflowSteps status={req.status} />

                  <Textarea
                    placeholder="Admin note (optional)…"
                    rows={2}
                    value={getNote(req.id)}
                    onChange={(e) => setNotes((n) => ({ ...n, [req.id]: e.target.value }))}
                  />

                  {req.status === 'Pending' && (
                    <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          void leaveApi
                            .review(req.id, {
                              adminNote: getNote(req.id),
                              approve: false,
                              needsReplacement: false,
                            })
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
                            .review(req.id, {
                              adminNote: getNote(req.id),
                              approve: true,
                              needsReplacement: false,
                            })
                            .then(() => refresh())
                        }
                      >
                        Approve (no replacement)
                      </Button>
                      <Button
                        type="button"
                        onClick={() =>
                          void leaveApi
                            .review(req.id, {
                              adminNote: getNote(req.id) || 'Approved — replacement required.',
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

                  {req.status === 'ReplacementNeeded' && (
                    <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label>Replacement teacher</Label>
                        <Select
                          value={form.replTeacher}
                          onChange={(e) => setForm(req.id, { replTeacher: e.target.value })}
                        >
                          <option value="">Select teacher…</option>
                          {teachers.map((t) => (
                            <option key={t.userId} value={t.fullName}>
                              {t.fullName}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Date</Label>
                        <Input
                          type="date"
                          value={form.date}
                          onChange={(e) => setForm(req.id, { date: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label>Start</Label>
                          <Input
                            type="time"
                            value={form.start}
                            onChange={(e) => setForm(req.id, { start: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>End</Label>
                          <Input
                            type="time"
                            value={form.end}
                            onChange={(e) => setForm(req.id, { end: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <Button
                          type="button"
                          disabled={!form.replTeacher || !form.date}
                          onClick={() =>
                            void leaveApi
                              .proposeReplacement(req.id, {
                                replTeacher: form.replTeacher,
                                replDate: form.date,
                                replStart: form.start,
                                replEnd: form.end,
                              })
                              .then(() => refresh())
                          }
                        >
                          Send to teacher
                        </Button>
                      </div>
                    </div>
                  )}

                  {req.status === 'AwaitingTeacher' && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-sm text-blue-900">
                      Waiting for {req.replTeacher} — proposed{' '}
                      {formatPortalSlotDate(req.replDate, req.replStart, req.replEnd)}
                      {req.teacherResponse === 'Accepted' && (
                        <span className="ml-1 font-medium">· Teacher accepted</span>
                      )}
                    </div>
                  )}

                  {req.status === 'TeacherCountered' && (
                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <div className="rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2 text-sm">
                        <p className="font-medium text-violet-900">Teacher counter-proposal</p>
                        <p className="text-violet-800">
                          {formatPortalSlotDate(
                            req.counterDate,
                            req.counterStart,
                            req.counterEnd
                          )}
                        </p>
                        {req.counterMsg && (
                          <p className="mt-1 text-violet-700">{req.counterMsg}</p>
                        )}
                      </div>
                      <Button type="button" onClick={() => void leaveApi.confirm(req.id).then(() => refresh())}>
                        Confirm schedule
                      </Button>
                    </div>
                  )}

                  {req.status === 'AwaitingTeacher' && req.teacherResponse === 'Accepted' && (
                    <Button type="button" onClick={() => void leaveApi.confirm(req.id).then(() => refresh())}>
                      Confirm schedule
                    </Button>
                  )}

                  {req.status === 'Confirmed' && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900">
                      Confirmed replacement:{' '}
                      {formatPortalSlotDate(req.replDate, req.replStart, req.replEnd)}{' '}
                      with {req.replTeacher}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
