import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { AssignTeacherToClassModal } from '@/components/AssignTeacherToClassModal';
import type { ClassItem, TeacherProfile } from '@/types';

interface ClassTeacherCellProps {
  classItem: ClassItem;
  teachers: TeacherProfile[];
  saving?: boolean;
  onSave: (teacherUserId: string, teacherName: string) => void;
}

export function ClassTeacherCell({ classItem, teachers, saving, onSave }: ClassTeacherCellProps) {
  const [open, setOpen] = useState(false);
  const label = classItem.teacherName?.trim() || 'Not assigned';

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={label === 'Not assigned' ? 'Assign teacher' : `Teacher: ${label}`}
        className="group inline-flex max-w-full flex-col items-start rounded-lg px-1 py-0.5 text-left hover:bg-slate-50"
      >
        <span className="text-sm text-slate-800">{label}</span>
        <span className="mt-0.5 inline-flex items-center gap-0.5 text-xs font-medium text-primary-600 opacity-80 group-hover:opacity-100">
          <Pencil className="h-3 w-3" />
          Edit
        </span>
      </button>

      <AssignTeacherToClassModal
        open={open}
        onClose={() => setOpen(false)}
        className={classItem.className}
        currentTeacherUserId={classItem.teacherUserId}
        teachers={teachers}
        saving={saving}
        onSave={(teacherUserId, teacherName) => {
          onSave(teacherUserId, teacherName);
          setOpen(false);
        }}
      />
    </>
  );
}
