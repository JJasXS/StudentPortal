import { mockUsers } from '@/utils/mockData';
import type { ClassItem, ClassSession } from '@/types';
import type { ScheduleLessonItem } from '@/components/schedule/ScheduleLessonCard';
import type { ErpCalendarEvent } from '@/types/sqlAccount';

export function resolveMockStudentUserId(email?: string): string {
  if (!email) return '4';
  const match = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
  return match?.id ?? '4';
}

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function durationMinutes(startTime: string, endTime?: string) {
  if (!endTime) return 60;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return Math.max(15, eh * 60 + em - (sh * 60 + sm));
}

export function sessionToScheduleItem(
  session: ClassSession,
  cls?: ClassItem
): ScheduleLessonItem {
  const location = cls?.location ?? 'Room A';
  const minutes = durationMinutes(session.startTime, session.endTime);
  const courseName = cls?.courseName ?? 'Piano';

  return {
    id: session.id,
    sessionDate: session.sessionDate,
    startTime: session.startTime,
    endTime: session.endTime,
    title: `${location}, ${formatTime(session.startTime)}`,
    teacherName: cls?.teacherName,
    courseLabel: `${courseName} (${minutes} min)`,
    status: session.status,
    isMakeup:
      /make-?up|replacement/i.test(session.topic ?? '') ||
      /make-?up|replacement/i.test(session.notes ?? ''),
  };
}

export function erpEventToScheduleItem(
  erp: ErpCalendarEvent,
  options?: { showBranch?: boolean }
): ScheduleLessonItem {
  const minutes = durationMinutes(erp.startTime, erp.endTime);
  const courseName = erp.courseName ?? erp.className;
  const branchSuffix =
    options?.showBranch && erp.branchName ? ` · ${erp.branchName}` : '';

  return {
    id: erp.id,
    sessionDate: erp.sessionDate,
    startTime: erp.startTime,
    endTime: erp.endTime,
    title: `${erp.className}, ${formatTime(erp.startTime)}`,
    teacherName: erp.teacherName ?? undefined,
    courseLabel: `${courseName} (${minutes} min)${branchSuffix}`,
    status:
      (erp.status as ScheduleLessonItem['status']) === 'Cancelled'
        ? 'Cancelled'
        : (erp.status as ScheduleLessonItem['status']) ?? 'Scheduled',
  };
}
