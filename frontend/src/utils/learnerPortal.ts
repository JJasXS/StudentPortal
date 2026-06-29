import type { UserRole } from '@/types';

export const PORTAL_ROLES = ['Admin', 'Teacher', 'Student'] as const;
export type PortalRole = (typeof PORTAL_ROLES)[number];

export function isStudentPortalRole(role?: UserRole): boolean {
  return role === 'Student';
}

export function canSignIn(role?: UserRole): role is PortalRole {
  return role === 'Admin' || role === 'Teacher' || role === 'Student';
}

export function studentDashboardPath(): string {
  return '/student/dashboard';
}

export function dashboardPathForRole(role: PortalRole): string {
  if (role === 'Admin') return '/admin/dashboard';
  if (role === 'Teacher') return '/teacher/dashboard';
  return studentDashboardPath();
}
