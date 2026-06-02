import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { attendanceApi } from '@/api/resources';
import { generateMockCheckIn, getMockCheckIn } from '@/utils/mockAttendanceCheckIn';
import { cn } from '@/utils/cn';
import type { AttendanceCheckInInfo, ClassSession } from '@/types';

interface AttendanceCheckInPanelProps {
  session: ClassSession;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
}

export function AttendanceCheckInPanel({
  session,
  className,
  disabled,
  compact = false,
}: AttendanceCheckInPanelProps) {
  const [checkIn, setCheckIn] = useState<AttendanceCheckInInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!session.id) return;
    try {
      if (import.meta.env.VITE_USE_MOCK === 'true') {
        setCheckIn(getMockCheckIn(session.id));
        return;
      }
      const data = await attendanceApi.getCheckIn(session.id);
      setCheckIn(data);
    } catch {
      setCheckIn(getMockCheckIn(session.id));
    }
  };

  useEffect(() => {
    load();
  }, [session.id]);

  const handleGenerate = async () => {
    if (checkIn) return;
    setLoading(true);
    try {
      if (import.meta.env.VITE_USE_MOCK === 'true') {
        setCheckIn(generateMockCheckIn(session, className));
      } else {
        setCheckIn(await attendanceApi.generateCheckIn(session.id));
      }
    } catch {
      setCheckIn(generateMockCheckIn(session, className));
    } finally {
      setLoading(false);
    }
  };

  const label = loading ? '…' : checkIn?.code ?? 'Generate';

  if (compact) {
    return (
      <Button
        type="button"
        size="sm"
        onClick={handleGenerate}
        disabled={disabled || loading || !session.id || Boolean(checkIn)}
        className={cn(
          'min-w-[6.5rem] font-mono',
          checkIn && 'tracking-[0.3em]'
        )}
        aria-live="polite"
      >
        {loading && <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        {label}
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          onClick={handleGenerate}
          disabled={disabled || loading || !session.id || Boolean(checkIn)}
          className={cn('min-w-[7rem] font-mono', checkIn && 'tracking-[0.35em]')}
          aria-live="polite"
        >
          {loading && <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />}
          {label}
        </Button>
      </div>
    </div>
  );
}
