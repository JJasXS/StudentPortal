import type { ReactNode } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  FileText,
  FolderOpen,
  MapPin,
  Music2,
  Plus,
  Upload,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { cn } from '@/utils/cn';
import type { ClassItem, LessonNote } from '@/types';
import type { PortalAssignment, PortalHomework } from '@/types/portal';

export type StreamActivityKind = 'note' | 'assignment' | 'submission';

export interface StreamActivity {
  id: string;
  kind: StreamActivityKind;
  title: string;
  subtitle: string;
  description?: string;
  createdAt: string;
  attachmentLabel?: string;
}

export function buildStreamActivities(
  notes: LessonNote[],
  assignments: PortalAssignment[],
  homework: PortalHomework[],
  assignmentTitles: Map<string, string>
): StreamActivity[] {
  const items: StreamActivity[] = [
    ...notes.map((n) => ({
      id: `note-${n.id}`,
      kind: 'note' as const,
      title: 'Lesson note posted',
      subtitle: n.noteTitle,
      description: n.noteContent,
      createdAt: n.createdAt,
      attachmentLabel: n.practiceInstructions ? 'Practice instructions' : undefined,
    })),
    ...assignments.map((a) => ({
      id: `asg-${a.id}`,
      kind: 'assignment' as const,
      title: 'Homework assigned',
      subtitle: a.title,
      description: a.instructions,
      createdAt: a.dueDate,
      attachmentLabel: `Due ${formatDateDDMMYYYY(a.dueDate)}`,
    })),
    ...homework.map((h) => ({
      id: `hw-${h.id}`,
      kind: 'submission' as const,
      title: 'Homework submission',
      subtitle: h.submittedBy,
      description:
        (h.assignmentId ? assignmentTitles.get(h.assignmentId) : null) ??
        h.note ??
        h.fileName ??
        'Submission received',
      createdAt: h.createdAt,
      attachmentLabel: h.fileName || (h.url ? 'Link' : undefined),
    })),
  ];

  return items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function kindIcon(kind: StreamActivityKind) {
  switch (kind) {
    case 'note':
      return FileText;
    case 'assignment':
      return BookOpen;
    default:
      return Upload;
  }
}

function kindTint(kind: StreamActivityKind) {
  switch (kind) {
    case 'note':
      return 'bg-sky-50 text-sky-700';
    case 'assignment':
      return 'bg-amber-50 text-amber-800';
    default:
      return 'bg-emerald-50 text-emerald-700';
  }
}

interface StreamTabProps {
  classItem: ClassItem;
  activities: StreamActivity[];
  onNewNote: () => void;
  onAddHomework: () => void;
  onUploadMaterial: () => void;
  onViewStudents: () => void;
}

export function StreamTab({
  classItem,
  activities,
  onNewNote,
  onAddHomework,
  onUploadMaterial,
  onViewStudents,
}: StreamTabProps) {
  const enrolled = classItem.enrolledCount ?? 0;
  const max = classItem.maxStudents || 0;
  const location =
    classItem.location && classItem.location !== '—' ? classItem.location : '—';

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(14rem,30%)_1fr]">
      <aside className="space-y-3">
        <InfoCard title="Upcoming class">
          <MetaRow icon={Calendar} label={classItem.dayOfWeek} />
          <MetaRow icon={Clock} label={`${classItem.startTime} – ${classItem.endTime}`} />
          <MetaRow icon={MapPin} label={location} />
          {classItem.teacherName && <MetaRow icon={Users} label={classItem.teacherName} />}
        </InfoCard>

        <InfoCard title="Class information">
          <p className="text-sm text-slate-600">
            {[classItem.courseName, classItem.dayOfWeek, `${classItem.startTime}–${classItem.endTime}`]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="mt-2 text-sm text-slate-600">
            {max > 0 ? `${enrolled} / ${max} students` : `${enrolled} students`}
          </p>
        </InfoCard>

        <InfoCard title="Quick actions">
          <div className="flex flex-col gap-2">
            <QuickBtn label="New note" onClick={onNewNote} />
            <QuickBtn label="Add homework" onClick={onAddHomework} />
            <QuickBtn label="Upload material" onClick={onUploadMaterial} />
            <QuickBtn label="View students" onClick={onViewStudents} />
          </div>
        </InfoCard>
      </aside>

      <div className="space-y-3">
        <button
          type="button"
          onClick={onNewNote}
          className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-primary-200 hover:bg-primary-50/40"
        >
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
            <Plus className="h-4 w-4" />
          </span>
          <span className="text-sm text-slate-500">
            Share an announcement, lesson update, or reminder…
          </span>
        </button>

        {activities.length === 0 ? (
          <EmptyState
            icon={Music2}
            title="No class activity yet"
            description="Posts, notes, materials and homework will appear here."
            actions={[{ label: '+ Create Lesson Note', onClick: onNewNote }]}
          />
        ) : (
          <ul className="space-y-3">
            {activities.map((item) => {
              const Icon = kindIcon(item.kind);
              return (
                <li
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex gap-3">
                    <span
                      className={cn(
                        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                        kindTint(item.kind)
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900">{item.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDateDDMMYYYY(item.createdAt)}
                      </p>
                      <p className="mt-2 text-sm font-medium text-slate-800">{item.subtitle}</p>
                      {item.description && (
                        <p className="mt-1 line-clamp-3 text-sm text-slate-600">{item.description}</p>
                      )}
                      {item.attachmentLabel && (
                        <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                          <FolderOpen className="h-3.5 w-3.5" />
                          {item.attachmentLabel}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function MetaRow({
  icon: Icon,
  label,
}: {
  icon: typeof Calendar;
  label: string;
}) {
  return (
    <p className="flex items-center gap-2 text-sm text-slate-700">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      {label}
    </p>
  );
}

function QuickBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" className="justify-start" onClick={onClick}>
      {label}
    </Button>
  );
}
