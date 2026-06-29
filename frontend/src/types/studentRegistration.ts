export interface StudentRegisterForm {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  schoolName: string;
  instruments: string[];
  experience: string;
  acceptTerms: boolean;
}

export const EMPTY_STUDENT_REGISTER_FORM: StudentRegisterForm = {
  fullName: '',
  dateOfBirth: '',
  gender: 'Male',
  email: '',
  phoneNumber: '',
  password: '',
  confirmPassword: '',
  schoolName: '',
  instruments: [],
  experience: '',
  acceptTerms: false,
};

export const STUDENT_REGISTER_STEPS = [
  { id: 1, label: 'About you' },
  { id: 2, label: 'Account' },
  { id: 3, label: 'Music & school' },
  { id: 4, label: 'Review' },
] as const;
