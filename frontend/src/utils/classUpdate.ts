import type { ClassItem } from '@/types';

/** Payload shape for PUT /classes/{id} */
export function classToUpdatePayload(item: ClassItem, teacherUserId: string) {
  return {
    id: item.id,
    courseId: item.courseId,
    teacherUserId,
    className: item.className,
    dayOfWeek: item.dayOfWeek,
    startTime: item.startTime,
    endTime: item.endTime,
    maxStudents: item.maxStudents,
    location: item.location,
    isActive: item.isActive,
  };
}
