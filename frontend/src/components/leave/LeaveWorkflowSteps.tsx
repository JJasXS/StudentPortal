import { cn } from '@/utils/cn';
import { portalWorkflowStep } from '@/utils/portalLeave';
import type { PortalLeaveStatus } from '@/types/portal';

const STEPS = [
  'Student submits',
  'Admin reviews',
  'Approve / reject',
  'Replacement needed?',
  'Pick teacher & time',
  'Teacher notified',
  'Accept / counter',
  'Admin confirms',
  'Student notified',
];

interface LeaveWorkflowStepsProps {
  status: PortalLeaveStatus;
  compact?: boolean;
}

export function LeaveWorkflowSteps({ status, compact }: LeaveWorkflowStepsProps) {
  const current = portalWorkflowStep(status);
  const terminal = status === 'Rejected' || (status === 'Approved' && current === 3);

  return (
    <div className={cn('overflow-x-auto', compact ? 'pb-1' : 'pb-2')}>
      <ol className="flex min-w-[36rem] gap-0">
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
                    'mt-1 line-clamp-2 text-[9px] leading-tight',
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
