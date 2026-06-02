import { Plus, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AddCourseCardProps {
  onClick: () => void;
  className?: string;
}

export function AddCourseCard({ onClick, className }: AddCourseCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex h-full min-h-[220px] flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-primary-300 bg-gradient-to-br from-primary-50 via-white to-violet-50 p-6 text-center transition-all hover:border-primary-500 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        className
      )}
    >
      <span className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary-200/40 blur-2xl transition-transform group-hover:scale-125" />
      <span className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-violet-200/40 blur-2xl transition-transform group-hover:scale-125" />

      <span className="relative mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-violet-600 text-white shadow-md transition-transform group-hover:scale-110">
        <Plus className="h-7 w-7" strokeWidth={2.5} />
        <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-amber-200" />
      </span>

      <span className="relative text-lg font-semibold text-slate-800">Create new course</span>
      <span className="relative mt-1 max-w-[200px] text-sm text-slate-500">
        Add a program to your music catalog
      </span>
    </button>
  );
}
