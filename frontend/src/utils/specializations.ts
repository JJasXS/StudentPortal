import type { TeacherProfile } from '@/types';

export const COMMON_SPECIALIZATIONS = [
  'Piano',
  'Guitar',
  'Violin',
  'Vocal',
  'Drums',
  'Music Theory',
  'Ukulele',
  'Cello',
  'Flute',
] as const;

const CATALOG_STORAGE_KEY = 'mtp_specialization_catalog';
const HIDDEN_CATALOG_STORAGE_KEY = 'mtp_specialization_hidden';

export function loadCatalogSpecializations(): string[] {
  try {
    const raw = localStorage.getItem(CATALOG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCatalogSpecializations(extras: string[]) {
  localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(extras));
}

export function loadHiddenSpecializations(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_CATALOG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHiddenSpecializations(hidden: string[]) {
  localStorage.setItem(HIDDEN_CATALOG_STORAGE_KEY, JSON.stringify(hidden));
}

function isHiddenSpecialization(spec: string, hidden: string[]): boolean {
  const lower = spec.toLowerCase();
  return hidden.some((s) => s.toLowerCase() === lower);
}

/** User-added catalog entries (beyond built-in common list). */
export function addCatalogSpecialization(
  spec: string,
  teachers: TeacherProfile[] = []
): string[] {
  const trimmed = spec.trim();
  if (!trimmed) return collectSpecializations(teachers);

  if (isHiddenSpecialization(trimmed, loadHiddenSpecializations())) {
    saveHiddenSpecializations(removeSpecialization(loadHiddenSpecializations(), trimmed));
    return collectSpecializations(teachers);
  }

  const exists = collectSpecializations(teachers).some(
    (s) => s.toLowerCase() === trimmed.toLowerCase()
  );
  if (exists) return collectSpecializations(teachers);

  const isCommon = COMMON_SPECIALIZATIONS.some(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  if (!isCommon) {
    saveCatalogSpecializations(addSpecialization(loadCatalogSpecializations(), trimmed));
  }

  return collectSpecializations(teachers);
}

export function parseSpecializations(value?: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function joinSpecializations(specs: string[]): string {
  return specs.join(', ');
}

export function collectSpecializations(teachers: TeacherProfile[]): string[] {
  const hidden = loadHiddenSpecializations();
  const set = new Set<string>();

  for (const spec of COMMON_SPECIALIZATIONS) {
    if (!isHiddenSpecialization(spec, hidden)) set.add(spec);
  }
  for (const spec of loadCatalogSpecializations()) {
    if (!isHiddenSpecialization(spec, hidden)) set.add(spec);
  }
  for (const teacher of teachers) {
    for (const spec of parseSpecializations(teacher.specialization)) {
      if (!isHiddenSpecialization(spec, hidden)) set.add(spec);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Remove a specialization from the catalog and return teachers who had it assigned. */
export function removeCatalogSpecialization(
  spec: string,
  teachers: TeacherProfile[]
): { teacher: TeacherProfile; specialization: string }[] {
  const trimmed = spec.trim();
  if (!trimmed) return [];

  saveCatalogSpecializations(removeSpecialization(loadCatalogSpecializations(), trimmed));
  saveHiddenSpecializations(addSpecialization(loadHiddenSpecializations(), trimmed));

  return teachers
    .filter((t) =>
      parseSpecializations(t.specialization).some((s) => s.toLowerCase() === trimmed.toLowerCase())
    )
    .map((t) => ({
      teacher: t,
      specialization: joinSpecializations(
        removeSpecialization(parseSpecializations(t.specialization), trimmed)
      ),
    }));
}

export function countTeachersWithSpecialization(
  teachers: TeacherProfile[],
  spec: string
): number {
  const lower = spec.toLowerCase();
  return teachers.filter((t) =>
    parseSpecializations(t.specialization).some((s) => s.toLowerCase() === lower)
  ).length;
}

export function teacherMatchesSpecializations(
  teacher: TeacherProfile,
  selected: string[]
): boolean {
  if (selected.length === 0) return true;
  const teacherSpecs = parseSpecializations(teacher.specialization).map((s) => s.toLowerCase());
  return selected.some((s) => teacherSpecs.includes(s.toLowerCase()));
}

/** Compact label for table cells; full string for tooltips. */
export function formatSpecializationDisplay(
  value?: string,
  options?: { maxItems?: number; maxChars?: number }
): { text: string; full: string; specs: string[] } {
  const specs = parseSpecializations(value);
  const full = joinSpecializations(specs);
  if (specs.length === 0) {
    return { text: '—', full: '', specs: [] };
  }

  const maxItems = options?.maxItems ?? 2;
  if (specs.length > maxItems) {
    const text = `${specs.slice(0, maxItems).join(', ')}, +${specs.length - maxItems}`;
    return { text, full, specs };
  }

  const maxChars = options?.maxChars ?? 36;
  if (full.length > maxChars) {
    return {
      text: `${full.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`,
      full,
      specs,
    };
  }

  return { text: full, full, specs };
}

export function addSpecialization(current: string[] | undefined, next: string): string[] {
  const trimmed = next.trim();
  if (!trimmed) return current ?? [];
  const lower = trimmed.toLowerCase();
  const existing = current ?? [];
  if (existing.some((s) => s.toLowerCase() === lower)) return existing;
  return [...existing, trimmed];
}

export function removeSpecialization(current: string[], spec: string): string[] {
  const lower = spec.toLowerCase();
  return current.filter((s) => s.toLowerCase() !== lower);
}
