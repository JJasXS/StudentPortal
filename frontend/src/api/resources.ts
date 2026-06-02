import apiClient from './client';
import type {
  Announcement,
  Attendance,
  ClassItem,
  ClassSession,
  Course,
  Enrollment,
  Invoice,
  LessonNote,
  ParentProfile,
  StudentProfile,
  TeacherProfile,
  User,
} from '@/types';

export const usersApi = {
  getAll: () => apiClient.get<User[]>('/users').then((r) => r.data),
  getById: (id: string) => apiClient.get<User>(`/users/${id}`).then((r) => r.data),
  create: (data: Partial<User> & { password?: string }) => apiClient.post<User>('/users', data).then((r) => r.data),
  update: (id: string, data: Partial<User>) => apiClient.put<User>(`/users/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/users/${id}`),
};

export const studentsApi = {
  getAll: () => apiClient.get<StudentProfile[]>('/students').then((r) => r.data),
  getById: (id: string) => apiClient.get<StudentProfile>(`/students/${id}`).then((r) => r.data),
  create: (data: Partial<StudentProfile> & { password?: string; email?: string; fullName?: string }) =>
    apiClient.post<StudentProfile>('/students', data).then((r) => r.data),
  update: (id: string, data: Partial<StudentProfile>) =>
    apiClient.put<StudentProfile>(`/students/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/students/${id}`),
};

export const parentsApi = {
  getAll: () => apiClient.get<ParentProfile[]>('/parents').then((r) => r.data),
  getById: (id: string) => apiClient.get<ParentProfile>(`/parents/${id}`).then((r) => r.data),
  create: (data: Partial<ParentProfile> & { password?: string; email?: string; fullName?: string }) =>
    apiClient.post<ParentProfile>('/parents', data).then((r) => r.data),
  update: (id: string, data: Partial<ParentProfile>) =>
    apiClient.put<ParentProfile>(`/parents/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/parents/${id}`),
};

export const teachersApi = {
  getAll: () => apiClient.get<TeacherProfile[]>('/teachers').then((r) => r.data),
  getById: (id: string) => apiClient.get<TeacherProfile>(`/teachers/${id}`).then((r) => r.data),
  create: (data: Partial<TeacherProfile> & { password?: string; email?: string; fullName?: string }) =>
    apiClient.post<TeacherProfile>('/teachers', data).then((r) => r.data),
  update: (id: string, data: Partial<TeacherProfile>) =>
    apiClient.put<TeacherProfile>(`/teachers/${id}`, data).then((r) => r.data),
  updateEmploymentType: (id: string, employmentType: string) =>
    apiClient
      .patch<TeacherProfile>(`/teachers/${id}/employment-type`, { employmentType })
      .then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/teachers/${id}`),
};

export const coursesApi = {
  getAll: () => apiClient.get<Course[]>('/courses').then((r) => r.data),
  getById: (id: string) => apiClient.get<Course>(`/courses/${id}`).then((r) => r.data),
  create: (data: Partial<Course>) => apiClient.post<Course>('/courses', data).then((r) => r.data),
  update: (id: string, data: Partial<Course>) => apiClient.put<Course>(`/courses/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/courses/${id}`),
};

export const classesApi = {
  getAll: () => apiClient.get<ClassItem[]>('/classes').then((r) => r.data),
  getById: (id: string) => apiClient.get<ClassItem>(`/classes/${id}`).then((r) => r.data),
  create: (data: Partial<ClassItem>) => apiClient.post<ClassItem>('/classes', data).then((r) => r.data),
  update: (id: string, data: Partial<ClassItem>) => apiClient.put<ClassItem>(`/classes/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/classes/${id}`),
};

export const enrollmentsApi = {
  getAll: () => apiClient.get<Enrollment[]>('/enrollments').then((r) => r.data),
  create: (data: Partial<Enrollment>) => apiClient.post<Enrollment>('/enrollments', data).then((r) => r.data),
  update: (id: string, data: Partial<Enrollment>) =>
    apiClient.put<Enrollment>(`/enrollments/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/enrollments/${id}`),
};

export const classSessionsApi = {
  getAll: () => apiClient.get<ClassSession[]>('/class-sessions').then((r) => r.data),
  getById: (id: string) => apiClient.get<ClassSession>(`/class-sessions/${id}`).then((r) => r.data),
  create: (data: Partial<ClassSession>) => apiClient.post<ClassSession>('/class-sessions', data).then((r) => r.data),
  update: (id: string, data: Partial<ClassSession>) =>
    apiClient.put<ClassSession>(`/class-sessions/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/class-sessions/${id}`),
};

export const attendanceApi = {
  getAll: () => apiClient.get<Attendance[]>('/attendance').then((r) => r.data),
  getBySession: (sessionId: string) =>
    apiClient.get<Attendance[]>(`/attendance/session/${sessionId}`).then((r) => r.data),
  create: (data: Partial<Attendance>) => apiClient.post<Attendance>('/attendance', data).then((r) => r.data),
  update: (id: string, data: Partial<Attendance>) =>
    apiClient.put<Attendance>(`/attendance/${id}`, data).then((r) => r.data),
  getCheckIn: (sessionId: string) =>
    apiClient
      .get<import('@/types').AttendanceCheckInInfo>(`/attendance/check-in/session/${sessionId}`, {
        validateStatus: (status) => status === 200 || status === 204,
      })
      .then((r) => (r.status === 204 ? null : r.data)),
  generateCheckIn: (classSessionId: string) =>
    apiClient
      .post<import('@/types').AttendanceCheckInInfo>('/attendance/check-in/generate', { classSessionId })
      .then((r) => r.data),
  redeemCheckIn: (code: string) =>
    apiClient.post<Attendance>('/attendance/check-in/redeem', { code }).then((r) => r.data),
};

export const lessonNotesApi = {
  getAll: () => apiClient.get<LessonNote[]>('/lesson-notes').then((r) => r.data),
  getByStudent: (studentId: string) =>
    apiClient.get<LessonNote[]>(`/lesson-notes/student/${studentId}`).then((r) => r.data),
  create: (data: Partial<LessonNote>) => apiClient.post<LessonNote>('/lesson-notes', data).then((r) => r.data),
  update: (id: string, data: Partial<LessonNote>) =>
    apiClient.put<LessonNote>(`/lesson-notes/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/lesson-notes/${id}`),
};

export const announcementsApi = {
  getAll: () => apiClient.get<Announcement[]>('/announcements').then((r) => r.data),
  create: (data: Partial<Announcement>) => apiClient.post<Announcement>('/announcements', data).then((r) => r.data),
  update: (id: string, data: Partial<Announcement>) =>
    apiClient.put<Announcement>(`/announcements/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/announcements/${id}`),
};

export const invoicesApi = {
  getAll: () => apiClient.get<Invoice[]>('/invoices').then((r) => r.data),
  getById: (id: string) => apiClient.get<Invoice>(`/invoices/${id}`).then((r) => r.data),
};
