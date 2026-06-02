export const EMPLOYMENT_TYPES = ['FullTime', 'PartTime', 'Contract', 'Substitute'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FullTime: 'Full Time',
  PartTime: 'Part Time',
  Contract: 'Contract',
  Substitute: 'Substitute',
};

export function getEmploymentTypeLabel(value?: string): string {
  if (!value) return 'Full Time';
  if (value in EMPLOYMENT_TYPE_LABELS) {
    return EMPLOYMENT_TYPE_LABELS[value as EmploymentType];
  }
  return value;
}

export function normalizeEmploymentType(value?: string): EmploymentType {
  if (!value) return 'FullTime';
  const found = EMPLOYMENT_TYPES.find(
    (t) => t.toLowerCase() === value.replace(/\s/g, '').toLowerCase()
  );
  return found ?? 'FullTime';
}
