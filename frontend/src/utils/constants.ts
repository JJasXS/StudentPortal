import type { UserRole } from '@/types';

export const ROLES: UserRole[] = ['Admin', 'Teacher', 'Student', 'Parent'];

export const ENROLLMENT_STATUSES = ['Active', 'Paused', 'Completed', 'Cancelled'] as const;
export const SESSION_STATUSES = ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled'] as const;
export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Excused'] as const;
export const INVOICE_STATUSES = ['Draft', 'Unpaid', 'Paid', 'Cancelled'] as const;
export const ACTIVE_STATUSES = ['Active', 'Cancelled'] as const;

export const TOKEN_KEY = 'mtp_token';
export const USER_KEY = 'mtp_user';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
