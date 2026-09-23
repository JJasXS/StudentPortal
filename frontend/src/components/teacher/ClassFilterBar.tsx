import { useEffect, useMemo, useState } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  CLASS_TYPES,
  EMPTY_CLASS_FILTERS,
  INSTRUMENTS,
  classFiltersActive,
  collectDayOptions,
  collectGradeOptions,
  type ClassFilterState,
} from '@/utils/teacherClassFilters';
import type { ClassItem } from '@/types';

interface ClassFilterBarProps {
  classes: ClassItem[];
  filters: ClassFilterState;
  onChange: (next: ClassFilterState) => void;
}

function FilterFields({
  filters,
  days,
  grades,
  onChange,
}: {
  filters: ClassFilterState;
  days: string[];
  grades: string[];
  onChange: (patch: Partial<ClassFilterState>) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <Label htmlFor="filter-day">Day</Label>
        <Select
          id="filter-day"
          value={filters.day}
          onChange={(e) => onChange({ day: e.target.value })}
        >
          <option value="">All days</option>
          {days.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="filter-instrument">Instrument</Label>
        <Select
          id="filter-instrument"
          value={filters.instrument}
          onChange={(e) => onChange({ instrument: e.target.value })}
        >
          <option value="">All instruments</option>
          {INSTRUMENTS.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="filter-type">Type</Label>
        <Select
          id="filter-type"
          value={filters.type}
          onChange={(e) => onChange({ type: e.target.value })}
        >
          <option value="">All types</option>
          {CLASS_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="filter-grade">Grade</Label>
        <Select
          id="filter-grade"
          value={filters.grade}
          onChange={(e) => onChange({ grade: e.target.value })}
        >
          <option value="">All grades</option>
          {grades.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:col-span-2 lg:col-span-4">
        <Label htmlFor="filter-status">Status</Label>
        <Select
          id="filter-status"
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value })}
          className="max-w-xs"
        >
          <option value="">All statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </Select>
      </div>
    </div>
  );
}

export function ClassFilterBar({ classes, filters, onChange }: ClassFilterBarProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(filters);
  const days = useMemo(() => collectDayOptions(classes), [classes]);
  const grades = useMemo(() => collectGradeOptions(classes), [classes]);
  const active = classFiltersActive(filters);

  useEffect(() => {
    if (modalOpen) setDraft(filters);
  }, [modalOpen, filters]);

  const patch = (partial: Partial<ClassFilterState>) =>
    onChange({ ...filters, ...partial });

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
            placeholder="Search class name, instrument, grade…"
            className="pl-9"
            aria-label="Search classes"
          />
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <Select
            value={filters.day}
            onChange={(e) => patch({ day: e.target.value })}
            className="w-36"
            aria-label="Filter by day"
          >
            <option value="">Day</option>
            {days.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
          <Select
            value={filters.type}
            onChange={(e) => patch({ type: e.target.value })}
            className="w-36"
            aria-label="Filter by type"
          >
            <option value="">Type</option>
            {CLASS_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          <Select
            value={filters.grade}
            onChange={(e) => patch({ grade: e.target.value })}
            className="w-36"
            aria-label="Filter by grade"
          >
            <option value="">Grade</option>
            {grades.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        </div>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 gap-2 lg:hidden"
          onClick={() => setModalOpen(true)}
        >
          <Filter className="h-4 w-4" />
          Filter
          {active && (
            <span className="rounded-full bg-primary-100 px-1.5 text-[10px] font-semibold text-primary-700">
              On
            </span>
          )}
        </Button>
        {active && (
          <Button
            type="button"
            variant="ghost"
            className="shrink-0 gap-1 text-slate-600"
            onClick={() => onChange(EMPTY_CLASS_FILTERS)}
          >
            <X className="h-4 w-4" />
            Clear filters
          </Button>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Filter classes">
        <div className="space-y-4">
          <FilterFields
            filters={draft}
            days={days}
            grades={grades}
            onChange={(partial) => setDraft((prev) => ({ ...prev, ...partial }))}
          />
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraft(EMPTY_CLASS_FILTERS)}
            >
              Reset
            </Button>
            <Button
              type="button"
              onClick={() => {
                onChange(draft);
                setModalOpen(false);
              }}
            >
              Apply filters
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
