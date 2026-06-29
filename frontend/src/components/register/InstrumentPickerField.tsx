import { useEffect, useState } from 'react';
import { ChevronDown, Music2, X } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import { fetchAvailableInstruments } from '@/utils/instruments';

interface InstrumentPickerFieldProps {
  id?: string;
  label?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

function hasInstrument(list: string[], name: string): boolean {
  const lower = name.toLowerCase();
  return list.some((item) => item.toLowerCase() === lower);
}

export function InstrumentPickerField({
  id = 'instrument',
  label = 'Instrument / programme',
  value,
  onChange,
  placeholder = 'Choose one or more instruments',
}: InstrumentPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [custom, setCustom] = useState('');
  const [pickOther, setPickOther] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchAvailableInstruments()
      .then(setInstruments)
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) {
      setCustom('');
      setPickOther(false);
    }
  }, [open]);

  const toggleInstrument = (name: string) => {
    if (hasInstrument(value, name)) {
      const lower = name.toLowerCase();
      onChange(value.filter((item) => item.toLowerCase() !== lower));
    } else {
      onChange([...value, name]);
    }
  };

  const applyCustom = () => {
    const trimmed = custom.trim();
    if (!trimmed) return;
    if (!hasInstrument(value, trimmed)) {
      onChange([...value, trimmed]);
    }
    setCustom('');
  };

  const removeInstrument = (name: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    const lower = name.toLowerCase();
    onChange(value.filter((item) => item.toLowerCase() !== lower));
  };

  const customSelections = value.filter(
    (item) => !instruments.some((i) => i.toLowerCase() === item.toLowerCase())
  );

  const summary =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? value[0]
        : `${value.length} instruments selected`;

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'mt-1 flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm shadow-sm transition',
          'hover:border-primary-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20'
        )}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <Music2 className="h-4 w-4 shrink-0 text-slate-400" />
          {value.length === 0 ? (
            <span className="truncate text-slate-400">{placeholder}</span>
          ) : value.length <= 2 ? (
            <span className="flex min-w-0 flex-wrap gap-1">
              {value.map((name) => (
                <span
                  key={name}
                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-800"
                >
                  <span className="truncate">{name}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => removeInstrument(name, e)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        removeInstrument(name, e as unknown as React.MouseEvent);
                      }
                    }}
                    className="rounded-full hover:bg-primary-100"
                    aria-label={`Remove ${name}`}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </span>
              ))}
            </span>
          ) : (
            <span className="truncate text-slate-900">{summary}</span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
      </button>
      <p className="mt-1 text-xs text-slate-500">
        Options come from courses at your centre — add a new course category in admin to list more.
      </p>

      <Modal open={open} onClose={() => setOpen(false)} title="Choose instruments" className="max-w-md">
        {loading ? (
          <p className="text-sm text-slate-500">Loading instruments…</p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Select all instruments or programmes you are interested in. Tap again to remove.
            </p>
            <div className="flex flex-wrap gap-2">
              {instruments.map((name) => {
                const selected = hasInstrument(value, name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleInstrument(name)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm font-medium transition',
                      selected
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-primary-300 hover:bg-primary-50'
                    )}
                    aria-pressed={selected}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            <div className="border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setPickOther((v) => !v)}
                className="text-sm font-medium text-primary-600 hover:underline"
              >
                {pickOther ? 'Hide other' : 'Other instrument not listed'}
              </button>
              {pickOther && (
                <div className="mt-3 flex gap-2">
                  <Input
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    placeholder="e.g. Saxophone"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        applyCustom();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={applyCustom} disabled={!custom.trim()}>
                    Add
                  </Button>
                </div>
              )}
              {customSelections.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {customSelections.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleInstrument(name)}
                      className="inline-flex items-center gap-1 rounded-full border border-primary-600 bg-primary-600 px-3 py-1 text-sm font-medium text-white"
                    >
                      {name}
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {value.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">
                  {value.length} selected: {value.join(', ')}
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
                  Clear all
                </Button>
              </div>
            )}

            <Button type="button" className="w-full" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
