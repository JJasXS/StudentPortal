import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';

export interface StepProgressItem {
  id: number;
  label: string;
}

interface StepProgressProps {
  steps: StepProgressItem[];
  currentStep: number;
  className?: string;
  /** Return a URL for a step to make completed steps clickable (e.g. ?step=1). */
  getStepHref?: (stepId: number) => string | undefined;
}

export function StepProgress({ steps, currentStep, className, getStepHref }: StepProgressProps) {
  const progress = steps.length > 1 ? ((currentStep - 1) / (steps.length - 1)) * 100 : 100;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between text-xs font-medium text-slate-500">
        <span>
          Step {currentStep} of {steps.length}
        </span>
        <span>{steps[currentStep - 1]?.label}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-primary-600 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <ol className="flex justify-between gap-1">
        {steps.map((step) => {
          const done = step.id < currentStep;
          const active = step.id === currentStep;
          const href = done && getStepHref ? getStepHref(step.id) : undefined;
          const bubbleClass = cn(
            'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold',
            done && 'bg-primary-600 text-white',
            active && !done && 'bg-primary-100 text-primary-700 ring-2 ring-primary-600',
            !done && !active && 'bg-slate-100 text-slate-400',
            href && 'hover:ring-2 hover:ring-primary-400'
          );
          return (
            <li key={step.id} className="flex flex-1 flex-col items-center gap-1 text-center">
              {href ? (
                <Link to={href} title={step.label} className={bubbleClass} aria-current={active ? 'step' : undefined}>
                  ✓
                </Link>
              ) : (
                <span className={bubbleClass}>{done ? '✓' : step.id}</span>
              )}
              <span
                className={cn(
                  'hidden text-[10px] leading-tight sm:block',
                  active ? 'font-medium text-slate-800' : 'text-slate-500'
                )}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
