import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { parseStaffHourlyRateInput } from '@/utils/staffRate';

interface EditHourlyRateModalProps {
  open: boolean;
  onClose: () => void;
  teacherName: string;
  value?: number;
  saving?: boolean;
  onSave: (hourlyRate: number) => void;
}

export function EditHourlyRateModal({
  open,
  onClose,
  teacherName,
  value,
  saving,
  onSave,
}: EditHourlyRateModalProps) {
  const [input, setInput] = useState('');
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (open) {
      setInput(String(value ?? 0));
      setInvalid(false);
    }
  }, [open, value]);

  const handleSave = () => {
    const parsed = parseStaffHourlyRateInput(input);
    if (parsed === null) {
      setInvalid(true);
      return;
    }
    onSave(parsed);
  };

  return (
    <Modal open={open} onClose={onClose} title="Hourly rate" className="max-w-sm">
      <p className="mb-4 text-sm text-slate-600">
        Set hourly rate for <strong>{teacherName}</strong>.
      </p>

      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        Rate
      </label>
      <Input
        type="number"
        min={0}
        step={1}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setInvalid(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
          }
        }}
        aria-invalid={invalid}
        className={invalid ? 'border-red-400 focus:ring-red-400' : undefined}
      />
      {invalid && (
        <p className="mt-1 text-sm text-red-600">Enter a valid amount (0 or greater).</p>
      )}

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
