import { parseStudentNotes } from '@/utils/studentNotes';
import type { StudentSelfProfile } from '@/types';

const ACCOUNT_DETAIL_FIELDS = [
  { key: 'email', label: 'Email' },
  { key: 'dateOfBirth', label: 'Date of birth' },
  { key: 'gender', label: 'Gender' },
  { key: 'schoolName', label: 'School' },
  { key: 'instruments', label: 'Instruments' },
  { key: 'experience', label: 'Level' },
] as const;

function isFieldFilled(profile: StudentSelfProfile, key: (typeof ACCOUNT_DETAIL_FIELDS)[number]['key']) {
  const parsed = parseStudentNotes(profile.notes);
  switch (key) {
    case 'email':
      return Boolean(profile.email?.trim());
    case 'dateOfBirth':
      return Boolean(profile.dateOfBirth?.trim());
    case 'gender':
      return Boolean(profile.gender?.trim());
    case 'schoolName':
      return Boolean(profile.schoolName?.trim());
    case 'instruments':
      return parsed.instruments.length > 0;
    case 'experience':
      return Boolean(parsed.experience.trim());
  }
}

export function getStudentAccountCompleteness(profile: StudentSelfProfile): number {
  const filled = ACCOUNT_DETAIL_FIELDS.filter((f) => isFieldFilled(profile, f.key)).length;
  return Math.round((filled / ACCOUNT_DETAIL_FIELDS.length) * 100);
}

export function getMissingAccountDetailLabels(profile: StudentSelfProfile): string[] {
  return ACCOUNT_DETAIL_FIELDS.filter((f) => !isFieldFilled(profile, f.key)).map((f) => f.label);
}

export function accountCompletenessMessage(percent: number): string {
  if (percent >= 100) return 'All account details are complete.';
  if (percent <= 0) return 'No account details yet — tap Edit to add your information.';
  return 'Complete the remaining account details to reach 100%.';
}
