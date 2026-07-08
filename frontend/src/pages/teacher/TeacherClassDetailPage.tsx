import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Plus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { classesApi, homeworkApi, lessonNotesApi } from '@/api/resources';
import { mockLessonNotes } from '@/utils/mockData';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { getApiErrorMessage } from '@/utils/apiError';
import { accountInitials } from '@/utils/accountDisplay';
import type { ClassItem, LessonNote } from '@/types';
import type { PortalHomework } from '@/types/portal';

type ClassTab = 'notes' | 'homework';

export default function TeacherClassDetailPage() {
  const { classId = '' } = useParams<{ classId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') === 'homework' ? 'homework' : 'notes') as ClassTab;
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [homework, setHomework] = useState<PortalHomework[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [practiceInstructions, setPracticeInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  const setTab = (next: ClassTab) => {
    setSearchParams(next === 'notes' ? {} : { tab: next });
  };

  useEffect(() => {
    if (!user?.id || !classId) return;
    setLoading(true);
    Promise.all([
      classesApi.getAll().catch(() => []),
      lessonNotesApi.getAll().catch(() => mockLessonNotes),
      user.fullName ? homeworkApi.getAll(user.fullName).catch(() => []) : Promise.resolve([]),
    ])
      .then(([classes, allNotes, allHomework]) => {
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
      })
      .finally(() => setLoading(false));
  }, [classId, user?.id, user?.fullName]);

  const sortedNotes = useMemo(
    () => [...notes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [notes]
  );

  const handleCreateNote = async () => {
    if (!user?.id || !classItem || !noteTitle.trim() || !noteContent.trim()) return;
    setSaving(true);
    try {
      await lessonNotesApi.create({
        teacherUserId: user.id,
        className: classItem.className,
        noteTitle: noteTitle.trim(),
        noteContent: noteContent.trim(),
        practiceInstructions: practiceInstructions.trim() || undefined,
      });
      setCreateOpen(false);
      setNoteTitle('');
      setNoteContent('');
      setPracticeInstructions('');
      const data = await lessonNotesApi.getAll();
      setNotes(data.filter((n) => n.teacherUserId === user.id && n.className === classItem.className));
      showSuccess('Lesson note created.');
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not create lesson note.'));
    } finally {
      setSaving(false);
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
          ) : undefined
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
                  render: (n) => n.noteTitle,
                },
              ]}
            />
          )}

          {tab === 'homework' && (
            homework.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                No homework submissions for this class yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {homework.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                      {accountInitials(entry.submittedBy)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900">{entry.submittedBy}</p>
                      <p className="text-sm text-slate-600">{entry.title || entry.fileName || 'Homework'}</p>
                      <p className="text-xs text-slate-400">{formatDateDDMMYYYY(entry.createdAt)}</p>
                    </div>
                    {entry.hasFile || entry.filePath ? (
                      <button
                        type="button"
                        onClick={() => void handleDownload(entry)}
                        className="inline-flex shrink-0 items-center gap-1 text-sm text-primary-600 hover:underline"
                        title={entry.fileName ?? 'Download attachment'}
                      >
                        <Download className="h-4 w-4" />
                        <FileText className="h-4 w-4" />
                      </button>
                    ) : (
                      <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </CardContent>
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New lesson note">
        <div className="space-y-3">
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
    </div>
  );
}
