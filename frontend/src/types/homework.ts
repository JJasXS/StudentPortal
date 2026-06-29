export interface HomeworkSubmission {
  id: string;
  studentUserId: string;
  studentName: string;
  classId: string;
  className: string;
  courseId: string;
  courseName: string;
  fileName: string;
  uploadedAt: string;
  note?: string;
}
