import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

interface SpecializationFilterModalProps {
  open: boolean;
  onClose: () => void;
  options: string[];
  selected: string[];
  onSelect: (selected: string[]) => void;
  counts?: Record<string, number>;
}

export function SpecializationFilterModal({
  open,
  onClose,
  options,
  selected,
  onSelect,
  counts,
}: SpecializationFilterModalProps) {
  const [draft, setDraft] = useState<string[]>(selected);

  useEffect(() => {
    if (open) setDraft(selected);
  }, [open, selected]);

  const toggle = (spec: string) => {
    setDraft((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const handleSelect = () => {
    onSelect(draft);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Specialization" className="max-w-lg">
      <p className="mb-4 text-sm text-slate-600">
        Choose one or more specializations, then press Select to filter the list.
      </p>

      {options.length === 0 ? (
        <p className="text-sm text-slate-500">No specializations found in staff records.</p>
      ) : (
        <div className="flex max-h-72 flex-wrap gap-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
          {options.map((spec) => {
            const active = draft.includes(spec);
            const count = counts?.[spec];
            return (
              <button
                key={spec}
                type="button"
                aria-pressed={active}
                onClick={() => toggle(spec)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-primary-300'
                )}
              >
                {spec}
                {count !== undefined && (
                  <span className={cn('ml-1.5 text-xs', active ? 'text-primary-100' : 'text-slate-400')}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setDraft([])}
          disabled={draft.length === 0}
          className="text-slate-600"
        >
          Clear all
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSelect}>
            Select{draft.length > 0 ? ` (${draft.length})` : ''}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
