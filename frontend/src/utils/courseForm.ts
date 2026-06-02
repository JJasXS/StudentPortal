import type { Course } from '@/types';

export const COURSE_CATEGORIES = ['Piano', 'Guitar', 'Violin', 'Vocal', 'Drums', 'Other'] as const;
export const COURSE_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const;

export interface CourseFormValues {
  courseName: string;
  category: string;
  description: string;
  level: string;
  defaultDurationMinutes: number;
  isActive: boolean;
}

export const emptyCourseForm = (): CourseFormValues => ({
  courseName: '',
  category: 'Piano',
  description: '',
  level: 'Beginner',
  defaultDurationMinutes: 60,
  isActive: true,
});

export function courseToForm(course: Course): CourseFormValues {
  return {
    courseName: course.courseName,
    category: course.category,
    description: course.description ?? '',
    level: course.level,
    defaultDurationMinutes: course.defaultDurationMinutes,
    isActive: course.isActive,
  };
}

export function formToPayload(values: CourseFormValues, id?: string) {
  return {
    id: id ?? '00000000-0000-0000-0000-000000000000',
    courseName: values.courseName.trim(),
    category: values.category,
    description: values.description.trim() || undefined,
    level: values.level,
    defaultDurationMinutes: values.defaultDurationMinutes,
    isActive: values.isActive,
  };
}
