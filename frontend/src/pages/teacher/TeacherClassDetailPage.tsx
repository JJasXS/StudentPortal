import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Download, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  assignmentsApi,
  classesApi,
  homeworkApi,
  lessonNotesApi,
} from '@/api/resources';
import { mockLessonNotes } from '@/utils/mockData';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { lessonNotesForHomework } from '@/utils/homeworkLessonNotes';
import { getApiErrorMessage } from '@/utils/apiError';
import type { ClassItem, LessonNote } from '@/types';
import type { PortalAssignment, PortalHomework } from '@/types/portal';

type ClassTab = 'notes' | 'homework';

function feedbackLabel(entry: PortalHomework, notes: LessonNote[]): string {
  const linked = lessonNotesForHomework(entry, notes);
  return linked.length > 0 ? 'Feedback complete' : 'Pending feedback';
}

export default function TeacherClassDetailPage() {
  const { classId = '' } = useParams<{ classId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') === 'homework' ? 'homework' : 'notes') as ClassTab;
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [homework, setHomework] = useState<PortalHomework[]>([]);
  const [assignments, setAssignments] = useState<PortalAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [reviewEntry, setReviewEntry] = useState<PortalHomework | null>(null);
  const [noteStudentName, setNoteStudentName] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [practiceInstructions, setPracticeInstructions] = useState('');
  const [homeworkIdForNote, setHomeworkIdForNote] = useState<string | null>(null);
  const [assignTitle, setAssignTitle] = useState('');
  const [assignInstructions, setAssignInstructions] = useState('');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const setTab = (next: ClassTab) => {
    setSearchParams(next === 'notes' ? {} : { tab: next });
  };

  const loadData = useCallback(async () => {
    if (!user?.id || !classId) return;
    setLoading(true);
    try {
      const [classes, allNotes, allHomework] = await Promise.all([
        classesApi.getAll().catch(() => []),
        lessonNotesApi.getAll().catch(() => mockLessonNotes),
        user.fullName ? homeworkApi.getAll(user.fullName).catch(() => []) : Promise.resolve([]),
      ]);
      const cls = classes.find((c) => c.id === classId) ?? null;
      setClassItem(cls);
      const className = cls?.className ?? '';
      setNotes(
        allNotes.filter(
          (n) => n.teacherUserId === user.id && n.className === className
        )
      );
      setHomework(
        allHomework.filter((h) => h.className === className || !className)
      );
      if (className) {
        const classAssignments = await assignmentsApi.getForClass(className).catch(() => []);
        setAssignments(classAssignments);
      } else {
        setAssignments([]);
      }
    } finally {
      setLoading(false);
    }
  }, [classId, user?.id, user?.fullName]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notes]
  );

  const assignmentTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of assignments) map.set(row.id, row.title);
    return map;
  }, [assignments]);

  const linkedNoteForReview = useMemo(() => {
    if (!reviewEntry) return null;
    const linked = lessonNotesForHomework(reviewEntry, notes);
    return linked[0] ?? null;
  }, [reviewEntry, notes]);

  const linkedHomeworkForNote = (note: LessonNote) =>
    note.homeworkId ? homework.find((h) => h.id === note.homeworkId) ?? null : null;

  useEffect(() => {
    if (!reviewEntry) return;
    const linked = lessonNotesForHomework(reviewEntry, notes)[0];
    if (linked) {
      setNoteTitle(linked.noteTitle);
      setNoteContent(linked.noteContent);
      setPracticeInstructions(linked.practiceInstructions ?? '');
      setHomeworkIdForNote(linked.homeworkId ?? reviewEntry.id);
    } else {
      setNoteTitle(`Feedback: ${reviewEntry.url || reviewEntry.fileName || 'homework'}`);
      setNoteContent(reviewEntry.note ? `Regarding submission: ${reviewEntry.note}\n\n` : '');
      setPracticeInstructions('');
      setHomeworkIdForNote(reviewEntry.id);
    }
    setNoteStudentName(reviewEntry.branchName || reviewEntry.submittedBy);
  }, [reviewEntry, notes]);

  const handleCreateNote = async () => {
    if (!user?.id || !classItem || !noteTitle.trim() || !noteContent.trim()) return;
    const linkedHomework = homeworkIdForNote
      ? homework.find((h) => h.id === homeworkIdForNote)
      : null;
    setSaving(true);
    try {
      const existing = homeworkIdForNote
        ? lessonNotesForHomework(
            homework.find((h) => h.id === homeworkIdForNote) ?? {
              id: homeworkIdForNote,
            } as PortalHomework,
            notes
          )[0]
        : null;

      if (existing) {
        await lessonNotesApi.update(existing.id, {
          noteTitle: noteTitle.trim(),
          noteContent: noteContent.trim(),
          practiceInstructions: practiceInstructions.trim() || undefined,
        });
      } else {
        await lessonNotesApi.create({
          teacherUserId: user.id,
          className: linkedHomework?.className ?? classItem.className,
          studentName: noteStudentName.trim() || undefined,
          noteTitle: noteTitle.trim(),
          noteContent: noteContent.trim(),
          practiceInstructions: practiceInstructions.trim() || undefined,
          homeworkId: homeworkIdForNote ?? undefined,
        });
      }

      setCreateOpen(false);
      setReviewEntry(null);
      setNoteStudentName('');
      setNoteTitle('');
      setNoteContent('');
      setPracticeInstructions('');
      setHomeworkIdForNote(null);
      const data = await lessonNotesApi.getAll();
      setNotes(data.filter((n) => n.teacherUserId === user.id && n.className === classItem.className));
      showSuccess('Lesson note saved.');
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not save lesson note.'));
    } finally {
      setSaving(false);
    }
  };

  const handleAssignHomework = async () => {
    if (!classItem || !assignTitle.trim() || !assignDueDate) return;
    setSaving(true);
    try {
      await assignmentsApi.create({
        className: classItem.className,
        title: assignTitle.trim(),
        instructions: assignInstructions.trim() || undefined,
        dueDate: assignDueDate,
      });
      setAssignOpen(false);
      setAssignTitle('');
      setAssignInstructions('');
      setAssignDueDate('');
      const classAssignments = await assignmentsApi.getForClass(classItem.className);
      setAssignments(classAssignments);
      showSuccess('Assignment created.');
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not create assignment.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSetStatus = async (status: string) => {
    if (!reviewEntry) return;
    setStatusSaving(true);
    try {
      const updated = await homeworkApi.setStatus(reviewEntry.id, status);
      setHomework((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setReviewEntry(updated);
      showSuccess(`Marked as ${status}.`);
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not update status.'));
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDownload = async (entry: PortalHomework) => {
    try {
      await homeworkApi.downloadFile(entry.id, entry.fileName);
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not download file.'));
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading class…</p>;
  }

  if (!classItem) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-600">Class not found.</p>
        <Link to="/teacher/classes" className="text-sm font-medium text-primary-600 hover:underline">
          Back to classes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        to="/teacher/classes"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        My classes
      </Link>

      <PageHeader
        title={classItem.className}
        description={`${classItem.courseName ?? 'Class'} · ${classItem.dayOfWeek} ${classItem.startTime}–${classItem.endTime}`}
        actions={
          tab === 'notes' ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New note
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={() => setAssignOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              Assign homework
            </Button>
          )
        }
      />

      <Card>
        <SlidingTabs
          tabs={['notes', 'homework'] as const}
          value={tab}
          onChange={(v) => setTab(v as ClassTab)}
          labels={{ notes: 'Lesson notes', homework: 'Homework' }}
        />
        <CardContent className="p-0">
          {tab === 'notes' && (
            <DataTable
              embedded
              data={sortedNotes}
              emptyMessage="No lesson notes for this class yet."
              columns={[
                {
                  key: 'createdAt',
                  header: 'Date',
                  render: (n) => formatDateDDMMYYYY(n.createdAt),
                },
                {
                  key: 'studentName',
                  header: 'Student',
                  render: (n) => n.studentName || '—',
                },
                {
                  key: 'noteTitle',
                  header: 'Title',
                  render: (n) => {
                    const linked = linkedHomeworkForNote(n);
                    return (
                      <div>
                        <p>{n.noteTitle}</p>
                        {linked?.note && (
                          <p className="mt-1 text-xs text-slate-500">
                            Student submission: {linked.note}
                          </p>
                        )}
                      </div>
                    );
                  },
                },
              ]}
            />
          )}

          {tab === 'homework' && (
            <div className="space-y-4 p-4">
              {assignments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-900">Assignments</h3>
                  <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                    {assignments.map((assignment) => (
                      <li
                        key={assignment.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{assignment.title}</p>
                          <p className="text-xs text-slate-500">
                            Due {formatDateDDMMYYYY(assignment.dueDate)}
                          </p>
                        </div>
                        {assignment.hasSubmission ? (
                          <StatusBadge
                            status={assignment.submissionStatus ?? 'Pending'}
                          />
                        ) : (
                          <span className="text-xs text-slate-400">No submission yet</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <DataTable
                embedded
                data={homework}
                emptyMessage="No homework submissions for this class yet."
                onRowClick={(entry) => setReviewEntry(entry)}
                columns={[
                  {
                    key: 'submittedBy',
                    header: 'Student',
                    render: (entry) => entry.submittedBy,
                  },
                  {
                    key: 'assignment',
                    header: 'Assignment',
                    render: (entry) =>
                      entry.assignmentId
                        ? assignmentTitleById.get(entry.assignmentId) ?? '—'
                        : 'Free-form',
                  },
                  {
                    key: 'status',
                    header: 'Status',
                    render: (entry) => (
                      <StatusBadge status={entry.status ?? 'Pending'} />
                    ),
                  },
                  {
                    key: 'tick',
                    header: '',
                    colWidth: '2rem',
                    render: (entry) =>
                      entry.status === 'Completed' ? (
                        <Check className="h-4 w-4 text-emerald-600" aria-label="Completed" />
                      ) : (
                        '—'
                      ),
                  },
                  {
                    key: 'feedback',
                    header: 'Feedback',
                    render: (entry) => feedbackLabel(entry, notes),
                  },
                  {
                    key: 'url',
                    header: 'URL',
                    render: (entry) =>
                      entry.url ? (
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm text-primary-600 hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Link
                        </a>
                      ) : (
                        '—'
                      ),
                  },
                  {
                    key: 'file',
                    header: 'File',
                    render: (entry) =>
                      entry.hasFile || entry.filePath ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDownload(entry);
                          }}
                          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
                        >
                          <Download className="h-3.5 w-3.5" />
                          {entry.fileName || 'Download'}
                        </button>
                      ) : (
                        '—'
                      ),
                  },
                  {
                    key: 'createdAt',
                    header: 'Submitted',
                    render: (entry) => formatDateDDMMYYYY(entry.createdAt),
                  },
                ]}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setHomeworkIdForNote(null);
        }}
        title="New lesson note"
      >
        <div className="space-y-3">
          {noteStudentName && (
            <div className="space-y-1">
              <Label>Student</Label>
              <Input value={noteStudentName} readOnly />
            </div>
          )}
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Content</Label>
            <Textarea rows={4} value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Practice instructions (optional)</Label>
            <Textarea
              rows={2}
              value={practiceInstructions}
              onChange={(e) => setPracticeInstructions(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void handleCreateNote()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        title="Assign homework"
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={assignTitle} onChange={(e) => setAssignTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Instructions</Label>
            <Textarea
              rows={3}
              value={assignInstructions}
              onChange={(e) => setAssignInstructions(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Due date</Label>
            <Input
              type="date"
              value={assignDueDate}
              onChange={(e) => setAssignDueDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving || !assignTitle.trim() || !assignDueDate}
              onClick={() => void handleAssignHomework()}
            >
              {saving ? 'Saving…' : 'Create assignment'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(reviewEntry)}
        onClose={() => setReviewEntry(null)}
        title={reviewEntry ? `Review: ${reviewEntry.submittedBy}` : 'Review submission'}
        className="max-w-2xl"
      >
        {reviewEntry && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
              <p className="font-medium text-slate-900">
                {reviewEntry.assignmentId
                  ? assignmentTitleById.get(reviewEntry.assignmentId) ?? 'Assignment'
                  : 'Free-form submission'}
              </p>
              {reviewEntry.url && (
                <a
                  href={reviewEntry.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block text-primary-600 hover:underline"
                >
                  {reviewEntry.url}
                </a>
              )}
              {(reviewEntry.hasFile || reviewEntry.filePath) && (
                <button
                  type="button"
                  onClick={() => void handleDownload(reviewEntry)}
                  className="mt-1 inline-flex items-center gap-1 text-primary-600 hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  {reviewEntry.fileName || 'Download file'}
                </button>
              )}
              {reviewEntry.note && (
                <p className="mt-2 whitespace-pre-wrap text-slate-700">{reviewEntry.note}</p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Submitted {formatDateDDMMYYYY(reviewEntry.createdAt)}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Teacher feedback</Label>
              <Input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
              <Textarea rows={4} value={noteContent} onChange={(e) => setNoteContent(e.target.value)} />
              <Textarea
                rows={2}
                value={practiceInstructions}
                onChange={(e) => setPracticeInstructions(e.target.value)}
                placeholder="Practice instructions (optional)"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={saving} onClick={() => void handleCreateNote()}>
                  {saving ? 'Saving…' : linkedNoteForReview ? 'Update feedback' : 'Save feedback'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setReviewEntry(null);
                    setTab('notes');
                  }}
                >
                  View lesson notes
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <span className="text-sm font-medium text-slate-700">Review status:</span>
              <Button
                type="button"
                size="sm"
                variant={reviewEntry.status === 'Completed' ? 'default' : 'outline'}
                disabled={statusSaving}
                onClick={() => void handleSetStatus('Completed')}
              >
                Completed
              </Button>
              <Button
                type="button"
                size="sm"
                variant={reviewEntry.status === 'Pending' ? 'default' : 'outline'}
                disabled={statusSaving}
                onClick={() => void handleSetStatus('Pending')}
              >
                Pending
              </Button>
              <Button
                type="button"
                size="sm"
                variant={reviewEntry.status === 'Rejected' ? 'default' : 'outline'}
                disabled={statusSaving}
                onClick={() => void handleSetStatus('Rejected')}
              >
                Rejected
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
