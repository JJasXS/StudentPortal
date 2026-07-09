export type UserRole = 'Admin' | 'Teacher' | 'Student' | 'Parent';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
  isActive?: boolean;
  createdAt?: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  studentCode: string;
  dateOfBirth?: string;
  gender?: string;
  schoolName?: string;
  notes?: string;
  isActive?: boolean;
}

export interface LinkedParentSummary {
  fullName: string;
  email: string;
  phoneNumber?: string;
  relationship?: string;
}

export interface StudentSelfProfile extends StudentProfile {
  phoneNumber?: string;
  parent?: LinkedParentSummary | null;
}

export interface ParentProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  relationship?: string;
  address?: string;
  children?: string[];
  isActive?: boolean;
  createdAt?: string;
}

export type EmploymentType = 'FullTime' | 'PartTime' | 'Contract' | 'Substitute';

export interface TeacherProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  specialization?: string;
  bio?: string;
  hourlyRate?: number;
  employmentType?: EmploymentType;
  isActive?: boolean;
  createdAt?: string;
}

export interface Course {
  id: string;
  courseName: string;
  category: string;
  description?: string;
  level: string;
  defaultDurationMinutes: number;
  isActive: boolean;
}

export interface ClassItem {
  id: string;
  courseId: string;
  courseName?: string;
  teacherUserId: string;
  teacherName?: string;
  className: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
  enrolledCount?: number;
  location: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export interface Enrollment {
  id: string;
  studentUserId: string;
  studentName?: string;
  classId: string;
  className?: string;
  enrollmentDate: string;
  status: 'Active' | 'Paused' | 'Completed' | 'Cancelled';
}

export interface ClassSession {
  id: string;
  classId: string;
  className?: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  topic?: string;
  notes?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';
}

export type ClassSessionChangeType = 'Cancellation' | 'Replacement';

export interface ClassSessionChangeHistory {
  id: string;
  classSessionId: string;
  classId: string;
  className?: string | null;
  changeType: ClassSessionChangeType;
  actorUserId?: string | null;
  actorName?: string | null;
  reason?: string | null;
  previousSessionDate: string;
  previousStartTime: string;
  previousEndTime: string;
  previousStatus: string;
  newSessionDate?: string | null;
  newStartTime?: string | null;
  newEndTime?: string | null;
  newStatus?: string | null;
  replacementClassSessionId?: string | null;
  createdAt: string;
}

export type ClassAssignmentEntityType = 'Enrollment' | 'Class' | 'ClassSession';
export type ClassAssignmentOperation = 'Create' | 'Update' | 'Delete';

export interface ClassAssignmentChangeLog {
  id: string;
  classId: string;
  className?: string | null;
  entityType: ClassAssignmentEntityType;
  operation: ClassAssignmentOperation;
  entityId?: string | null;
  studentUserId?: string | null;
  studentName?: string | null;
  previousTeacherUserId?: string | null;
  previousTeacherName?: string | null;
  newTeacherUserId?: string | null;
  newTeacherName?: string | null;
  previousDayOfWeek?: string | null;
  newDayOfWeek?: string | null;
  previousClassStartTime?: string | null;
  newClassStartTime?: string | null;
  previousClassEndTime?: string | null;
  newClassEndTime?: string | null;
  previousSessionDate?: string | null;
  newSessionDate?: string | null;
  previousSessionStartTime?: string | null;
  newSessionStartTime?: string | null;
  previousSessionEndTime?: string | null;
  newSessionEndTime?: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
  reason?: string | null;
  createdAt: string;
}

export interface Attendance {
  id: string;
  classSessionId: string;
  sessionDate?: string;
  className?: string;
  studentUserId: string;
  studentName?: string;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  remarks?: string;
}

export interface AttendanceCheckInInfo {
  classSessionId: string;
  className?: string;
  code: string;
  sessionDate?: string;
  startTime?: string;
  endTime?: string;
  classStartAt?: string;
  classEndAt?: string;
}

export interface LessonNote {
  id: string;
  classSessionId?: string;
  className?: string;
  studentUserId?: string;
  studentName?: string;
  teacherUserId: string;
  teacherName?: string;
  noteTitle: string;
  noteContent: string;
  practiceInstructions?: string;
  homeworkId?: string | null;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category?: 'Holiday' | 'General' | 'Leave' | 'Replacement' | 'SessionChange';
  holidayDate?: string;
  targetRole: 'All' | UserRole;
  createdByUserId: string;
  createdByName?: string;
  isSystem?: boolean;
  relatedType?: string | null;
  relatedId?: string | null;
  createdAt: string;
}

export interface Invoice {
  id: string;
  studentUserId: string;
  studentName?: string;
  parentUserId?: string;
  parentName?: string;
  courseName?: string;
  className?: string;
  invoiceNo: string;
  amount: number;
  status: 'Draft' | 'Unpaid' | 'Paid' | 'Cancelled';
  billingPeriod?: string;
  dueDate: string;
  createdAt: string;
  paidAt?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalClasses: number;
  activeEnrollments: number;
}
