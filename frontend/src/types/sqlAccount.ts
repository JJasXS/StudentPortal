export interface SqlAccountCalendarTeacher {
  erpUserId: string;
  fullName: string;
  email: string;
  portalUserId?: string | null;
}

export interface ErpCalendarEvent {
  id: string;
  docKey: number;
  seq: number;
  classId?: string | null;
  courseId?: string | null;
  className: string;
  courseName?: string | null;
  teacherUserId?: string | null;
  teacherName?: string | null;
  studentName?: string | null;
  branchName?: string | null;
  itemCode?: string | null;
  customerCode?: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  status: string;
}

export interface SqlAccountCourseOption {
  itemCode: string;
  description: string;
  dayOfWeek?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  teacherName?: string | null;
}

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
  docKey: number;
  seq: number;
  docNo: string;
  docDate?: string | null;
  className: string;
  itemCode?: string | null;
  qty?: string | null;
  unitPrice?: string | null;
  amount?: string | null;
  deliveryDate?: string | null;
  classDay?: string | null;
  classTime?: string | null;
  classDate?: string | null;
  studentName?: string | null;
  conductedBy?: string | null;
  linkedClassId?: string | null;
  linkedClassName?: string | null;
  linkedClassDayOfWeek?: string | null;
  linkedClassStartTime?: string | null;
  linkedClassEndTime?: string | null;
  linkedClassTeacherName?: string | null;
  nextSessionDate?: string | null;
}

export interface SqlAccountChildEnrollments {
  customerCode: string;
  branchName: string;
  enrollments: SqlAccountChildEnrollment[];
}

export interface ItemCodeClassLink {
  id: string;
  itemCode: string;
  portalClassId: string;
  portalClassName?: string | null;
  createdAt: string;
}
