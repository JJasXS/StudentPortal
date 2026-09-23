import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Download } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ClassHero } from '@/components/teacher/classroom/ClassHero';
import {
  ClassTabBar,
  parseClassTab,
  type ClassWorkspaceTab,
} from '@/components/teacher/classroom/ClassTabBar';
import {
  StreamTab,
  buildStreamActivities,
} from '@/components/teacher/classroom/StreamTab';
import { LessonNotesTab } from '@/components/teacher/classroom/LessonNotesTab';
import { HomeworkTab } from '@/components/teacher/classroom/HomeworkTab';
import { MaterialsTab } from '@/components/teacher/classroom/MaterialsTab';
import { StudentsTab } from '@/components/teacher/classroom/StudentsTab';
import { QuickInfoPanel } from '@/components/teacher/classroom/QuickInfoPanel';
import {
  assignmentsApi,
  calendarApi,
  classMaterialsApi,
  classesApi,
  enrollmentsApi,
  homeworkApi,
  lessonNotesApi,
} from '@/api/resources';
import { mockLessonNotes } from '@/utils/mockData';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { lessonNotesForHomework } from '@/utils/homeworkLessonNotes';
import { getApiErrorMessage } from '@/utils/apiError';
import {
  buildTeacherClassList,
  erpStudentsForClass,
  normalizeTeacherClassId,
  parseErpTeacherClassName,
} from '@/utils/teacherClasses';
import type { ClassItem, Enrollment, LessonNote } from '@/types';
import type { PortalAssignment, PortalClassMaterial, PortalHomework } from '@/types/portal';

