import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { EditEmploymentTypeModal } from '@/components/EditEmploymentTypeModal';
import { getEmploymentTypeLabel } from '@/utils/employmentTypes';
import type { EmploymentType } from '@/utils/employmentTypes';
import type { TeacherProfile } from '@/types';

interface TeacherEmploymentTypeCellProps {
  teacher: TeacherProfile;
  editable?: boolean;
  saving?: boolean;
  onSave: (teacher: TeacherProfile, employmentType: EmploymentType) => void;
}

export function TeacherEmploymentTypeCell({
  teacher,
  editable = false,
  saving,
  onSave,
}: TeacherEmploymentTypeCellProps) {
  const [open, setOpen] = useState(false);
  const label = getEmploymentTypeLabel(teacher.employmentType);

  if (!editable) {
    return <span className="text-sm text-slate-800">{label}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={teacher.isActive === false}
        title={`Employment: ${label}`}
        className="group rounded-lg px-1 py-0.5 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="block text-sm text-slate-800">{label}</span>
        <span className="mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 opacity-80 group-hover:opacity-100">
          <Pencil className="h-3 w-3" />
          Edit
        </span>
      </button>

      <EditEmploymentTypeModal
        open={open}
        onClose={() => setOpen(false)}
        teacherName={teacher.fullName}
        value={teacher.employmentType}
        saving={saving}
        onSave={(employmentType) => {
          onSave(teacher, employmentType);
          setOpen(false);
        }}
      />
    </>
  );
}
