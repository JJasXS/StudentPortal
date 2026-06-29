import { coursesApi } from '@/api/resources';
import type { Course } from '@/types';
import { mockCourses } from '@/utils/mockData';
import { COMMON_SPECIALIZATIONS } from '@/utils/specializations';

/** Distinct instrument/category names from active courses. */
export function getInstrumentsFromCourses(courses: Course[]): string[] {
  const names = new Set<string>();
  for (const course of courses) {
    if (course.isActive === false) continue;
    const category = course.category?.trim();
    if (category) names.add(category);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

/** Load instruments offered at the centre (from course categories in the DB). */
export async function fetchAvailableInstruments(): Promise<string[]> {
  try {
    const courses =
      import.meta.env.VITE_USE_MOCK === 'true'
        ? mockCourses
        : await coursesApi.getAll();
    const fromDb = getInstrumentsFromCourses(courses);
    if (fromDb.length > 0) return fromDb;
  } catch {
    // fall through to defaults
  }
  return [...COMMON_SPECIALIZATIONS];
}
