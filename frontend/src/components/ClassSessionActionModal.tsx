import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import type { ClassSession } from '@/types';

export type ClassSessionActionMode = 'cancel' | 'replace';

interface ClassSessionActionModalProps {
  open: boolean;
  mode: ClassSessionActionMode;
  session: ClassSession | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    reason: string;
    sessionDate?: string;
    startTime?: string;
    endTime?: string;
    notes?: string;
  }) => void;
}

export function ClassSessionActionModal({
  open,
  mode,
  session,
  saving = false,
  onClose,
  onConfirm,
}: ClassSessionActionModalProps) {
  const [reason, setReason] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!open || !session) return;
    setSessionDate(session.sessionDate);
    setStartTime(session.startTime);
    setEndTime(session.endTime);
    setReason('');
    setNotes('');
  }, [open, session]);

  const resetAndClose = () => {
    setReason('');
    setSessionDate('');
    setStartTime('');
    setEndTime('');
    setNotes('');
    onClose();
  };

  const title = mode === 'cancel' ? 'Cancel session' : 'Schedule replacement';
  const canSubmit =
    mode === 'cancel'
      ? reason.trim().length > 0
      : reason.trim().length > 0 && Boolean(sessionDate && startTime && endTime);

  return (
    <Modal open={open} onClose={resetAndClose} title={title} className="max-w-md">
      {session && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {session.sessionDate} · {session.startTime} – {session.endTime}
            {session.topic ? ` · ${session.topic}` : ''}
          </p>

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                mode === 'cancel'
                  ? 'e.g. Public holiday, teacher unavailable…'
                  : 'e.g. Student leave — make-up class…'
              }
            />
          </div>

          {mode === 'replace' && (
            <>
              <div className="space-y-1.5">
                <Label>New date</Label>
                <Input type="date" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Start</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>End</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes (optional)</Label>
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Make-up class note" />
              </div>
            </>
          )}

          <div className="flex flex-col-reverse gap-2 border-t sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto border-slate-100 pt-4">
            <Button type="button" variant="outline" onClick={resetAndClose} disabled={saving}>
              Close
            </Button>
            <Button
              type="button"
              disabled={!canSubmit || saving}
              onClick={() => {
                onConfirm({
                  reason: reason.trim(),
                  sessionDate: mode === 'replace' ? sessionDate : undefined,
                  startTime: mode === 'replace' ? startTime : undefined,
                  endTime: mode === 'replace' ? endTime : undefined,
                  notes: mode === 'replace' ? notes.trim() || undefined : undefined,
                });
              }}
            >
              {saving ? 'Saving…' : mode === 'cancel' ? 'Cancel session' : 'Create replacement'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
