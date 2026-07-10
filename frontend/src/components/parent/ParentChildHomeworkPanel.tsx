import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Download, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/context/ToastContext';
import { assignmentsApi, homeworkApi, lessonNotesApi } from '@/api/resources';
import { useSqlAccountChildEnrollments } from '@/hooks/useSqlAccountChildEnrollments';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { lessonNotesForHomework } from '@/utils/homeworkLessonNotes';
import { getApiErrorMessage } from '@/utils/apiError';
import type { SqlAccountChildEnrollment } from '@/types/sqlAccount';
import type { PortalAssignment, PortalHomework } from '@/types/portal';
import type { LessonNote } from '@/types';

interface ParentChildHomeworkPanelProps {
  branchName: string;
}

const FEEDBACK_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

function isFeedbackWithinLastYear(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() <= FEEDBACK_MAX_AGE_MS;
}

function TeacherFeedbackCard({ note }: { note: LessonNote }) {
  return (
    <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-emerald-950">{note.noteTitle}</p>
          {note.teacherName && (
            <p className="text-xs text-emerald-800">{note.teacherName}</p>
          )}
          <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">{note.noteContent}</p>
          {note.practiceInstructions && (
            <p className="mt-1 text-sm text-emerald-800">{note.practiceInstructions}</p>
          )}
          <p className="mt-1 text-xs text-emerald-700">
            {formatDateDDMMYYYY(note.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function SubmissionDetails({
  entry,
  onDownload,
}: {
  entry: PortalHomework;
  onDownload: (entry: PortalHomework) => void;
}) {
  return (
    <div className="mt-2 space-y-1">
      {entry.url ? (
        <a
          href={entry.url}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-primary-600 hover:underline"
        >
          {entry.url}
        </a>
      ) : null}
      {(entry.hasFile || entry.filePath) && (
        <button
          type="button"
          onClick={() => onDownload(entry)}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <Download className="h-3.5 w-3.5" />
          {entry.fileName || 'Download attachment'}
        </button>
      )}
      {entry.note && <p className="text-sm text-slate-600">{entry.note}</p>}
    </div>
  );
}

export function ParentChildHomeworkPanel({ branchName }: ParentChildHomeworkPanelProps) {
  const { success: showSuccess, error: showError } = useToast();
  const { enrollments, loading: enrollmentsLoading } = useSqlAccountChildEnrollments(
    branchName,
    true
  );
  const [submissions, setSubmissions] = useState<PortalHomework[]>([]);
  const [assignments, setAssignments] = useState<PortalAssignment[]>([]);
  const [lessonNotes, setLessonNotes] = useState<LessonNote[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [selectedClass, setSelectedClass] = useState<SqlAccountChildEnrollment | null>(null);
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [assignmentForms, setAssignmentForms] = useState<
    Record<string, { url: string; note: string; file: File | null; submitting: boolean }>
  >({});

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      const [homework, assigned, notes] = await Promise.all([
        homeworkApi.getMine(branchName),
        assignmentsApi.getMine(branchName),
        lessonNotesApi.getForBranch(branchName).catch(() => []),
      ]);
      setSubmissions(homework);
      setAssignments(assigned);
      setLessonNotes(notes);
    } catch {
      setSubmissions([]);
      setAssignments([]);
      setLessonNotes([]);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [branchName]);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  const classSubmissions = useMemo(() => {
    const rows = selectedClass
      ? submissions.filter(
          (s) => s.docKey === selectedClass.docKey && s.seq === selectedClass.seq
        )
      : submissions;
    return [...rows].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [submissions, selectedClass]);

  const classAssignments = useMemo(() => {
    const rows = selectedClass
      ? assignments.filter(
          (a) =>
            a.className.toLowerCase() === selectedClass.className.toLowerCase() ||
            (a.itemCode &&
              selectedClass.itemCode &&
              a.itemCode.toLowerCase() === selectedClass.itemCode.toLowerCase())
        )
      : assignments;
    return [...rows].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }, [assignments, selectedClass]);

  const freeFormSubmissions = useMemo(
    () => classSubmissions.filter((s) => !s.assignmentId),
    [classSubmissions]
  );

  const submissionByAssignmentId = useMemo(() => {
    const map = new Map<string, PortalHomework>();
    for (const row of classSubmissions) {
      if (row.assignmentId) map.set(row.assignmentId, row);
    }
    return map;
  }, [classSubmissions]);

  const getAssignmentForm = (assignmentId: string) =>
    assignmentForms[assignmentId] ?? { url: '', note: '', file: null, submitting: false };

  const setAssignmentForm = (
    assignmentId: string,
    patch: Partial<{ url: string; note: string; file: File | null; submitting: boolean }>
  ) => {
    setAssignmentForms((prev) => ({
      ...prev,
      [assignmentId]: { ...getAssignmentForm(assignmentId), ...patch },
    }));
  };

  const handleSubmit = async (assignmentId?: string) => {
    if (!selectedClass) return;
    const form = assignmentId ? getAssignmentForm(assignmentId) : { url, note, file, submitting };
    setSubmitting(!assignmentId);
    if (assignmentId) setAssignmentForm(assignmentId, { submitting: true });
    try {
      await homeworkApi.submit({
        docKey: selectedClass.docKey,
        seq: selectedClass.seq,
        branchName,
        url: (assignmentId ? form.url : url).trim() || undefined,
        note: (assignmentId ? form.note : note).trim() || undefined,
        file: (assignmentId ? form.file : file) ?? undefined,
        assignmentId,
      });
      if (assignmentId) {
        setAssignmentForm(assignmentId, { url: '', note: '', file: null });
      } else {
        setUrl('');
        setNote('');
        setFile(null);
      }
      await loadSubmissions();
      showSuccess(assignmentId ? 'Assignment submitted.' : 'Homework submitted.');
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not submit homework.'));
    } finally {
      setSubmitting(false);
      if (assignmentId) setAssignmentForm(assignmentId, { submitting: false });
    }
  };

  const handleDownload = async (entry: PortalHomework) => {
    try {
      await homeworkApi.downloadFile(entry.id, entry.fileName);
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not download file.'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Class</Label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={selectedClass ? `${selectedClass.docKey}-${selectedClass.seq}` : ''}
            onChange={(e) => {
              const key = e.target.value;
              setSelectedClass(
                enrollments.find((en) => `${en.docKey}-${en.seq}` === key) ?? null
              );
            }}
            disabled={enrollmentsLoading}
          >
            <option value="">All classes</option>
            {enrollments.map((en) => (
              <option key={`${en.docKey}-${en.seq}`} value={`${en.docKey}-${en.seq}`}>
                {en.className}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedClass && (
        <>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Teacher assignments</h3>
            {loadingSubmissions ? (
              <p className="text-sm text-slate-500">Loading assignments…</p>
            ) : classAssignments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                No assignments for this class yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                {classAssignments.map((assignment) => {
                  const submission = submissionByAssignmentId.get(assignment.id);
                  const form = getAssignmentForm(assignment.id);
                  const feedback = submission
                    ? lessonNotesForHomework(submission, lessonNotes).filter((n) =>
                        isFeedbackWithinLastYear(n.createdAt)
                      )
                    : [];

                  return (
                    <li key={assignment.id} className="px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{assignment.title}</p>
                          <p className="text-xs text-slate-500">
                            Due {formatDateDDMMYYYY(assignment.dueDate)}
                            {assignment.createdByName ? ` · ${assignment.createdByName}` : ''}
                          </p>
                          {assignment.instructions && (
                            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">
                              {assignment.instructions}
                            </p>
                          )}
                        </div>
                        {submission?.status && (
                          <StatusBadge status={submission.status} />
                        )}
                      </div>

                      {submission ? (
                        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Your submission
                          </p>
                          <SubmissionDetails entry={submission} onDownload={handleDownload} />
                          <p className="mt-1 text-xs text-slate-400">
                            Submitted {formatDateDDMMYYYY(submission.createdAt)}
                          </p>
                          {feedback.length > 0 ? (
                            feedback.map((teacherNote) => (
                              <TeacherFeedbackCard key={teacherNote.id} note={teacherNote} />
                            ))
                          ) : (
                            <p className="mt-2 text-xs text-slate-400">Pending teacher feedback.</p>
                          )}
                        </div>
                      ) : (
                        <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                          <p className="text-sm font-medium text-slate-800">Submit assignment</p>
                          <div className="space-y-1">
                            <Label>URL</Label>
                            <Input
                              type="url"
                              value={form.url}
                              onChange={(e) =>
                                setAssignmentForm(assignment.id, { url: e.target.value })
                              }
                              placeholder="https://…"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Attachment (optional)</Label>
                            <Input
                              type="file"
                              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip,.mp3,.mp4"
                              onChange={(e) =>
                                setAssignmentForm(assignment.id, {
                                  file: e.target.files?.[0] ?? null,
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Note</Label>
                            <Textarea
                              rows={2}
                              value={form.note}
                              onChange={(e) =>
                                setAssignmentForm(assignment.id, { note: e.target.value })
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            disabled={form.submitting}
                            onClick={() => void handleSubmit(assignment.id)}
                          >
                            {form.submitting ? 'Submitting…' : 'Submit'}
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
            <p className="text-sm font-medium text-slate-800">
              <BookOpenCheck className="mr-1 inline h-4 w-4" />
              Optional free-form submission for {selectedClass.className}
            </p>
            <div className="space-y-1">
              <Label>URL</Label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-1">
              <Label>Attachment (optional)</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip,.mp3,.mp4"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              {file && <p className="text-xs text-slate-500">Selected: {file.name}</p>}
            </div>
            <div className="space-y-1">
              <Label>Note</Label>
              <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <Button type="button" disabled={submitting} onClick={() => void handleSubmit()}>
              {submitting ? 'Submitting…' : 'Submit'}
            </Button>
          </div>
        </>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Submissions & teacher feedback</h3>
        {loadingSubmissions ? (
          <p className="text-sm text-slate-500">Loading submissions…</p>
        ) : freeFormSubmissions.length === 0 && !selectedClass ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
            Select a class to view assignments and submit work.
          </p>
        ) : freeFormSubmissions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
            No free-form submissions yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {freeFormSubmissions.map((entry) => {
              const feedback = lessonNotesForHomework(entry, lessonNotes).filter((n) =>
                isFeedbackWithinLastYear(n.createdAt)
              );
              return (
                <li key={entry.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-900">
                          {entry.className ?? selectedClass?.className ?? 'Homework'}
                        </p>
                        {entry.status && <StatusBadge status={entry.status} />}
                      </div>
                      <SubmissionDetails entry={entry} onDownload={handleDownload} />
                    </div>
                    <time className="shrink-0 text-xs text-slate-400">
                      {formatDateDDMMYYYY(entry.createdAt)}
                    </time>
                  </div>

                  {feedback.length > 0 ? (
                    feedback.map((teacherNote) => (
                      <TeacherFeedbackCard key={teacherNote.id} note={teacherNote} />
                    ))
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">
                      No teacher feedback yet for this submission.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
