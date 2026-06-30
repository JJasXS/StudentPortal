export type LeaveRequestStatus =
  | 'Pending'
  | 'Rejected'
  | 'Approved'
  | 'ReplacementNeeded'
  | 'AwaitingTeacher'
  | 'TeacherCountered'
  | 'Confirmed';

export type TeacherReplacementResponse = 'Pending' | 'Accepted' | 'Countered';

export interface ReplacementSlot {
  teacherUserId: string;
  teacherName: string;
  proposedDate: string;
  proposedStartTime: string;
  proposedEndTime: string;
  teacherResponse: TeacherReplacementResponse;
  teacherCounterDate?: string;
  teacherCounterStartTime?: string;
  teacherCounterEndTime?: string;
  teacherMessage?: string;
  confirmedAt?: string;
}

export interface LeaveRequest {
  id: string;
  studentUserId: string;
  studentName: string;
  classId: string;
  className: string;
  courseName: string;
  sessionDate: string;
  reason: string;
  status: LeaveRequestStatus;
  needsReplacement: boolean;
  adminNote?: string;
  replacement?: ReplacementSlot;
  createdAt: string;
  updatedAt: string;
}
