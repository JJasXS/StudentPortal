import { cn } from '@/utils/cn';
import { portalWorkflowStep } from '@/utils/portalLeave';
import type { PortalLeaveStatus } from '@/types/portal';

const DEFAULT_STEPS = [
  'Parent submits',
  'Admin reviews',
  'Approve / reject',
  'Pick replacement slot',
  'Confirmed',
];

interface LeaveWorkflowStepsProps {
  status: PortalLeaveStatus;
  compact?: boolean;
  /** Override first step label (e.g. "You submit" for students). */
  submitterLabel?: string;
}

export function LeaveWorkflowSteps({ status, compact, submitterLabel }: LeaveWorkflowStepsProps) {
  const current = portalWorkflowStep(status);
  const terminal = status === 'Rejected' || status === 'Approved';
  const STEPS = [submitterLabel ?? DEFAULT_STEPS[0], ...DEFAULT_STEPS.slice(1)];

  return (
    <div className={cn(compact ? 'pb-1' : 'pb-2')}>
      {/* Mobile: vertical checklist */}
      <ol className="space-y-2 sm:hidden">
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const done = stepNum < current || (terminal && stepNum <= 3);
          const active = stepNum === current && !terminal;
          return (
            <li key={label} className="flex items-center gap-2.5">
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                  done && 'bg-primary-600 text-white',
                  active && 'bg-primary-100 text-primary-700 ring-2 ring-primary-500',
                  !done && !active && 'bg-slate-100 text-slate-400'
                )}
              >
                {stepNum}
              </span>
              <span
                className={cn(
                  'min-w-0 text-xs leading-snug',
                  active ? 'font-semibold text-primary-700' : 'text-slate-600'
                )}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* sm+: horizontal stepper */}
      <ol className="hidden min-w-0 sm:flex">
        {STEPS.map((label, i) => {
          const stepNum = i + 1;
          const done = stepNum < current || (terminal && stepNum <= 3);
          const active = stepNum === current && !terminal;
          return (
            <li
              key={label}
              className={cn(
                'relative flex flex-1 flex-col items-center px-0.5 text-center',
                i < STEPS.length - 1 &&
                  "after:absolute after:left-[calc(50%+0.5rem)] after:top-2.5 after:h-0.5 after:w-[calc(100%-1rem)] after:content-['']",
                done ? 'after:bg-primary-400' : 'after:bg-slate-200'
              )}
            >
              <span
                className={cn(
                  'relative z-10 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                  done && 'bg-primary-600 text-white',
                  active && 'bg-primary-100 text-primary-700 ring-2 ring-primary-500',
                  !done && !active && 'bg-slate-100 text-slate-400'
                )}
              >
                {stepNum}
              </span>
              {!compact && (
                <span
                  className={cn(
                    'mt-1 line-clamp-2 text-[9px] leading-tight md:text-[10px]',
                    active ? 'font-semibold text-primary-700' : 'text-slate-500'
                  )}
                >
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
