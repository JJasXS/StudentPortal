import { useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { SearchBox } from '@/components/SearchBox';
import { TeacherSpecializationCell } from '@/components/TeacherSpecializationCell';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import {
  addCatalogSpecialization,
  collectSpecializations,
  countTeachersWithSpecialization,
} from '@/utils/specializations';
import type { TeacherProfile } from '@/types';

interface TeacherSpecializationsTabProps {
  teachers: TeacherProfile[];
  savingId: string | null;
  onSave: (teacher: TeacherProfile, specialization: string) => void;
  onRemoveSpecialization?: (spec: string) => void | Promise<void>;
}

export function TeacherSpecializationsTab({
  teachers,
  savingId,
  onSave,
  onRemoveSpecialization,
}: TeacherSpecializationsTabProps) {
  const [nameFilter, setNameFilter] = useState('');
  const [newSpec, setNewSpec] = useState('');
  const [catalogVersion, setCatalogVersion] = useState(0);
  const [deleteMode, setDeleteMode] = useState(false);

  const specializationOptions = useMemo(
    () => collectSpecializations(teachers),
    [teachers, catalogVersion]
  );

  const filteredTeachers = useMemo(() => {
    const name = nameFilter.trim().toLowerCase();
    if (!name) return teachers;
    return teachers.filter((t) => t.fullName.toLowerCase().includes(name));
  }, [teachers, nameFilter]);

  const handleAddCatalogSpec = () => {
    const trimmed = newSpec.trim();
    if (!trimmed) return;
    addCatalogSpecialization(trimmed, teachers);
    setNewSpec('');
    setCatalogVersion((v) => v + 1);
  };

  const handleDeleteSpec = async (spec: string) => {
    const count = countTeachersWithSpecialization(teachers, spec);
    const message =
      count > 0
        ? `Remove "${spec}" from the catalog and unassign it from ${count} teacher${count === 1 ? '' : 's'}?`
        : `Remove "${spec}" from the catalog?`;
    if (!window.confirm(message)) return;

    await onRemoveSpecialization?.(spec);
    setCatalogVersion((v) => v + 1);
  };

  return (
    <div className="divide-y divide-slate-200">
      <div className="space-y-4 p-4 sm:p-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Add specialization</h3>
          <p className="mt-1 text-sm text-slate-500">
            Add instruments or subjects to the catalog, then assign them to teachers below.
          </p>
        </div>
        <div className="flex max-w-xl flex-wrap gap-2">
          <Input
            value={newSpec}
            onChange={(e) => setNewSpec(e.target.value)}
            placeholder="e.g. Saxophone"
            className="min-w-[12rem] flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddCatalogSpec();
              }
            }}
          />
          <Button type="button" onClick={handleAddCatalogSpec} disabled={!newSpec.trim()}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
          <button
            type="button"
            onClick={() => setDeleteMode((on) => !on)}
            aria-pressed={deleteMode}
            aria-label={deleteMode ? 'Exit delete mode' : 'Delete specializations'}
            title={deleteMode ? 'Exit delete mode' : 'Delete specializations'}
            className={cn(
              'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-4 text-sm font-medium transition-colors',
              deleteMode
                ? 'border-red-600 bg-red-50 text-red-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-red-300 hover:text-red-700'
            )}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            {deleteMode ? 'Done' : 'Delete'}
          </button>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Catalog ({specializationOptions.length})
          </p>
          {deleteMode && (
            <p className="mb-2 text-sm text-red-600">
              Click a specialization to remove it from the catalog.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {specializationOptions.map((spec) => {
              const count = countTeachersWithSpecialization(teachers, spec);
              return (
                <span
                  key={spec}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm',
                    deleteMode
                      ? 'cursor-pointer border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  )}
                >
                  {deleteMode ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteSpec(spec)}
                      className="inline-flex items-center gap-1.5"
                      aria-label={`Delete ${spec}`}
                    >
                      <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {spec}
                    </button>
                  ) : (
                    spec
                  )}
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-xs',
                      deleteMode ? 'bg-white/80 text-red-600' : 'bg-white text-slate-500'
                    )}
                  >
                    {count}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Assign to teachers</h3>
            <p className="mt-1 text-sm text-slate-500">
              Click a teacher&apos;s specializations to add or remove items.
            </p>
          </div>
          <SearchBox
            value={nameFilter}
            onChange={setNameFilter}
            placeholder="Search by name..."
            className="max-w-xs"
          />
        </div>

        <DataTable
          embedded
          data={filteredTeachers}
          emptyMessage={
            nameFilter.trim() ? 'No teachers match your search.' : 'No teachers found.'
          }
          columns={[
            {
              key: 'fullName',
              header: 'Teacher',
              sortable: true,
              sortType: 'text',
              getSortValue: (t) => t.fullName,
            },
            {
              key: 'specialization',
              header: 'Specializations',
              className: 'max-w-md',
              sortable: true,
              sortType: 'text',
              getSortValue: (t) => t.specialization ?? '',
              render: (t) => (
                <TeacherSpecializationCell
                  teacher={t}
                  options={specializationOptions}
                  editable
                  saving={savingId === t.id}
                  onSave={onSave}
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
