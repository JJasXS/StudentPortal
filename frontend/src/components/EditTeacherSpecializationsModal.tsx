import { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import {
  addSpecialization,
  joinSpecializations,
  parseSpecializations,
  removeSpecialization,
} from '@/utils/specializations';

interface EditTeacherSpecializationsModalProps {
  open: boolean;
  onClose: () => void;
  teacherName: string;
  value?: string;
  options: string[];
  saving?: boolean;
  onSave: (specialization: string) => void;
}

export function EditTeacherSpecializationsModal({
  open,
  onClose,
  teacherName,
  value,
  options,
  saving,
  onSave,
}: EditTeacherSpecializationsModalProps) {
  const [specs, setSpecs] = useState<string[]>([]);
  const [custom, setCustom] = useState('');

  useEffect(() => {
    if (open) {
      setSpecs(parseSpecializations(value));
      setCustom('');
    }
  }, [open, value]);

  const availableToAdd = useMemo(
    () =>
      options.filter(
        (opt) => !specs.some((s) => s.toLowerCase() === opt.toLowerCase())
      ),
    [options, specs]
  );

  const addCustom = () => {
    const next = addSpecialization(specs, custom);
    if (next.length !== specs.length) {
      setSpecs(next);
      setCustom('');
    }
  };

  const handleSave = () => {
    onSave(joinSpecializations(specs));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Specializations"
      className="max-w-lg"
    >
      <p className="mb-4 text-sm text-slate-600">
        Add or remove instruments and subjects for <strong>{teacherName}</strong>.
      </p>

      <div className="mb-4 min-h-[2.5rem] rounded-lg border border-slate-200 bg-slate-50 p-2">
        {specs.length === 0 ? (
          <p className="px-1 py-1 text-sm text-slate-500">None added yet</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {specs.map((spec) => (
              <span
                key={spec}
                className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-2.5 py-1 text-sm font-medium text-primary-800"
              >
                {spec}
                <button
                  type="button"
                  onClick={() => setSpecs((list) => removeSpecialization(list, spec))}
                  className="rounded-full p-0.5 hover:bg-primary-200"
                  aria-label={`Remove ${spec}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        Add specialization
      </p>
      <div className="mb-4 flex gap-2">
        <Input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="e.g. Saxophone"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustom();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={addCustom} disabled={!custom.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {availableToAdd.length > 0 && (
        <>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quick add
          </p>
          <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
            {availableToAdd.map((spec) => (
              <button
                key={spec}
                type="button"
                onClick={() => setSpecs((list) => addSpecialization(list, spec))}
                className={cn(
                  'rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-700',
                  'hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
                )}
              >
                + {spec}
              </button>
            ))}
          </div>
        </>
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
