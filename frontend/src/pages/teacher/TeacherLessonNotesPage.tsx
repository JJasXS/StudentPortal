import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { calendarApi, lessonNotesApi } from '@/api/resources';
import { mockLessonNotes } from '@/utils/mockData';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { getApiErrorMessage } from '@/utils/apiError';
import type { LessonNote } from '@/types';
import type { ErpCalendarEvent } from '@/types/sqlAccount';

function uniqueClassNames(notes: LessonNote[]): string[] {
  const names = new Set<string>();
  for (const n of notes) {
    if (n.className?.trim()) names.add(n.className.trim());
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

function noteMatchesSearch(note: LessonNote, query: string): boolean {
  const haystack = [
    note.noteTitle,
    note.noteContent,
    note.practiceInstructions,
    note.studentName,
    note.className,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export default function TeacherLessonNotesPage() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classTab, setClassTab] = useState('All');
  const [selected, setSelected] = useState<LessonNote | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState<'class' | 'session' | 'note'>('class');
  const [calendarEvents, setCalendarEvents] = useState<ErpCalendarEvent[]>([]);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<ErpCalendarEvent | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [practiceInstructions, setPracticeInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  const loadNotes = () => {
    if (!user?.id) return;
    setLoading(true);
    lessonNotesApi
      .getAll()
      .then((data) => setNotes(data.filter((n) => n.teacherUserId === user.id)))
      .catch(() => setNotes(mockLessonNotes.filter((n) => n.teacherUserId === user.id)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotes();
  }, [user?.id]);

  useEffect(() => {
    if (!createOpen || !user?.fullName) return;
    calendarApi
      .getEvents()
      .then((events) =>
        setCalendarEvents(
          events.filter(
            (e) =>
              e.teacherName?.toLowerCase() === user.fullName.toLowerCase() && e.status !== 'Cancelled'
          )
        )
      )
      .catch(() => setCalendarEvents([]));
  }, [createOpen, user?.fullName]);

  const classNamesFromCalendar = useMemo(() => {
    const names = new Set<string>();
    for (const e of calendarEvents) {
      if (e.className?.trim()) names.add(e.className.trim());
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [calendarEvents]);

  const sessionsForClass = useMemo(() => {
    if (!selectedClassName) return [];
    return calendarEvents
      .filter((e) => e.className === selectedClassName)
      .sort((a, b) => new Date(b.sessionDate).getTime() - new Date(a.sessionDate).getTime());
  }, [calendarEvents, selectedClassName]);

  const resetCreate = () => {
    setCreateStep('class');
    setSelectedClassName('');
    setSelectedEvent(null);
    setNoteTitle('');
    setNoteContent('');
    setPracticeInstructions('');
  };

  const handleCreate = async () => {
    if (!user?.id || !selectedEvent || !noteTitle.trim() || !noteContent.trim()) return;
    setSaving(true);
    try {
      await lessonNotesApi.create({
        teacherUserId: user.id,
        className: selectedEvent.className,
        studentName: selectedEvent.studentName ?? undefined,
        noteTitle: noteTitle.trim(),
        noteContent: noteContent.trim(),
        practiceInstructions: practiceInstructions.trim() || undefined,
      });
      setCreateOpen(false);
      resetCreate();
      loadNotes();
      showSuccess('Lesson note created.');
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not create lesson note.'));
    } finally {
      setSaving(false);
    }
  };

  const classTabs = useMemo(() => ['All', ...uniqueClassNames(notes)], [notes]);

  useEffect(() => {
    if (classTab !== 'All' && !classTabs.includes(classTab)) {
      setClassTab('All');
    }
  }, [classTab, classTabs]);

  const filteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => noteMatchesSearch(n, q));
  }, [notes, search]);

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = { All: filteredBySearch.length };
    for (const name of uniqueClassNames(filteredBySearch)) {
      counts[name] = filteredBySearch.filter((n) => n.className === name).length;
    }
    return counts;
  }, [filteredBySearch]);

  const filtered = useMemo(() => {
    if (classTab === 'All') return filteredBySearch;
    return filteredBySearch.filter((n) => n.className === classTab);
  }, [filteredBySearch, classTab]);

  const sorted = useMemo(
    () =>
      [...filtered].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [filtered]
  );

  const hasActiveFilters = Boolean(search.trim() || classTab !== 'All');

  const clearFilters = () => {
    setSearch('');
    setClassTab('All');
  };

  const countLabel = `${notes.length} note${notes.length === 1 ? '' : 's'}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lesson Notes"
        description={`Record homework and progress for your students · ${countLabel}`}
        actions={
          <Button
            type="button"
            size="sm"
            onClick={() => {
              resetCreate();
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            New note
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search title, student, class, or content..."
              className="max-w-none flex-1"
            />
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="shrink-0 text-slate-600"
              >
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          <SlidingTabs
            tabs={classTabs}
            value={classTab}
            onChange={setClassTab}
            counts={classCounts}
            trailing={`${filtered.length} of ${notes.length}`}
          />

          <DataTable
            embedded
            data={sorted}
            emptyMessage={
              loading
                ? 'Loading lesson notes…'
                : hasActiveFilters
                  ? 'No notes match your filters.'
                  : 'No lesson notes yet. Notes you add after class sessions will appear here.'
            }
            columns={[
              {
                key: 'createdAt',
                header: 'Date',
                sortable: true,
                sortType: 'date',
                getSortValue: (n) => n.createdAt,
                render: (n) => (
                  <span className="tabular-nums text-slate-600">
                    {formatDateDDMMYYYY(n.createdAt)}
                  </span>
                ),
              },
              {
                key: 'studentName',
                header: 'Student',
                sortable: true,
                sortType: 'text',
                getSortValue: (n) => n.studentName ?? '',
                render: (n) => (
                  <span className="font-medium text-slate-900">{n.studentName || '—'}</span>
                ),
              },
              {
                key: 'className',
                header: 'Class',
                sortable: true,
                sortType: 'text',
                getSortValue: (n) => n.className ?? '',
                render: (n) => n.className || '—',
              },
              {
                key: 'noteTitle',
                header: 'Title',
                sortable: true,
                sortType: 'text',
                getSortValue: (n) => n.noteTitle,
                className: 'max-w-[14rem] whitespace-normal',
                render: (n) => (
                  <button
                    type="button"
                    onClick={() => setSelected(n)}
                    className="text-left font-medium text-primary-700 hover:text-primary-800 hover:underline"
                  >
                    {n.noteTitle}
                  </button>
                ),
              },
              {
                key: 'practice',
                header: 'Practice',
                sortable: true,
                sortType: 'text',
                getSortValue: (n) => (n.practiceInstructions?.trim() ? 'Yes' : ''),
                render: (n) =>
                  n.practiceInstructions?.trim() ? (
                    <span className="inline-flex rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                      Yes
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  ),
              },
              {
                key: 'actions',
                header: '',
                render: (n) => (
                  <Button type="button" variant="outline" size="sm" onClick={() => setSelected(n)}>
                    View
                  </Button>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      <Modal
        open={selected != null}
        onClose={() => setSelected(null)}
        title={selected?.noteTitle ?? 'Lesson note'}
        className="max-w-lg"
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-slate-600">
              <dt className="font-medium text-slate-500">Student</dt>
              <dd className="text-slate-900">{selected.studentName || '—'}</dd>
              <dt className="font-medium text-slate-500">Class</dt>
              <dd className="text-slate-900">{selected.className || '—'}</dd>
              <dt className="font-medium text-slate-500">Date</dt>
              <dd className="tabular-nums text-slate-900">
                {formatDateDDMMYYYY(selected.createdAt)}
              </dd>
            </dl>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Lesson summary
              </p>
              <p className="rounded-lg bg-slate-50 p-3 text-slate-700">{selected.noteContent}</p>
            </div>

            {selected.practiceInstructions?.trim() && (
              <div className="rounded-lg border border-primary-100 bg-primary-50/60 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary-800">
                  Practice at home
                </p>
                <p className="text-primary-900">{selected.practiceInstructions}</p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="button" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create lesson note"
        className="max-w-lg"
      >
        {createStep === 'class' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Choose a class from your schedule.</p>
            {classNamesFromCalendar.length === 0 ? (
              <p className="text-sm text-slate-500">No classes found on your calendar.</p>
            ) : (
              <div className="space-y-2">
                {classNamesFromCalendar.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => {
                      setSelectedClassName(name);
                      setCreateStep('session');
                    }}
                    className="flex w-full rounded-lg border border-slate-200 px-4 py-3 text-left text-sm font-medium text-slate-900 hover:bg-slate-50"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {createStep === 'session' && (
          <div className="space-y-4">
            <button
              type="button"
              className="text-sm font-medium text-primary-600 hover:underline"
              onClick={() => setCreateStep('class')}
            >
              ← Back to classes
            </button>
            <div className="space-y-1.5">
              <Label htmlFor="sessionPick">Session</Label>
              <Select
                id="sessionPick"
                value={selectedEvent?.id ?? ''}
                onChange={(e) => {
                  const picked = sessionsForClass.find((s) => s.id === e.target.value);
                  setSelectedEvent(picked ?? null);
                }}
              >
                <option value="">Select session…</option>
                {sessionsForClass.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatDateDDMMYYYY(s.sessionDate)}
                    {s.studentName ? ` · ${s.studentName}` : ''}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              type="button"
              disabled={!selectedEvent}
              onClick={() => setCreateStep('note')}
            >
              Continue
            </Button>
          </div>
        )}

        {createStep === 'note' && selectedEvent && (
          <div className="space-y-4">
            <button
              type="button"
              className="text-sm font-medium text-primary-600 hover:underline"
              onClick={() => setCreateStep('session')}
            >
              ← Back to session
            </button>
            <p className="text-sm text-slate-600">
              {selectedEvent.className}
              {selectedEvent.studentName ? ` · ${selectedEvent.studentName}` : ''} ·{' '}
              {formatDateDDMMYYYY(selectedEvent.sessionDate)}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="noteTitle">Title</Label>
              <Input
                id="noteTitle"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="e.g. Scales and arpeggios"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="noteContent">Lesson summary</Label>
              <Textarea
                id="noteContent"
                rows={4}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="practice">Practice at home (optional)</Label>
              <Textarea
                id="practice"
                rows={2}
                value={practiceInstructions}
                onChange={(e) => setPracticeInstructions(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={saving || !noteTitle.trim() || !noteContent.trim()}
                onClick={() => void handleCreate()}
              >
                Save note
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
