import { useMemo, useState } from 'react';
import { FileText, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import type { LessonNote } from '@/types';
import type { PortalHomework } from '@/types/portal';

interface LessonNotesTabProps {
  notes: LessonNote[];
  homework: PortalHomework[];
  onCreate: () => void;
}

export function LessonNotesTab({ notes, homework, onCreate }: LessonNotesTabProps) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...notes].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (!q) return sorted;
    return sorted.filter(
      (n) =>
        n.noteTitle.toLowerCase().includes(q) ||
        (n.noteContent ?? '').toLowerCase().includes(q) ||
        (n.studentName ?? '').toLowerCase().includes(q)
    );
  }, [notes, query]);

  const linkedNote = (note: LessonNote) =>
    note.homeworkId ? homework.find((h) => h.id === note.homeworkId) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes…"
            className="pl-9"
          />
        </div>
        <Button type="button" size="sm" onClick={onCreate}>
          <Plus className="mr-1 h-4 w-4" />
          New Note
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={notes.length === 0 ? 'No lesson notes for this class yet' : 'No notes match your search'}
          description={
            notes.length === 0
              ? 'Create the first lesson note to start tracking lesson progress.'
              : 'Try a different search term.'
          }
          actions={
            notes.length === 0
              ? [{ label: '+ Create Lesson Note', onClick: onCreate }]
              : undefined
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map((note) => {
            const linked = linkedNote(note);
            return (
              <li
                key={note.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{note.noteTitle}</h3>
                  <span className="shrink-0 text-xs text-slate-500">
                    {formatDateDDMMYYYY(note.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {[note.teacherName, note.studentName].filter(Boolean).join(' · ') || 'Lesson note'}
                </p>
                <p className="mt-2 line-clamp-3 text-sm text-slate-600">{note.noteContent}</p>
                {linked?.note && (
                  <p className="mt-2 text-xs text-slate-500">Student submission: {linked.note}</p>
                )}
                {note.practiceInstructions && (
                  <p className="mt-2 inline-flex w-fit rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                    Has practice instructions
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
