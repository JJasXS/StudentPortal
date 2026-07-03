import type { UserRole } from '@/types';

export const PORTAL_ROLES = ['Admin', 'Teacher', 'Student', 'Parent'] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];

/** Student + parent accounts share the learner portal UI. */
export function isStudentPortalRole(role?: UserRole): boolean {
  return role === 'Student' || role === 'Parent';
}

export function canSignIn(role?: UserRole): role is PortalRole {
  return role === 'Admin' || role === 'Teacher' || role === 'Student' || role === 'Parent';
}

export function studentDashboardPath(): string {
  return '/student/dashboard';
}

export function parentDashboardPath(): string {
  return '/parent/dashboard';
}

export function studentCoursesPath(): string {
  return '/student/courses';
}

export function parentChildrenPath(): string {
  return '/parent/children';
}

/** Courses page path — students use /student/courses, parents use /parent/children. */
export function learnerCoursesPath(role?: UserRole): string {
  return role === 'Parent' ? parentChildrenPath() : studentCoursesPath();
}

/** Map a /student/... path to the parent portal equivalent. */
export function learnerPortalPath(path: string, role?: UserRole): string {
  if (role !== 'Parent' || !path.startsWith('/student/')) return path;
  if (path === studentCoursesPath() || path.startsWith(`${studentCoursesPath()}/`)) {
    return path.replace(studentCoursesPath(), parentChildrenPath());
  }
  return path.replace('/student/', '/parent/');
}

export function dashboardPathForRole(role: PortalRole): string {
  if (role === 'Admin') return '/admin/dashboard';
  if (role === 'Teacher') return '/teacher/dashboard';
  if (role === 'Parent') return parentDashboardPath();
  return studentDashboardPath();
}
