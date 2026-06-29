import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input, Label } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import type { ParentProfile } from '@/types';

function parentLabel(parent: ParentProfile) {
  return `${parent.fullName} (${parent.email})`;
}

function parentMatchesQuery(parent: ParentProfile, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    parent.fullName.toLowerCase().includes(q) ||
    parent.email.toLowerCase().includes(q) ||
    (parent.phoneNumber?.toLowerCase().includes(q) ?? false)
  );
}

interface ParentPickerFieldProps {
  id?: string;
  label?: string;
  parents: ParentProfile[];
  value: string;
  onChange: (parentUserId: string) => void;
  placeholder?: string;
}

export function ParentPickerField({
  id: idProp,
  label = 'Parent account',
  parents,
  value,
  onChange,
  placeholder = 'Search by name or email…',
}: ParentPickerFieldProps) {
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const listId = `${inputId}-list`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const selected = parents.find((p) => p.userId === value);

  useEffect(() => {
    if (!value) return;
    const match = parents.find((p) => p.userId === value);
    if (match) setQuery(parentLabel(match));
  }, [value, parents]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const filteredParents = useMemo(
    () => parents.filter((p) => parentMatchesQuery(p, query)),
    [parents, query]
  );

  const handleInputChange = (text: string) => {
    setQuery(text);
    setOpen(true);
    if (selected && text !== parentLabel(selected)) {
      onChange('');
    }
  };

  const pickParent = (parent: ParentProfile) => {
    onChange(parent.userId);
    setQuery(parentLabel(parent));
    setOpen(false);
  };

  const showDropdown = open && parents.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <Label htmlFor={inputId}>{label}</Label>
      <div className="relative mt-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          id={inputId}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="pl-9"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
        />
      </div>
      {showDropdown && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {filteredParents.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">No parents match your search.</li>
          ) : (
            filteredParents.map((parent) => {
              const active = parent.userId === value;
              return (
                <li key={parent.userId} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickParent(parent)}
                    className={cn(
                      'flex w-full flex-col items-start px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50',
                      active && 'bg-primary-50 text-primary-800'
                    )}
                  >
                    <span className="font-medium">{parent.fullName}</span>
                    <span className="text-xs text-slate-500">{parent.email}</span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
      <p className="mt-1 text-xs text-slate-500">Type to filter by name, email, or phone.</p>
    </div>
  );
}
