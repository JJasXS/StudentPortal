import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, MoreVertical, User } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { teacherEventColor } from '@/components/calendar/calendarStyles';
import type { CalendarEvent } from '@/components/calendar/WeekCalendar';

function formatTimeRange(start?: string, end?: string) {
  const fmt = (t?: string) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(start);
}

function formatTimeShort(time?: string) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function isErpEvent(event: CalendarEvent) {
  return event.id.startsWith('erp-');
}

interface CalendarSessionDetailModalProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onReplace?: (event: CalendarEvent) => void;
  onCancel?: (event: CalendarEvent) => void;
}

function EventActionsMenu({
  event,
  onReplace,
  onCancel,
  onClose,
}: {
  event: CalendarEvent;
  onReplace?: (event: CalendarEvent) => void;
  onCancel?: (event: CalendarEvent) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!isErpEvent(event) || (!onReplace && !onCancel) || event.session.status === 'Cancelled') {
    return null;
  }

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Session actions"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {onReplace && (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              onClick={() => {
                setOpen(false);
                onClose();
                onReplace(event);
              }}
            >
              Schedule replacement
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
              onClick={() => {
                setOpen(false);
                onClose();
                onCancel(event);
              }}
            >
              Cancel session
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function CalendarSessionDetailModal({
  event,
  onClose,
  onReplace,
  onCancel,
}: CalendarSessionDetailModalProps) {
  if (!event) return null;

  const { session, courseName, className, teacherName, location, href, studentName, branchName } =
    event;
  const displayClass = className ?? session.className ?? 'Class';

  return (
    <Modal
      open={Boolean(event)}
      onClose={onClose}
      title="Class session"
      className="max-w-4xl max-h-[85vh] flex flex-col"
      headerExtra={
        <EventActionsMenu event={event} onReplace={onReplace} onCancel={onCancel} onClose={onClose} />
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Course</p>
          <p className="text-lg font-semibold text-slate-900">{courseName ?? '—'}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-slate-500">Class</p>
            <p className="font-medium text-slate-900">{displayClass}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Status</p>
            <StatusBadge status={session.status} />
          </div>
        </div>

        {(studentName || branchName) && (
          <div>
            <p className="text-xs text-slate-500">Student</p>
            <p className="font-medium text-slate-900">{studentName ?? branchName}</p>
          </div>
        )}

        <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm">
          <p className="flex items-center gap-2 text-slate-700">
            <Clock className="h-4 w-4 shrink-0 text-slate-400" />
            <span>
              {formatDateDDMMYYYY(session.sessionDate)} ·{' '}
              {formatTimeRange(session.startTime, session.endTime)}
            </span>
          </p>
          {teacherName && (
            <p className="flex items-center gap-2 text-slate-700">
              <User className="h-4 w-4 shrink-0 text-slate-400" />
              {teacherName}
            </p>
          )}
          {location && (
            <p className="flex items-center gap-2 text-slate-700">
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
              {location}
            </p>
          )}
        </div>

        {session.topic && (
          <div>
            <p className="text-xs font-medium text-slate-500">Lesson topic</p>
            <p className="mt-1 text-sm text-slate-800">{session.topic}</p>
          </div>
        )}

        {session.notes?.trim() && (
          <div>
            <p className="text-xs font-medium text-slate-500">Notes</p>
            <p className="mt-1 text-sm text-slate-700">{session.notes}</p>
          </div>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          {href && (
            <Link to={href} onClick={onClose}>
              <Button type="button">View class</Button>
            </Link>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function CalendarEventChip({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick?: () => void;
}) {
  const classLabel =
    event.courseName ?? event.className ?? event.session.className ?? 'Class';
  const teacher = event.teacherName ?? '—';
  const time = formatTimeShort(event.session.startTime);

  const body = (
    <div
      className={`rounded border px-1.5 py-1 text-left text-[10px] leading-snug ${teacherEventColor(event.teacherUserId, event.session.status)}`}
    >
      <p className="truncate font-semibold">
        {classLabel} | {time}
      </p>
      <p className="truncate opacity-80">{teacher}</p>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left hover:opacity-90">
        {body}
      </button>
    );
  }

  return body;
}
