import type { StudentProfile } from '@/types';
import { normalizeGenderValue } from '@/utils/gender';

import { buildStudentInterestNotes } from '@/utils/studentNotes';

/** Initial password for admin-created students; they change it from Profile after sign-in. */
export const DEFAULT_STUDENT_PASSWORD = 'Student@123';

export const ADMIN_STUDENT_CREATE_STEPS = [
  { id: 1, label: 'Student & parent' },
  { id: 2, label: 'Review' },
] as const;

export interface StudentFormValues {
  parentUserId: string;
  fullName: string;
  email: string;
  studentCode: string;
  dateOfBirth: string;
  gender: string;
  phoneNumber: string;
  schoolName: string;
  instruments: string[];
  experience: string;
  notes: string;
  password: string;
  confirmPassword: string;
}

export const emptyStudentForm = (): StudentFormValues => ({
  parentUserId: '',
  fullName: '',
  email: '',
  studentCode: '',
  dateOfBirth: '',
  gender: 'Male',
  phoneNumber: '',
  schoolName: '',
  instruments: [],
  experience: '',
  notes: '',
  password: '',
  confirmPassword: '',
});

export function studentToForm(student: StudentProfile): StudentFormValues {
  return {
    parentUserId: '',
    fullName: student.fullName,
    email: student.email,
    studentCode: student.studentCode,
    dateOfBirth: student.dateOfBirth?.slice(0, 10) ?? '',
    gender: normalizeGenderValue(student.gender),
    phoneNumber: '',
    schoolName: student.schoolName ?? '',
    instruments: [],
    experience: '',
    notes: student.notes ?? '',
    password: '',
    confirmPassword: '',
  };
}

export function formToStudentPayload(values: StudentFormValues) {
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    password: values.password,
    studentCode: values.studentCode.trim() || undefined,
    dateOfBirth: values.dateOfBirth || undefined,
    gender: values.gender || undefined,
    phoneNumber: values.phoneNumber.trim() || undefined,
    schoolName: values.schoolName.trim() || undefined,
    notes:
      values.notes.trim() ||
      buildStudentInterestNotes(values.instruments, values.experience) ||
      undefined,
  };
}

/** Admin create: only essential fields; profile details are completed by the student later. */
export function formToStudentCreatePayload(values: StudentFormValues) {
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    phoneNumber: values.phoneNumber.trim(),
    password: values.password.trim() || DEFAULT_STUDENT_PASSWORD,
    parentUserId: values.parentUserId,
  };
}
