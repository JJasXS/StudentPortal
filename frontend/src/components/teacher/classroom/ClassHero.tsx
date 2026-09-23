import { Link } from 'react-router-dom';
import { ArrowLeft, GraduationCap, MoreHorizontal, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import type { ClassItem } from '@/types';

interface ClassHeroProps {
  classItem: ClassItem;
  onNewNote: () => void;
  onAddHomework: () => void;
}

export function ClassHero({ classItem, onNewNote, onAddHomework }: ClassHeroProps) {
  const enrolled = classItem.enrolledCount ?? 0;
  const max = classItem.maxStudents || 0;
  const location =
    classItem.location && classItem.location !== '—' ? classItem.location : null;

  return (
    <div className="space-y-4">
      <Link
        to="/teacher/classes"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800"
      >
        <ArrowLeft className="h-4 w-4" />
        My Classes
      </Link>

      <div
        className={cn(
          'relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500',
          'px-5 py-6 text-white shadow-sm sm:px-7 sm:py-7'
        )}
      >
        <GraduationCap
          className="pointer-events-none absolute -right-2 -top-2 h-36 w-36 text-white/10 sm:h-44 sm:w-44"
          aria-hidden
        />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {classItem.className}
            </h1>
            <p className="text-sm text-white/90 sm:text-base">
              {[classItem.courseName, classItem.dayOfWeek, `${classItem.startTime}–${classItem.endTime}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
            <p className="text-sm text-white/80">
              {[
                location,
                max > 0 ? `${enrolled} / ${max} Students` : enrolled > 0 ? `${enrolled} Students` : null,
                classItem.teacherName ? `Teacher: ${classItem.teacherName}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="bg-white text-primary-700 hover:bg-white/90"
              onClick={onNewNote}
            >
              <Plus className="mr-1 h-4 w-4" />
              New Note
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20"
              onClick={onAddHomework}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Homework
            </Button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white hover:bg-white/20"
              aria-label="More actions"
              title="More actions coming soon"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
