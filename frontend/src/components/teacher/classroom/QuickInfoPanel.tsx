import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ClassItem } from '@/types';

interface QuickInfoPanelProps {
  classItem: ClassItem;
  onNewNote: () => void;
  onAddHomework: () => void;
  onViewStudents: () => void;
}

export function QuickInfoPanel({
  classItem,
  onNewNote,
  onAddHomework,
  onViewStudents,
}: QuickInfoPanelProps) {
  const enrolled = classItem.enrolledCount ?? 0;
  const location =
    classItem.location && classItem.location !== '—' ? classItem.location : '—';

  return (
    <aside className="hidden space-y-3 xl:block">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Class schedule
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            {classItem.dayOfWeek}
          </li>
          <li className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            {classItem.startTime} – {classItem.endTime}
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-slate-400" />
            {location}
          </li>
          <li className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-slate-400" />
            {enrolled} student{enrolled === 1 ? '' : 's'}
          </li>
        </ul>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Quick actions
        </h3>
        <div className="mt-3 flex flex-col gap-2">
          <Button type="button" variant="outline" size="sm" className="justify-start" onClick={onNewNote}>
            New note
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={onAddHomework}
          >
            Add homework
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={onViewStudents}
          >
            View students
          </Button>
        </div>
      </div>
    </aside>
  );
}
