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

  if (compact) {
    const label = loading ? '…' : checkIn?.code ?? 'Generate';
    return (
      <Button
        type="button"
        size="sm"
        onClick={handleGenerate}
        disabled={disabled || loading || !session.id || Boolean(checkIn)}
        className={cn('min-w-[6.5rem] font-mono', checkIn && 'tracking-[0.3em]')}
        aria-live="polite"
      >
        {loading && <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
        {label}
      </Button>
    );
  }

  if (checkIn?.code) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary-200 bg-primary-50/60 px-6 py-8',
          className
        )}
        aria-live="polite"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
          Today&apos;s check-in code
        </p>
        <p className="mt-2 font-mono text-4xl font-bold tracking-[0.35em] text-primary-800">
          {checkIn.code}
        </p>
        <p className="mt-3 text-center text-sm text-primary-700/80">
          Students enter this code in their portal to check in for this session.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-slate-200 bg-slate-50/50 p-4', className)}>
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-sm text-slate-600">No code yet for this session.</p>
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={disabled || loading || !session.id}
          aria-live="polite"
        >
          {loading && <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />}
          Generate check-in code
        </Button>
      </div>
    </div>
  );
}
