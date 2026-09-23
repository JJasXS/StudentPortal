import { useRef, useState } from 'react';
import { FolderOpen, GraduationCap, MoreHorizontal, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { PortalMenu } from '@/components/ui/PortalMenu';
import { cn } from '@/utils/cn';
import type { ClassItem } from '@/types';

interface ClassHeroProps {
  classItem: ClassItem;
  onNewNote: () => void;
  onAddHomework: () => void;
  onViewStudents: () => void;
  onUploadMaterial: () => void;
}

export function ClassHero({
  classItem,
  onNewNote,
  onAddHomework,
  onViewStudents,
  onUploadMaterial,
}: ClassHeroProps) {
  const enrolled = classItem.enrolledCount ?? 0;
  const max = classItem.maxStudents || 0;
  const location =
    classItem.location && classItem.location !== '—' ? classItem.location : null;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLDivElement>(null);

  return (
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
          <div className="relative" ref={menuAnchorRef}>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/30 bg-white/10 text-white hover:bg-white/20"
              aria-label="More actions"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            <PortalMenu
              open={menuOpen}
              onClose={() => setMenuOpen(false)}
              anchorRef={menuAnchorRef}
              minWidth={176}
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setMenuOpen(false);
                  onViewStudents();
                }}
              >
                <Users className="h-4 w-4 text-slate-400" />
                View students
              </button>
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                onClick={() => {
                  setMenuOpen(false);
                  onUploadMaterial();
                }}
              >
                <FolderOpen className="h-4 w-4 text-slate-400" />
                Materials
              </button>
            </PortalMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
