import { mockEnrollments } from '@/utils/mockData';
import type { Enrollment } from '@/types';

const STORAGE_KEY = 'mtp_mock_enrollments';

export function loadMockEnrollments(): Enrollment[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Enrollment[];
  } catch {
    /* ignore */
  }
  return [...mockEnrollments];
}

export function saveMockEnrollments(list: Enrollment[]) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function resetMockEnrollments() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export function enrollmentsForClass(all: Enrollment[], classId: string) {
  return all.filter((e) => e.classId === classId && e.status === 'Active');
}

export function activeEnrollmentCount(all: Enrollment[], classId: string) {
  return enrollmentsForClass(all, classId).length;
}
