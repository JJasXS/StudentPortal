import { useRef, type KeyboardEvent, type ClipboardEvent } from 'react';
import { cn } from '@/utils/cn';

const CODE_LENGTH = 5;

interface CheckInCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}

export function CheckInCodeInput({
  value,
  onChange,
  disabled,
  id = 'check-in-code',
}: CheckInCodeInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: CODE_LENGTH }, (_, i) => value[i] ?? '');

  const setDigit = (index: number, digit: string) => {
    const next = digits.map((d, i) => (i === index ? digit : d)).join('');
    onChange(next.replace(/\s/g, ''));
    if (digit && index < CODE_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
      setDigit(index - 1, '');
    }
    if (e.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) refs.current[index + 1]?.focus();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH);
    if (!pasted) return;
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, CODE_LENGTH - 1);
    refs.current[focusIndex]?.focus();
  };

  return (
    <div
      className="flex justify-center gap-2 sm:gap-3"
      role="group"
      aria-labelledby={`${id}-label`}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          id={index === 0 ? id : undefined}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(-1);
            setDigit(index, v);
          }}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            'h-12 w-10 rounded-lg border border-slate-300 bg-white text-center text-xl font-semibold text-slate-900 shadow-sm',
            'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
            'disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:w-12 sm:text-2xl'
          )}
          aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
        />
      ))}
    </div>
  );
}

export const CHECK_IN_CODE_LENGTH = CODE_LENGTH;
