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
  createdAt: string;
  updatedAt: string;
}
