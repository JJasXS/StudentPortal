export const GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Others', label: 'Others' },
] as const;

export const DEFAULT_GENDER = 'Male';

/** Map legacy F/M values to canonical gender labels. */
export function normalizeGenderValue(value?: string): string {
  if (!value?.trim()) return DEFAULT_GENDER;
  const v = value.trim().toLowerCase();
  if (v === 'f' || v === 'female') return 'Female';
  if (v === 'm' || v === 'male') return 'Male';
  if (v === 'other' || v === 'others') return 'Others';
  return value.trim();
}

/** Display gender label (handles legacy F/M values). */
export function formatGender(value?: string): string {
  if (!value?.trim()) return '—';
  return normalizeGenderValue(value);
}
