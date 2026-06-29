import { parseStudentNotes } from '@/utils/studentNotes';
import type { StudentSelfProfile } from '@/types';

const ACCOUNT_DETAIL_FIELDS = 6;

export function getStudentAccountCompleteness(profile: StudentSelfProfile): number {
  const parsed = parseStudentNotes(profile.notes);
  const filled = [
    Boolean(profile.email?.trim()),
    Boolean(profile.dateOfBirth?.trim()),
    Boolean(profile.gender?.trim()),
    Boolean(profile.schoolName?.trim()),
    parsed.instruments.length > 0,
    Boolean(parsed.experience.trim()),
  ].filter(Boolean).length;

  return Math.round((filled / ACCOUNT_DETAIL_FIELDS) * 100);
}

export function accountCompletenessMessage(percent: number): string {
  if (percent >= 100) return 'All account details are complete.';
  if (percent <= 0) return 'No account details yet — tap Edit to add your information.';
  return 'Complete the remaining account details to reach 100%.';
}
