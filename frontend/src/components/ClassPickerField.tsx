import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import type { SqlAccountCourseOption } from '@/types/sqlAccount';

function courseLabel(course: SqlAccountCourseOption) {
  return `${course.description} (${course.itemCode})`;
}

function courseMatchesQuery(course: SqlAccountCourseOption, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    course.description.toLowerCase().includes(q) || course.itemCode.toLowerCase().includes(q)
  );
}

interface ClassPickerFieldProps {
  id?: string;
  options: SqlAccountCourseOption[];
  value: string;
  onChange: (itemCode: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

type MenuPos = { top: number; left: number; width: number };

export function ClassPickerField({
  id: idProp,
  options,
  value,
  onChange,
  placeholder = 'Search class…',
  disabled = false,
  className,
}: ClassPickerFieldProps) {
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const listId = `${inputId}-list`;
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<MenuPos | null>(null);

  const selected = options.find((c) => c.itemCode === value);

  useEffect(() => {
    if (!value) {
      setQuery('');
      return;
    }
    const match = options.find((c) => c.itemCode === value);
    if (match) setQuery(courseLabel(match));
  }, [value, options]);

  const updateMenuPos = () => {
    const el = inputRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 256),
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuPos(null);
      return;
    }
    updateMenuPos();
    window.addEventListener('resize', updateMenuPos);
    window.addEventListener('scroll', updateMenuPos, true);
    return () => {
      window.removeEventListener('resize', updateMenuPos);
      window.removeEventListener('scroll', updateMenuPos, true);
    };
  }, [open]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (containerRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
      if (selected) setQuery(courseLabel(selected));
      else if (!value) setQuery('');
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [selected, value]);

  const filtered = useMemo(
    () => options.filter((c) => courseMatchesQuery(c, query)),
    [options, query]
  );

  const handleInputChange = (text: string) => {
    setQuery(text);
    setOpen(true);
    if (selected && text !== courseLabel(selected)) {
      onChange('');
    }
  };

  const handleFocus = () => {
    setOpen(true);
    if (selected) {
      requestAnimationFrame(() => inputRef.current?.select());
    }
  };

  const pickCourse = (course: SqlAccountCourseOption) => {
    onChange(course.itemCode);
    setQuery(courseLabel(course));
    setOpen(false);
  };

  const showDropdown = open && !disabled && options.length > 0 && menuPos !== null;

  return (
    <div ref={containerRef} className={cn('relative min-w-[18rem]', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <Input
          ref={inputRef}
          id={inputId}
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-8 text-sm"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
        />
      </div>
      {showDropdown &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            style={{
              position: 'fixed',
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
            }}
            className="z-[80] max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">No classes match your search.</li>
            ) : (
              filtered.map((course) => {
                const active = course.itemCode === value;
                return (
                  <li key={course.itemCode} role="option" aria-selected={active}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pickCourse(course)}
                      className={cn(
                        'flex w-full flex-col items-start px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50',
                        active && 'bg-primary-50 text-primary-800'
                      )}
                    >
                      <span className="font-medium">{course.description}</span>
                      <span className="text-xs text-slate-500">{course.itemCode}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>,
          document.body
        )}
    </div>
  );
}
