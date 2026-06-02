import type { ClassItem } from '@/types';

export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export interface ClassFormValues {
  className: string;
  teacherUserId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  maxStudents: number;
  location: string;
  isActive: boolean;
}

export function emptyClassForm(defaultDurationMinutes = 60): ClassFormValues {
  const startTime = '10:00';
  return {
    className: '',
    teacherUserId: '',
    dayOfWeek: 'Monday',
    startTime,
    endTime: addMinutesToTime(startTime, defaultDurationMinutes),
    maxStudents: 8,
    location: '',
    isActive: true,
  };
}

export function classToForm(item: ClassItem): ClassFormValues {
  return {
    className: item.className,
    teacherUserId: item.teacherUserId,
    dayOfWeek: item.dayOfWeek,
    startTime: normalizeTimeInput(item.startTime),
    endTime: normalizeTimeInput(item.endTime),
    maxStudents: item.maxStudents,
    location: item.location,
    isActive: item.isActive,
  };
}

/** HTML time inputs use HH:mm; API may return H:mm */
export function normalizeTimeInput(time: string): string {
  const parts = time.trim().split(':');
  if (parts.length < 2) return time;
  const h = parts[0].padStart(2, '0');
  const m = parts[1].padStart(2, '0');
  return `${h}:${m}`;
}

export function addMinutesToTime(startTime: string, minutes: number): string {
  const [h, m] = normalizeTimeInput(startTime).split(':').map(Number);
  const total = h * 60 + m + minutes;
  const endH = Math.floor((total % (24 * 60)) / 60);
  const endM = total % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

export function formToCreatePayload(values: ClassFormValues, courseId: string) {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    courseId,
    teacherUserId: values.teacherUserId,
    className: values.className.trim(),
    dayOfWeek: values.dayOfWeek,
    startTime: normalizeTimeInput(values.startTime),
    endTime: normalizeTimeInput(values.endTime),
    maxStudents: values.maxStudents,
    location: values.location.trim(),
    isActive: values.isActive,
  };
}
