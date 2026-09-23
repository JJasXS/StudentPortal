import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, MessageSquareText } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { YourWorkCard } from '@/components/student/YourWorkCard';
import {
  NoTeacherFeedbackYet,
  TeacherFeedbackCard,
} from '@/components/student/TeacherFeedbackCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { useSqlAccountStudent } from '@/hooks/useSqlAccountStudent';
import { useSqlAccountChildEnrollments } from '@/hooks/useSqlAccountChildEnrollments';
import { assignmentsApi, homeworkApi, lessonNotesApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { lessonNotesForHomework } from '@/utils/homeworkLessonNotes';
import { getApiErrorMessage } from '@/utils/apiError';
import { filterAssignmentsForEnrollment } from '@/utils/studentLearning';
import type { PortalAssignment, PortalHomework } from '@/types/portal';
import type { LessonNote } from '@/types';

const FEEDBACK_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

function isRecent(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() <= FEEDBACK_MAX_AGE_MS;
}

export default function StudentAssignmentDetailPage() {
  const { assignmentId = '' } = useParams<{ assignmentId: string }>();
  const { success: showSuccess, error: showError } = useToast();
  const { student, loading: studentLoading } = useSqlAccountStudent(true);
  const { enrollments } = useSqlAccountChildEnrollments(
    student?.branchName ?? null,
    Boolean(student?.branchName)
  );

  const [assignment, setAssignment] = useState<PortalAssignment | null>(null);
  const [submission, setSubmission] = useState<PortalHomework | null>(null);
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!student?.branchName || !assignmentId) return;
    setLoading(true);
    try {
      const decoded = decodeURIComponent(assignmentId);
      const [asg, hw, lessonNotes] = await Promise.all([
        assignmentsApi.getMine(student.branchName),
        homeworkApi.getMine(student.branchName),
        lessonNotesApi.getForBranch(student.branchName).catch(() => []),
      ]);
      const found = asg.find((a) => a.id === decoded) ?? null;
      setAssignment(found);
      const sub =
        hw.find((h) => h.assignmentId === decoded) ??
        (found?.submissionId ? hw.find((h) => h.id === found.submissionId) : null) ??
        null;
      setSubmission(sub);
      setNotes(lessonNotes);
    } catch {
      setAssignment(null);
      setSubmission(null);
    } finally {
      setLoading(false);
    }
  }, [assignmentId, student?.branchName]);

  useEffect(() => {
    void load();
  }, [load]);

  const enrollment = useMemo(() => {
    if (!assignment) return null;
    return (
      enrollments.find(
        (e) =>
          filterAssignmentsForEnrollment([assignment], e).length > 0 ||
          e.className.toLowerCase() === assignment.className.toLowerCase()
      ) ?? null
    );
  }, [assignment, enrollments]);

  const feedback = useMemo(() => {
    if (!submission) return [];
    return lessonNotesForHomework(submission, notes).filter((n) => isRecent(n.createdAt));
  }, [submission, notes]);

  const handleSubmit = async (payload: { url?: string; note?: string; file?: File }) => {
    if (!student?.branchName || !assignment || !enrollment) {
      showError('Select a class enrollment to submit.');
      return;
    }
    setSubmitting(true);
    try {
      await homeworkApi.submit({
        docKey: enrollment.docKey,
        seq: enrollment.seq,
        branchName: student.branchName,
        url: payload.url,
        note: payload.note,
        file: payload.file,
        assignmentId: assignment.id,
      });
      showSuccess('Assignment turned in.');
      await load();
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not submit assignment.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (entry: PortalHomework) => {
    try {
      await homeworkApi.downloadFile(entry.id, entry.fileName);
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not download file.'));
    }
  };

  if (studentLoading || loading) {
    return <p className="text-sm text-slate-500">Loading assignment…</p>;
  }

  if (!assignment) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="Assignment not found"
        description="This assignment may have been removed or is not available for your account."
        actions={[{ label: 'Back to To Do', href: '/student/todo' }]}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Link
        to="/student/todo"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800"
      >
        <ArrowLeft className="h-4 w-4" />
        To Do
      </Link>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(16rem,3fr)] lg:items-start">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{assignment.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {assignment.className}
              {assignment.createdByName ? ` · Assigned by ${assignment.createdByName}` : ''}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-700">
              Due: {formatDateDDMMYYYY(assignment.dueDate)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Assigned {formatDateDDMMYYYY(assignment.createdAt)}
            </p>
          </div>

          {assignment.instructions ? (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Instructions
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {assignment.instructions}
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No additional instructions.</p>
          )}

          <div>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Teacher feedback
            </h2>
            {feedback.length > 0 ? (
              <div className="space-y-2">
                {feedback.map((n) => (
                  <TeacherFeedbackCard key={n.id} note={n} />
                ))}
              </div>
            ) : (
              <NoTeacherFeedbackYet />
            )}
          </div>
        </div>

        <YourWorkCard
          assignment={assignment}
          submission={submission}
          submitting={submitting}
          onSubmit={handleSubmit}
          onDownload={(e) => void handleDownload(e)}
        />
      </div>
    </div>
  );
}
