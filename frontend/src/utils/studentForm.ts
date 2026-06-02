import type { StudentProfile } from '@/types';

export interface StudentFormValues {
  fullName: string;
  email: string;
  studentCode: string;
  dateOfBirth: string;
  gender: string;
  schoolName: string;
  notes: string;
  password: string;
}

export function studentToForm(student: StudentProfile): StudentFormValues {
  return {
    fullName: student.fullName,
    email: student.email,
    studentCode: student.studentCode,
    dateOfBirth: student.dateOfBirth?.slice(0, 10) ?? '',
    gender: student.gender ?? '',
    schoolName: student.schoolName ?? '',
    notes: student.notes ?? '',
    password: '',
  };
}

export function formToStudentPayload(values: StudentFormValues) {
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    password: values.password,
    studentCode: values.studentCode.trim(),
    dateOfBirth: values.dateOfBirth || undefined,
    gender: values.gender || undefined,
    schoolName: values.schoolName.trim() || undefined,
    notes: values.notes.trim() || undefined,
  };
}
