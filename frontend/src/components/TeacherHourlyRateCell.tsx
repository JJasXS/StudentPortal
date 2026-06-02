import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { EditHourlyRateModal } from '@/components/EditHourlyRateModal';
import { formatStaffHourlyRatePlain } from '@/utils/staffRate';
import type { TeacherProfile } from '@/types';

interface TeacherHourlyRateCellProps {
  teacher: TeacherProfile;
  editable?: boolean;
  saving?: boolean;
  onSave: (teacher: TeacherProfile, hourlyRate: number) => void;
}

export function TeacherHourlyRateCell({
  teacher,
  editable = false,
  saving,
  onSave,
}: TeacherHourlyRateCellProps) {
  const [open, setOpen] = useState(false);
  const label = formatStaffHourlyRatePlain(teacher.hourlyRate);

  if (!editable) {
    return <span className="text-sm text-slate-800">{label}</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={teacher.isActive === false}
        title={`Rate: ${label}`}
        className="group rounded-lg px-1 py-0.5 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="block text-sm text-slate-800">{label}</span>
        <span className="mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 opacity-80 group-hover:opacity-100">
          <Pencil className="h-3 w-3" />
          Edit
        </span>
      </button>

      <EditHourlyRateModal
        open={open}
        onClose={() => setOpen(false)}
        teacherName={teacher.fullName}
        value={teacher.hourlyRate}
        saving={saving}
        onSave={(hourlyRate) => {
          onSave(teacher, hourlyRate);
          setOpen(false);
        }}
      />
    </>
  );
}
