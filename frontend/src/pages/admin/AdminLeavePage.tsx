import { useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LeaveWorkflowSteps } from '@/components/leave/LeaveWorkflowSteps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { mockUsers } from '@/utils/mockData';
import {
  adminConfirmReplacement,
  adminProposeReplacement,
  adminReviewLeave,
  ensureLeaveSeeded,
  formatSlotDate,
  leaveStatusLabel,
  loadLeaveRequests,
} from '@/utils/leaveRequestStore';
import type { LeaveRequest } from '@/types/leaveRequest';

export default function AdminLeavePage() {
  ensureLeaveSeeded();
  const [requests, setRequests] = useState<LeaveRequest[]>(() => loadLeaveRequests());
  const [filter, setFilter] = useState<'all' | 'action'>('action');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [replacementForms, setReplacementForms] = useState<
    Record<string, { teacherUserId: string; date: string; start: string; end: string }>
  >({});

  const teachers = useMemo(
    () => mockUsers.filter((u) => u.role === 'Teacher' && u.isActive),
    []
  );

  const refresh = () => setRequests(loadLeaveRequests());

  const filtered = useMemo(() => {
    if (filter === 'all') return requests;
    return requests.filter((r) =>
      ['Pending', 'ReplacementNeeded', 'TeacherCountered'].includes(r.status)
    );
  }, [requests, filter]);

  const getNote = (id: string) => notes[id] ?? '';
  const getForm = (id: string) =>
    replacementForms[id] ?? { teacherUserId: '', date: '', start: '10:00', end: '11:00' };

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

      {filtered.length === 0 ? (
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
                      <CardTitle className="text-base">{req.studentName}</CardTitle>
                      <p className="text-sm text-slate-500">
                        {req.className} · {req.courseName} · Leave{' '}
                        {formatDateDDMMYYYY(req.sessionDate)}
                      </p>
                    </div>
                    <StatusBadge status={req.status} label={leaveStatusLabel(req.status)} />
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
                        onClick={() => {
                          adminReviewLeave(req.id, 'reject', { adminNote: getNote(req.id) });
                          refresh();
                        }}
                      >
                        Reject
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          adminReviewLeave(req.id, 'approve', {
                            adminNote: getNote(req.id),
                            needsReplacement: false,
                          });
                          refresh();
                        }}
                      >
                        Approve (no replacement)
                      </Button>
                      <Button
                        type="button"
                        onClick={() => {
                          adminReviewLeave(req.id, 'approve', {
                            adminNote: getNote(req.id) || 'Approved — replacement required.',
                            needsReplacement: true,
                          });
                          refresh();
                        }}
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
                          value={form.teacherUserId}
                          onChange={(e) => setForm(req.id, { teacherUserId: e.target.value })}
                        >
                          <option value="">Select teacher…</option>
                          {teachers.map((t) => (
                            <option key={t.id} value={t.id}>
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
                          disabled={!form.teacherUserId || !form.date}
                          onClick={() => {
                            const teacher = teachers.find((t) => t.id === form.teacherUserId);
                            if (!teacher) return;
                            adminProposeReplacement(req.id, {
                              teacherUserId: teacher.id,
                              teacherName: teacher.fullName,
                              proposedDate: form.date,
                              proposedStartTime: form.start,
                              proposedEndTime: form.end,
                            });
                            refresh();
                          }}
                        >
                          Send to teacher
                        </Button>
                      </div>
                    </div>
                  )}

                  {req.status === 'AwaitingTeacher' && req.replacement && (
                    <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2 text-sm text-blue-900">
                      Waiting for {req.replacement.teacherName} — proposed{' '}
                      {formatSlotDate(
                        req.replacement.proposedDate,
                        req.replacement.proposedStartTime,
                        req.replacement.proposedEndTime
                      )}
                      {req.replacement.teacherResponse === 'Accepted' && (
                        <span className="ml-1 font-medium">· Teacher accepted</span>
                      )}
                    </div>
                  )}

                  {req.status === 'TeacherCountered' && req.replacement && (
                    <div className="space-y-3 border-t border-slate-100 pt-4">
                      <div className="rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2 text-sm">
                        <p className="font-medium text-violet-900">Teacher counter-proposal</p>
                        <p className="text-violet-800">
                          {formatSlotDate(
                            req.replacement.teacherCounterDate!,
                            req.replacement.teacherCounterStartTime!,
                            req.replacement.teacherCounterEndTime!
                          )}
                        </p>
                        {req.replacement.teacherMessage && (
                          <p className="mt-1 text-violet-700">{req.replacement.teacherMessage}</p>
                        )}
                      </div>
                      <Button type="button" onClick={() => {
                        adminConfirmReplacement(req.id);
                        refresh();
                      }}>
                        Confirm schedule & notify student
                      </Button>
                    </div>
                  )}

                  {req.status === 'AwaitingTeacher' &&
                    req.replacement?.teacherResponse === 'Accepted' && (
                      <Button type="button" onClick={() => {
                        adminConfirmReplacement(req.id);
                        refresh();
                      }}>
                        Confirm schedule & notify student
                      </Button>
                    )}

                  {req.status === 'Confirmed' && req.replacement && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900">
                      Confirmed replacement:{' '}
                      {formatSlotDate(
                        req.replacement.proposedDate,
                        req.replacement.proposedStartTime,
                        req.replacement.proposedEndTime
                      )}{' '}
                      with {req.replacement.teacherName}
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
