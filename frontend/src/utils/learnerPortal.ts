import type { UserRole } from '@/types';

export const PORTAL_ROLES = ['Admin', 'Teacher', 'Student', 'Parent'] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];

/** Learner portal roles (Parent kept only for legacy JWT redirect). */
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
  return '/student/dashboard';
}

export function studentCoursesPath(): string {
  return '/student/courses';
}

export function parentChildrenPath(): string {
  return '/student/courses';
}

/** Courses / assignment page for learners. */
export function learnerCoursesPath(_role?: UserRole): string {
  return studentCoursesPath();
}

/** Map legacy /parent/... bookmarks onto /student/... */
export function learnerPortalPath(path: string, _role?: UserRole): string {
  if (path.startsWith('/parent/')) {
    if (path === '/parent/children' || path.startsWith('/parent/children/')) {
      return path.replace('/parent/children', '/student/courses');
    }
    return path.replace('/parent/', '/student/');
  }
  return path;
}

export function dashboardPathForRole(role: PortalRole): string {
  if (role === 'Admin') return '/admin/dashboard';
  if (role === 'Teacher') return '/teacher/dashboard';
  return studentDashboardPath();
}
