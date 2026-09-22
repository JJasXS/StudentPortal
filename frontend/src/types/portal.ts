export type PortalLeaveStatus = 'Pending' | 'Rejected' | 'Approved' | 'Confirmed';

export interface ReplacementOption {
  date: string;
  time: string;
}

export interface PortalHomework {
  id: string;
  docKey: number;
  seq: number;
  customerCode: string;
  branchName: string;
  className?: string | null;
  itemCode?: string | null;
  title?: string | null;
  url?: string | null;
  note?: string | null;
  fileName?: string | null;
  filePath?: string | null;
  hasFile?: boolean;
  submittedBy: string;
  createdAt: string;
  assignmentId?: string | null;
  status?: 'Pending' | 'Completed' | 'Rejected' | string;
}

export type HomeworkReviewStatus = 'Pending' | 'Completed' | 'Rejected';

export interface PortalAssignment {
  id: string;
  className: string;
  itemCode?: string | null;
  title: string;
  instructions?: string | null;
  dueDate: string;
  createdByUserId: string;
  createdByName?: string | null;
  createdAt: string;
  hasSubmission?: boolean;
  submissionId?: string | null;
  submissionStatus?: string | null;
}

export interface HomeworkPendingCount {
  total: number;
  byBranch: { branchName: string; pendingCount: number }[];
}

export interface PortalLeaveRequest {
  id: string;
  occurrenceId?: string | null;
  docKey: number;
  seq: number;
  customerCode: string;
  branchName: string;
  className?: string | null;
  sessionDate: string;
  sessionStartTime?: string | null;
  reason: string;
  status: PortalLeaveStatus;
  adminNote?: string | null;
  needsReplacement: boolean;
  replOptions?: ReplacementOption[];
  replDate?: string | null;
  replStart?: string | null;
  replEnd?: string | null;
  replTeacher?: string | null;
  teacherResponse?: string | null;
  counterDate?: string | null;
  counterStart?: string | null;
  counterEnd?: string | null;
  counterMsg?: string | null;
  requestedBy?: string | null;
  requesterType?: 'Parent' | 'Teacher';
  createdAt: string;
  updatedAt: string;
}
