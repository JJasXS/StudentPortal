import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { lessonNotesApi } from '@/api/resources';
import { mockLessonNotes } from '@/utils/mockData';
import type { LessonNote } from '@/types';

export default function StudentLessonNotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<LessonNote[]>([]);

  useEffect(() => {
    if (user?.id) {
      lessonNotesApi.getByStudent(user.id)
        .then(setNotes)
        .catch(() => setNotes(mockLessonNotes.filter((n) => n.studentUserId === user.id)));
    }
  }, [user?.id]);

  return (
    <div>
      <PageHeader title="Lesson Notes" description="Notes from your teachers" />
      <div className="grid gap-4">
        {notes.map((note) => (
          <Card key={note.id}>
            <CardHeader>
              <CardTitle className="text-base">{note.noteTitle}</CardTitle>
              <p className="text-sm text-slate-500">{note.teacherName} · {note.className}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{note.noteContent}</p>
              {note.practiceInstructions && (
                <p className="mt-2 text-sm text-primary-700"><strong>Practice:</strong> {note.practiceInstructions}</p>
              )}
            </CardContent>
          </Card>
        ))}
        {notes.length === 0 && <p className="text-slate-500">No lesson notes yet.</p>}
      </div>
    </div>
  );
}
