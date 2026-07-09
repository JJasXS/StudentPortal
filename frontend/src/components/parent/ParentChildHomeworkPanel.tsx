import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, Download, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { useToast } from '@/context/ToastContext';
import { homeworkApi, lessonNotesApi } from '@/api/resources';
import { useSqlAccountChildEnrollments } from '@/hooks/useSqlAccountChildEnrollments';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { lessonNotesForHomework } from '@/utils/homeworkLessonNotes';
import { getApiErrorMessage } from '@/utils/apiError';
import type { SqlAccountChildEnrollment } from '@/types/sqlAccount';
import type { PortalHomework } from '@/types/portal';
import type { LessonNote } from '@/types';

interface ParentChildHomeworkPanelProps {
  branchName: string;
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

export function ParentChildHomeworkPanel({ branchName }: ParentChildHomeworkPanelProps) {
  const { success: showSuccess, error: showError } = useToast();
  const { enrollments, loading: enrollmentsLoading } = useSqlAccountChildEnrollments(
    branchName,
    true
  );
  const [submissions, setSubmissions] = useState<PortalHomework[]>([]);
  const [lessonNotes, setLessonNotes] = useState<LessonNote[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [selectedClass, setSelectedClass] = useState<SqlAccountChildEnrollment | null>(null);
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      const [homework, notes] = await Promise.all([
        homeworkApi.getMine(branchName),
        lessonNotesApi.getForBranch(branchName).catch(() => []),
      ]);
      setSubmissions(homework);
      setLessonNotes(notes);
    } catch {
      setSubmissions([]);
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

  const handleSubmit = async () => {
    if (!selectedClass) return;
    setSubmitting(true);
    try {
      await homeworkApi.submit({
        docKey: selectedClass.docKey,
        seq: selectedClass.seq,
        branchName,
        url: url.trim() || undefined,
        note: note.trim() || undefined,
        file: file ?? undefined,
      });
      setUrl('');
      setNote('');
      setFile(null);
      await loadSubmissions();
      showSuccess('Homework submitted.');
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not submit homework.'));
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
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-800">
            <BookOpenCheck className="mr-1 inline h-4 w-4" />
            Submit homework for {selectedClass.className}
          </p>
          <div className="space-y-1">
            <Label>URL:</Label>
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
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Submissions & teacher feedback</h3>
        {loadingSubmissions ? (
          <p className="text-sm text-slate-500">Loading submissions…</p>
        ) : classSubmissions.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
            No homework submitted yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
            {classSubmissions.map((entry) => {
              const feedback = lessonNotesForHomework(entry, lessonNotes);
              return (
                <li key={entry.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">
                        {entry.className ?? selectedClass?.className ?? 'Homework'}
                      </p>
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
                          onClick={() => void handleDownload(entry)}
                          className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {entry.fileName || 'Download attachment'}
                        </button>
                      )}
                      {entry.note && (
                        <p className="mt-1 text-sm text-slate-600">{entry.note}</p>
                      )}
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
