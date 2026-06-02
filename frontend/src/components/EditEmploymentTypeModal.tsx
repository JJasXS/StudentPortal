import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import {
  EMPLOYMENT_TYPES,
  EMPLOYMENT_TYPE_LABELS,
  normalizeEmploymentType,
  type EmploymentType,
} from '@/utils/employmentTypes';

interface EditEmploymentTypeModalProps {
  open: boolean;
  onClose: () => void;
  teacherName: string;
  value?: string;
  saving?: boolean;
  onSave: (employmentType: EmploymentType) => void;
}

export function EditEmploymentTypeModal({
  open,
  onClose,
  teacherName,
  value,
  saving,
  onSave,
}: EditEmploymentTypeModalProps) {
  const [selected, setSelected] = useState<EmploymentType>('FullTime');

  useEffect(() => {
    if (open) setSelected(normalizeEmploymentType(value));
  }, [open, value]);

  const handleSave = () => {
    onSave(selected);
  };

  return (
    <Modal open={open} onClose={onClose} title="Employment type" className="max-w-sm">
      <p className="mb-4 text-sm text-slate-600">
        Set employment type for <strong>{teacherName}</strong>.
      </p>

      <div className="flex flex-col gap-2">
        {EMPLOYMENT_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelected(type)}
            className={cn(
              'rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors',
              selected === type
                ? 'border-primary-600 bg-primary-50 text-primary-800'
                : 'border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-slate-50'
            )}
          >
            {EMPLOYMENT_TYPE_LABELS[type]}
          </button>
        ))}
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  );
}
