import { Plus, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';

interface RegisterAnotherChildCardProps {
  onClick: () => void;
  className?: string;
}

export function RegisterAnotherChildCard({ onClick, className }: RegisterAnotherChildCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex h-full min-h-[280px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-primary-300/80 bg-gradient-to-br from-primary-50 via-white to-violet-50 p-6 text-center transition-all hover:border-primary-500 hover:shadow-lg hover:shadow-primary-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        className
      )}
    >
      <div className="relative mb-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-200 transition-transform group-hover:scale-105">
          <Plus className="h-8 w-8" strokeWidth={2.5} />
        </div>
        <Sparkles className="absolute -right-1 -top-1 h-5 w-5 text-amber-400" aria-hidden />
      </div>
      <p className="text-lg font-semibold text-slate-900">Register another child</p>
      <p className="mt-2 max-w-[14rem] text-sm leading-relaxed text-slate-500">
        Add a sibling or new student under your family account
      </p>
      <span className="mt-4 inline-flex items-center rounded-full bg-primary-600 px-4 py-1.5 text-sm font-medium text-white transition-colors group-hover:bg-primary-700">
        Start registration
      </span>
    </button>
  );
}
