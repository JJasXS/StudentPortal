import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { calendarApi } from '@/api/resources';
import { erpEventToCalendarEvent } from '@/utils/erpCalendar';
import type { CalendarEvent } from '@/components/calendar/WeekCalendar';
import type { ErpCalendarEvent } from '@/types/sqlAccount';

interface LocationState {
  event?: CalendarEvent;
  erpEvent?: ErpCalendarEvent;
}

export default function CalendarEventEditPage() {
  const { eventId = '' } = useParams<{ eventId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as LocationState;

  const [loading, setLoading] = useState(!state.event && !state.erpEvent);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [event, setEvent] = useState<CalendarEvent | null>(state.event ?? null);

  const [sessionDate, setSessionDate] = useState(state.event?.session.sessionDate ?? '');
  const [startTime, setStartTime] = useState(state.event?.session.startTime ?? '');
  const [endTime, setEndTime] = useState(state.event?.session.endTime ?? '');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (state.event) {
      setEvent(state.event);
      setSessionDate(state.event.session.sessionDate);
      setStartTime(state.event.session.startTime);
      setEndTime(state.event.session.endTime);
      setLoading(false);
      return;
    }

    if (state.erpEvent) {
      const mapped = erpEventToCalendarEvent(state.erpEvent);
      setEvent(mapped);
      setSessionDate(mapped.session.sessionDate);
      setStartTime(mapped.session.startTime);
      setEndTime(mapped.session.endTime);
      setLoading(false);
      return;
    }

    if (!eventId) {
      setLoading(false);
      return;
    }

    calendarApi
      .getEvents()
      .then((events) => {
        const erp = events.find((e) => e.id === decodeURIComponent(eventId));
        if (!erp) {
          setError('Calendar event not found.');
          return;
        }
        const mapped = erpEventToCalendarEvent(erp);
        setEvent(mapped);
        setSessionDate(mapped.session.sessionDate);
        setStartTime(mapped.session.startTime);
        setEndTime(mapped.session.endTime);
      })
      .catch(() => setError('Could not load calendar event.'))
      .finally(() => setLoading(false));
  }, [eventId, state.event, state.erpEvent]);

  const title = useMemo(() => {
    if (!event) return 'Schedule replacement';
    return `Replace: ${event.className ?? event.session.className ?? 'Class'}`;
  }, [event]);

  const canSubmit =
    reason.trim().length > 0 && Boolean(sessionDate && startTime && endTime) && !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event || !canSubmit) return;

    setSaving(true);
    setError('');
    try {
      await calendarApi.replaceEvent(event.id, {
        sessionDate,
        startTime,
        endTime,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      navigate('/admin/calendar', {
        replace: true,
        state: { message: 'Replacement scheduled. UDF_CLASSDATE updated and logged.' },
      });
    } catch {
      setError('Could not save replacement. Check the date/time and try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading event…</p>;
  }

  if (!event) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{error || 'Event not found.'}</p>
        <Link to="/admin/calendar" className="text-primary-600 hover:underline">
          Back to calendar
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title={title}
        description="Set a new date and time. This updates SL_SODTL.UDF_CLASSDATE and writes a changelog row."
        actions={
          <Link to="/admin/calendar">
            <Button type="button" variant="outline" size="sm">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Calendar
            </Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-medium text-slate-900">{event.courseName ?? 'Course'}</p>
            <p>
              Current: {event.session.sessionDate} · {event.session.startTime}–{event.session.endTime}
            </p>
            {(event.studentName || event.branchName) && (
              <p>Student: {event.studentName ?? event.branchName}</p>
            )}
            {event.teacherName && <p>Teacher: {event.teacherName}</p>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sessionDate">New date</Label>
              <Input
                id="sessionDate"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="startTime">Start time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endTime">End time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Student leave — make-up class…"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Link to="/admin/calendar">
                <Button type="button" variant="outline" disabled={saving}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={!canSubmit}>
                {saving ? 'Saving…' : 'Save replacement'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
