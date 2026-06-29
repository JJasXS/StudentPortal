import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { lessonNotesApi } from '@/api/resources';
import { mockLessonNotes } from '@/utils/mockData';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import type { LessonNote } from '@/types';

export default function StudentLessonNotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    lessonNotesApi
      .getByStudent(user.id)
      .then(setNotes)
      .catch(() => setNotes(mockLessonNotes.filter((n) => n.studentUserId === user.id)))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const sorted = useMemo(
    () =>
      [...notes].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [notes]
  );

  return (
    <div>
      <PageHeader title="Lesson Notes" description="From your teachers" />

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-slate-500">No lesson notes yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200 border-t border-slate-200">
          {sorted.map((note) => (
            <li key={note.id} className="py-5 first:pt-0">
              <h2 className="font-medium text-slate-900">{note.noteTitle}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {note.teacherName || 'Teacher'}
                {note.className ? ` · ${note.className}` : ''}
                {' · '}
                <time className="tabular-nums">{formatDateDDMMYYYY(note.createdAt)}</time>
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">{note.noteContent}</p>
              {note.practiceInstructions?.trim() && (
                <p className="mt-3 text-sm text-slate-600">
                  <span className="text-slate-500">Practice: </span>
                  {note.practiceInstructions}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