export default function TeacherClassDetailPage() {
  const { classId = '' } = useParams<{ classId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseClassTab(searchParams.get('tab'));
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [homework, setHomework] = useState<PortalHomework[]>([]);
  const [assignments, setAssignments] = useState<PortalAssignment[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [scheduleStudents, setScheduleStudents] = useState<
    { id: string; name: string; subtitle?: string; status?: string }[]
  >([]);
  const [materials, setMaterials] = useState<PortalClassMaterial[]>([]);
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

  const setTab = (next: ClassWorkspaceTab) => {
    setSearchParams(next === 'stream' ? {} : { tab: next });
  };

  const loadData = useCallback(async () => {
    if (!user?.id || !classId) return;
    setLoading(true);
    try {
      const decodedId = normalizeTeacherClassId(decodeURIComponent(classId));
      const isMock = import.meta.env.VITE_USE_MOCK === 'true';
      const [classes, allNotes, allHomework, erpEvents, allEnrollments] = await Promise.all([
        classesApi.getAll().catch(() => []),
        lessonNotesApi.getAll().catch(() => mockLessonNotes),
        user.fullName ? homeworkApi.getAll(user.fullName).catch(() => []) : Promise.resolve([]),
        isMock
          ? Promise.resolve([] as import('@/types/sqlAccount').ErpCalendarEvent[])
          : calendarApi.getEvents().catch(() => []),
        enrollmentsApi.getAll().catch(() => [] as Enrollment[]),
      ]);
      const fromList = buildTeacherClassList(classes, erpEvents, user);
      const wantedName = parseErpTeacherClassName(decodedId)?.toLowerCase() ?? null;
      const cls =
        fromList.find((c) => normalizeTeacherClassId(c.id) === decodedId) ??
        (wantedName
          ? fromList.find((c) => c.className.trim().toLowerCase() === wantedName)
          : null) ??
        classes.find((c) => c.id === decodedId) ??
        null;
      setClassItem(cls);
      const className = cls?.className ?? parseErpTeacherClassName(decodedId) ?? '';
      setNotes(
        allNotes.filter(
          (n) => n.teacherUserId === user.id && (!className || n.className === className)
        )
      );
      setHomework(allHomework.filter((h) => h.className === className || !className));
      const portalEnrollments = cls
        ? allEnrollments.filter((e) => e.classId === cls.id || e.className === className)
        : [];
      setEnrollments(portalEnrollments);
      setScheduleStudents(
        cls && portalEnrollments.length === 0
          ? erpStudentsForClass(erpEvents, cls, user)
          : []
      );
      if (className) {
        const [classAssignments, classMaterials] = await Promise.all([
          assignmentsApi.getForClass(className).catch(() => []),
          classMaterialsApi.getForClass(className).catch(() => []),
        ]);
        setAssignments(classAssignments);
        setMaterials(classMaterials);
      } else {
        setAssignments([]);
        setMaterials([]);
      }
    } finally {
      setLoading(false);
    }
  }, [classId, user]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const assignmentTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of assignments) map.set(row.id, row.title);
    return map;
  }, [assignments]);

  const streamActivities = useMemo(
    () => buildStreamActivities(notes, assignments, homework, assignmentTitleById),
    [notes, assignments, homework, assignmentTitleById]
  );

  const linkedNoteForReview = useMemo(() => {
    if (!reviewEntry) return null;
    return lessonNotesForHomework(reviewEntry, notes)[0] ?? null;
  }, [reviewEntry, notes]);

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
            homework.find((h) => h.id === homeworkIdForNote) ??
              ({ id: homeworkIdForNote } as PortalHomework),
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

  const tabCounts: Partial<Record<ClassWorkspaceTab, number>> = {
    notes: notes.length,
    homework: assignments.length + homework.length,
    materials: materials.length,
    students: Math.max(
      enrollments.length,
      scheduleStudents.length,
      classItem.enrolledCount || 0
    ),
  };

  const refreshMaterials = async () => {
    if (!classItem?.className) {
      setMaterials([]);
      return;
    }
    const rows = await classMaterialsApi.getForClass(classItem.className).catch(() => []);
    setMaterials(rows);
  };

  return (
    <div className="space-y-5">
      <ClassHero
        classItem={classItem}
        onNewNote={() => setCreateOpen(true)}
        onAddHomework={() => setAssignOpen(true)}
        onViewStudents={() => setTab('students')}
        onUploadMaterial={() => setTab('materials')}
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_16rem] xl:items-start">
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ClassTabBar value={tab} onChange={setTab} counts={tabCounts} />
          <div className="border-t border-slate-100 p-4 sm:p-5">
            {tab === 'stream' && (
              <StreamTab
                classItem={classItem}
                activities={streamActivities}
                onNewNote={() => setCreateOpen(true)}
                onAddHomework={() => setAssignOpen(true)}
                onUploadMaterial={() => setTab('materials')}
                onViewStudents={() => setTab('students')}
              />
            )}
            {tab === 'notes' && (
              <LessonNotesTab
                notes={notes}
                homework={homework}
                onCreate={() => setCreateOpen(true)}
              />
            )}
            {tab === 'homework' && (
              <HomeworkTab
                assignments={assignments}
                homework={homework}
                notes={notes}
                assignmentTitles={assignmentTitleById}
                onAssign={() => setAssignOpen(true)}
                onReview={setReviewEntry}
              />
            )}
            {tab === 'materials' && (
              <MaterialsTab
                className={classItem.className}
                materials={materials}
                loading={loading}
                onRefresh={refreshMaterials}
                onError={showError}
                onSuccess={showSuccess}
              />
            )}
            {tab === 'students' && (
              <StudentsTab
                enrollments={enrollments}
                scheduleStudents={scheduleStudents}
                enrolledCount={Math.max(
                  enrollments.length,
                  scheduleStudents.length,
                  classItem.enrolledCount ?? 0
                )}
                maxStudents={classItem.maxStudents}
              />
            )}
          </div>
        </div>

        <QuickInfoPanel
          classItem={classItem}
          onNewNote={() => setCreateOpen(true)}
          onAddHomework={() => setAssignOpen(true)}
          onViewStudents={() => setTab('students')}
        />
      </div>

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

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign homework">
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
              {(['Completed', 'Pending', 'Rejected'] as const).map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={reviewEntry.status === status ? 'default' : 'outline'}
                  disabled={statusSaving}
                  onClick={() => void handleSetStatus(status)}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
