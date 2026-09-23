import type { CalendarEvent } from '@/components/calendar/WeekCalendar';
import type { ClassItem } from '@/types';
import type { ErpCalendarEvent } from '@/types/sqlAccount';

export function erpEventToCalendarEvent(
  erp: ErpCalendarEvent,
  classById?: Map<string, ClassItem>
): CalendarEvent {
  const cls = erp.classId ? classById?.get(erp.classId) : undefined;

  return {
    id: erp.id,
    session: {
      id: erp.id,
      classId: erp.classId ?? '',
      className: erp.className,
      sessionDate: erp.sessionDate,
      startTime: erp.startTime,
      endTime: erp.endTime,
      status: (erp.status as 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled') ?? 'Scheduled',
    },
    courseName: erp.courseName ?? cls?.courseName,
    className: erp.className,
    teacherName: erp.teacherName ?? cls?.teacherName,
    teacherUserId: erp.teacherUserId ?? cls?.teacherUserId,
    location: cls?.location,
    studentName: erp.studentName ?? undefined,
    branchName: erp.branchName ?? undefined,
    subtitle: erp.teacherName ?? erp.branchName ?? erp.studentName ?? cls?.teacherName,
    href:
      erp.classId && (erp.courseId ?? cls?.courseId)
        ? `/admin/courses/${erp.courseId ?? cls?.courseId}/classes/${erp.classId}?tab=sessions`
        : undefined,
  };
}

export function erpEventsInRange(events: ErpCalendarEvent[], start: string, end: string) {
  return events.filter((e) => e.sessionDate >= start && e.sessionDate <= end);
}

/** Teacher calendar: only sessions conducted by this teacher (not every class they share). */
export function isErpEventForTeacher(
  event: ErpCalendarEvent,
  user: { id: string; fullName?: string }
): boolean {
  if (event.teacherUserId && event.teacherUserId === user.id) return true;
  const name = user.fullName?.trim().toLowerCase();
  if (!name) return false;
  return event.teacherName?.trim().toLowerCase() === name;
}
