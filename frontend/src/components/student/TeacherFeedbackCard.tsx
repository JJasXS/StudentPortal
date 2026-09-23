import { MessageSquareText } from 'lucide-react';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import type { LessonNote } from '@/types';

interface TeacherFeedbackCardProps {
  note: LessonNote;
  compact?: boolean;
}

export function TeacherFeedbackCard({ note, compact }: TeacherFeedbackCardProps) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
      <div className="flex items-start gap-2">
        <MessageSquareText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-emerald-950">{note.noteTitle}</p>
          {note.teacherName && (
            <p className="text-xs text-emerald-800">{note.teacherName}</p>
          )}
          {!compact && (
            <p className="mt-1 whitespace-pre-wrap text-sm text-emerald-900">{note.noteContent}</p>
          )}
          {compact && (
            <p className="mt-1 line-clamp-3 text-sm text-emerald-900">{note.noteContent}</p>
          )}
          {note.practiceInstructions && !compact && (
            <p className="mt-1 text-sm text-emerald-800">{note.practiceInstructions}</p>
          )}
          <p className="mt-1 text-xs text-emerald-700">{formatDateDDMMYYYY(note.createdAt)}</p>
        </div>
      </div>
    </div>
  );
}

export function NoTeacherFeedbackYet() {
  return (
    <p className="text-sm text-slate-500">No teacher feedback yet.</p>
  );
}
