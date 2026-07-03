export interface SqlAccountChild {
  branchName: string;
  attention?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface SqlAccountParent {
  customerCode: string;
  parentName: string;
  parentEmail?: string | null;
  children: SqlAccountChild[];
}

export interface SqlAccountStatus {
  configured: boolean;
  connected: boolean;
  databasePath?: string | null;
}

export interface SqlAccountChildEnrollment {
  docNo: string;
  docDate?: string | null;
  className: string;
  itemCode?: string | null;
  qty?: string | null;
  unitPrice?: string | null;
  amount?: string | null;
  deliveryDate?: string | null;
}

export interface SqlAccountChildEnrollments {
  customerCode: string;
  branchName: string;
  enrollments: SqlAccountChildEnrollment[];
}
