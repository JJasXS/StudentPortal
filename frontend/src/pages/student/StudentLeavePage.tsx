import { useMemo, useState, type FormEvent } from 'react';
import { CalendarOff, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LeaveWorkflowSteps } from '@/components/leave/LeaveWorkflowSteps';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { useLearnerContext } from '@/hooks/useLearnerContext';
import { mockClasses, mockEnrollments } from '@/utils/mockData';
import { resolveMockStudentUserId } from '@/utils/learnerSchedule';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import {
  ensureLeaveSeeded,
  formatSlotDate,
  getLeaveRequestsForStudent,
  leaveStatusLabel,
  loadLeaveRequests,
  submitLeaveRequest,
} from '@/utils/leaveRequestStore';
import type { LeaveRequest } from '@/types/leaveRequest';

function ReplacementDetails({ request }: { request: LeaveRequest }) {
  const rep = request.replacement;
  if (!rep) return null;

  const finalDate =
    rep.teacherResponse === 'Countered' && rep.teacherCounterDate
      ? rep.teacherCounterDate
      : rep.proposedDate;
  const finalStart =
    rep.teacherResponse === 'Countered' && rep.teacherCounterStartTime
      ? rep.teacherCounterStartTime
      : rep.proposedStartTime;
  const finalEnd =
    rep.teacherResponse === 'Countered' && rep.teacherCounterEndTime
      ? rep.teacherCounterEndTime
      : rep.proposedEndTime;

  if (request.status !== 'Confirmed') {
    return (
      <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-sm text-amber-900">
        Replacement in progress — admin and teacher are arranging a make-up class.
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
        Replacement class
      </p>
      <p className="mt-1 font-medium text-emerald-950">{request.className}</p>
      <p className="text-sm text-emerald-800">
        {formatSlotDate(finalDate, finalStart, finalEnd)}
      </p>
      <p className="mt-1 text-sm text-emerald-700">Teacher: {rep.teacherName}</p>
    </div>
  );
}

export default function StudentLeavePage() {
  const { user } = useLearnerContext();
  const studentId = useMemo(
    () => resolveMockStudentUserId(user?.email) || user?.id || '4',
    [user?.email, user?.id]
  );

  ensureLeaveSeeded();
  const [requests, setRequests] = useState<LeaveRequest[]>(() =>
    getLeaveRequestsForStudent(studentId)
  );
  const [showForm, setShowForm] = useState(false);
  const [classId, setClassId] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [reason, setReason] = useState('');

  const enrolledClasses = useMemo(() => {
    return mockEnrollments
      .filter((e) => e.studentUserId === studentId && e.status === 'Active')
      .map((e) => {
        const cls = mockClasses.find((c) => c.id === e.classId);
        return {
          classId: e.classId,
          className: e.className ?? cls?.className ?? 'Class',
          courseName: cls?.courseName ?? 'Course',
        };
      });
  }, [studentId]);

  const refresh = () => {
    loadLeaveRequests();
    setRequests(getLeaveRequestsForStudent(studentId));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const picked = enrolledClasses.find((c) => c.classId === classId);
    if (!picked || !sessionDate.trim() || !reason.trim() || !user) return;

    submitLeaveRequest({
      studentUserId: studentId,
      studentName: user.fullName,
      classId: picked.classId,
      className: picked.className,
      courseName: picked.courseName,
      sessionDate,
      reason: reason.trim(),
    });
    setClassId('');
    setSessionDate('');
    setReason('');
    setShowForm(false);
    refresh();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Leave requests"
        description="Request leave for a class session. Admin will review and arrange a replacement if needed."
        actions={
          <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New request
          </Button>
        }
      />

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Submit leave</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="leaveClass">Class</Label>
                <Select
                  id="leaveClass"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  required
                >
                  <option value="">Select class…</option>
                  {enrolledClasses.map((c) => (
                    <option key={c.classId} value={c.classId}>
                      {c.courseName} — {c.className}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="leaveDate">Session date</Label>
                <Input
                  id="leaveDate"
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="leaveReason">Reason</Label>
                <Textarea
                  id="leaveReason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Brief reason for leave…"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">Submit request</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {requests.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title="No leave requests"
          description="Submit a request when you cannot attend a class."
        />
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <Card key={req.id} className="overflow-hidden">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{req.className}</CardTitle>
                    <p className="text-sm text-slate-500">
                      {req.courseName} · Leave for {formatDateDDMMYYYY(req.sessionDate)}
                    </p>
                  </div>
                  <StatusBadge status={req.status} label={leaveStatusLabel(req.status)} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <p className="text-sm text-slate-700">{req.reason}</p>
                {req.adminNote && (
                  <p className="text-sm text-slate-500">
                    <span className="font-medium">Admin: </span>
                    {req.adminNote}
                  </p>
                )}
                {req.needsReplacement && <ReplacementDetails request={req} />}
                <LeaveWorkflowSteps status={req.status} compact />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
