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
  const set = new Set<string>(COMMON_SPECIALIZATIONS);
  for (const teacher of teachers) {
    for (const spec of parseSpecializations(teacher.specialization)) {
      set.add(spec);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
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
