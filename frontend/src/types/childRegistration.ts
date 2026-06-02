export interface PendingChildRegistration {
  id: string;
  parentUserId: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  schoolName?: string;
  instrument?: string;
  status: 'Pending';
  submittedAt: string;
}

export interface RegisterChildFormData {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  schoolName: string;
  instrument: string;
}
