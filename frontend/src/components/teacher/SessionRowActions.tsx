import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, KeyRound, Loader2 } from 'lucide-react';
import { attendanceApi } from '@/api/resources';
import { teacherSessionAttendanceUrl } from '@/utils/attendanceLinks';
import { generateMockCheckIn, getMockCheckIn } from '@/utils/mockAttendanceCheckIn';
import { cn } from '@/utils/cn';
import type { ClassSession } from '@/types';

const iconBtnClass =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:pointer-events-none disabled:opacity-40';

interface SessionRowActionsProps {
  session: ClassSession;
  classDisplayName?: string;
}

export function SessionRowActions({ session, classDisplayName }: SessionRowActionsProps) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cancelled = session.status === 'Cancelled';

  useEffect(() => {
    if (cancelled || !session.id) return;
    let active = true;
    (async () => {
      try {
        if (import.meta.env.VITE_USE_MOCK === 'true') {
          const existing = getMockCheckIn(session.id);
          if (active) setCode(existing?.code ?? null);
          return;
        }
        const data = await attendanceApi.getCheckIn(session.id);
        if (active) setCode(data?.code ?? null);
      } catch {
        const existing = getMockCheckIn(session.id);
        if (active) setCode(existing?.code ?? null);
      }
    })();
    return () => {
      active = false;
    };
  }, [session.id, cancelled]);

  const handleGenerate = async () => {
    if (cancelled || code) return;
    setLoading(true);
    try {
      if (import.meta.env.VITE_USE_MOCK === 'true') {
        const entry = generateMockCheckIn(session, classDisplayName);
        setCode(entry.code);
      } else {
        const entry = await attendanceApi.generateCheckIn(session.id);
        setCode(entry.code);
      }
    } catch {
      const entry = generateMockCheckIn(session, classDisplayName);
      setCode(entry.code);
    } finally {
      setLoading(false);
    }
  };

  if (cancelled) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <div className="flex items-center justify-end gap-2" aria-live="polite">
      {code ? (
        <span
          className="font-mono text-sm font-semibold tracking-[0.25em] text-primary-800 tabular-nums"
          title="Check-in code"
        >
          {code}
        </span>
      ) : (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !session.id}
          title="Generate check-in code"
          aria-label="Generate check-in code"
          className={iconBtnClass}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="h-4 w-4" />
          )}
        </button>
      )}
      <Link
        to={teacherSessionAttendanceUrl(session.classId, session.id)}
        title="Take attendance"
        aria-label="Take attendance"
        className={cn(iconBtnClass)}
      >
        <ClipboardCheck className="h-4 w-4" />
      </Link>
    </div>
  );
}
