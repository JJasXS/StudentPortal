import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { EditTeacherSpecializationsModal } from '@/components/EditTeacherSpecializationsModal';
import { formatSpecializationDisplay } from '@/utils/specializations';
import type { TeacherProfile } from '@/types';

interface TeacherSpecializationCellProps {
  teacher: TeacherProfile;
  options: string[];
  editable?: boolean;
  saving?: boolean;
  onSave: (teacher: TeacherProfile, specialization: string) => void;
}

export function TeacherSpecializationCell({
  teacher,
  options,
  editable = false,
  saving,
  onSave,
}: TeacherSpecializationCellProps) {
  const [open, setOpen] = useState(false);
  const display = formatSpecializationDisplay(teacher.specialization);

  if (!editable) {
    return (
      <span
        className="block max-w-[220px] truncate text-sm text-slate-800"
        title={display.full || undefined}
      >
        {display.text}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={teacher.isActive === false}
        title={display.full || 'Add specializations'}
        className="group flex max-w-[220px] items-start gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-slate-800">{display.text}</span>
          <span className="mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 opacity-80 group-hover:opacity-100">
            <Pencil className="h-3 w-3" />
            Edit
          </span>
        </span>
      </button>

      <EditTeacherSpecializationsModal
        open={open}
        onClose={() => setOpen(false)}
        teacherName={teacher.fullName}
        value={teacher.specialization}
        options={options}
        saving={saving}
        onSave={(specialization) => {
          onSave(teacher, specialization);
          setOpen(false);
        }}
      />
    </>
  );
}
