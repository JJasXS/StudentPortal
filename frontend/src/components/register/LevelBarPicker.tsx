import { Label } from '@/components/ui/Input';
import { cn } from '@/utils/cn';
import { STUDENT_SKILL_LEVELS } from '@/utils/studentLevels';

interface LevelBarPickerProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
}

const MAX_INDEX = STUDENT_SKILL_LEVELS.length - 1;

function levelIndex(value: string): number {
  return STUDENT_SKILL_LEVELS.findIndex(
    (level) => level.toLowerCase() === value.trim().toLowerCase()
  );
}

export function LevelBarPicker({
  id = 'skillLevel',
  label = 'Level',
  value,
  onChange,
}: LevelBarPickerProps) {
  const selectedIndex = levelIndex(value);
  const hasSelection = selectedIndex >= 0;
  const sliderIndex = hasSelection ? selectedIndex : 0;
  const fillPercent = hasSelection ? (selectedIndex / MAX_INDEX) * 100 : 0;

  const handleSliderChange = (index: number) => {
    onChange(STUDENT_SKILL_LEVELS[index]);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <Label id={`${id}-label`}>{label}</Label>
        {hasSelection && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs text-slate-500 hover:text-primary-700"
          >
            Clear
          </button>
        )}
      </div>
      <p className="mb-4 mt-1 text-xs text-slate-500">Optional — drag the bar to set your level</p>

      <div
        className="rounded-xl bg-slate-100 px-4 py-5"
        role="group"
        aria-labelledby={`${id}-label`}
      >
        <div className="relative px-1">
          <div
            className="pointer-events-none absolute left-1 right-1 top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-200"
            aria-hidden
          >
            <div
              className="h-full rounded-full bg-primary-600 transition-[width] duration-150 ease-out"
              style={{ width: `${fillPercent}%` }}
            />
          </div>

          <div className="pointer-events-none absolute left-1 right-1 top-1/2 flex -translate-y-1/2 justify-between px-0" aria-hidden>
            {STUDENT_SKILL_LEVELS.map((level, index) => (
              <span
                key={level}
                className={cn(
                  'h-2 w-2 rounded-full border-2 border-white shadow-sm transition-colors',
                  hasSelection && index <= selectedIndex ? 'bg-primary-600' : 'bg-slate-300'
                )}
              />
            ))}
          </div>

          <input
            id={id}
            type="range"
            min={0}
            max={MAX_INDEX}
            step={1}
            value={sliderIndex}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            className="level-range relative z-10 w-full cursor-grab active:cursor-grabbing"
            style={{ '--level-fill': `${fillPercent}%` } as React.CSSProperties}
            aria-valuemin={0}
            aria-valuemax={MAX_INDEX}
            aria-valuenow={hasSelection ? selectedIndex : undefined}
            aria-valuetext={hasSelection ? STUDENT_SKILL_LEVELS[selectedIndex] : 'Not set'}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 text-center text-xs sm:text-sm">
          {STUDENT_SKILL_LEVELS.map((level, index) => {
            const active = hasSelection && selectedIndex === index;
            return (
              <button
                key={level}
                type="button"
                onClick={() => onChange(active ? '' : level)}
                className={cn(
                  'font-medium transition-colors',
                  active ? 'text-primary-700' : 'text-slate-500 hover:text-primary-600'
                )}
                aria-pressed={active}
              >
                {level}
              </button>
            );
          })}
        </div>

        {hasSelection && (
          <p className="mt-3 text-center text-sm font-medium text-primary-700">
            {STUDENT_SKILL_LEVELS[selectedIndex]}
          </p>
        )}
      </div>
    </div>
  );
}
