import type { ParentProfile } from '@/types';

export interface ParentFormValues {
  fullName: string;
  email: string;
  phoneNumber: string;
  relationship: string;
  address: string;
  password: string;
}

export function parentToForm(parent: ParentProfile): ParentFormValues {
  return {
    fullName: parent.fullName,
    email: parent.email,
    phoneNumber: parent.phoneNumber ?? '',
    relationship: parent.relationship ?? '',
    address: parent.address ?? '',
    password: '',
  };
}

export function formToParentPayload(values: ParentFormValues) {
  return {
    fullName: values.fullName.trim(),
    email: values.email.trim(),
    password: values.password,
    phoneNumber: values.phoneNumber.trim() || undefined,
    relationship: values.relationship.trim() || undefined,
    address: values.address.trim() || undefined,
  };
}

export const emptyParentForm = (): ParentFormValues => ({
  fullName: '',
  email: '',
  phoneNumber: '',
  relationship: '',
  address: '',
  password: '',
});
