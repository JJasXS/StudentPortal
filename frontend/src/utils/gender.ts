/** Display gender as F or M (handles legacy Female/Male values). */
export function formatGender(value?: string): string {
  if (!value?.trim()) return '—';
  const v = value.trim().toLowerCase();
  if (v === 'f' || v === 'female') return 'F';
  if (v === 'm' || v === 'male') return 'M';
  return value.trim().charAt(0).toUpperCase();
}

export const GENDER_OPTIONS = [
  { value: 'F', label: 'F' },
  { value: 'M', label: 'M' },
] as const;
