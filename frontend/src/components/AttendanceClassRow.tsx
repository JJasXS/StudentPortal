import { Link } from 'react-router-dom';
import { AttendanceCheckInPanel } from '@/components/AttendanceCheckInPanel';
import { Button } from '@/components/ui/Button';
import { teacherAttendanceUrl } from '@/utils/attendanceLinks';
import type { ClassItem, ClassSession } from '@/types';

interface AttendanceClassRowProps {
  classItem: ClassItem;
  session?: ClassSession;
}

export function AttendanceClassRow({ classItem, session }: AttendanceClassRowProps) {
  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-slate-900">{classItem.className}</p>
        <p className="truncate text-xs text-slate-500">
          {classItem.dayOfWeek} · {classItem.startTime}–{classItem.endTime}
          {classItem.location ? ` · ${classItem.location}` : ''}
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 sm:ml-auto">
        {session ? (
          <AttendanceCheckInPanel
            session={session}
            className={classItem.className}
            compact
          />
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
        {session && (
          <Link to={teacherAttendanceUrl(classItem.id)}>
            <Button type="button" variant="outline" size="sm">
              Roster
            </Button>
          </Link>
        )}
      </div>
    </li>
  );
}
