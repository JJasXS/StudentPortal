import { ChevronRight, Mail, Phone, User } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { SqlAccountChild } from '@/types/sqlAccount';

const accents = [
  'from-violet-500 to-purple-600',
  'from-sky-500 to-blue-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
] as const;

function accentAt(index: number) {
  return accents[index % accents.length];
}

interface SqlAccountBranchCardProps {
  child: SqlAccountChild;
  index?: number;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export function SqlAccountBranchCard({
  child,
  index = 0,
  onClick,
  selected = false,
  className,
}: SqlAccountBranchCardProps) {
  const accent = accentAt(index);
  const label = child.branchName?.trim() || child.attention?.trim() || 'Child';

  const inner = (
    <>
      <div className={cn('relative h-24 bg-gradient-to-br p-4', accent)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.22),transparent_55%)]" />
        <div className="relative flex h-full items-end justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold leading-tight text-white">{label}</h3>
          </div>
          {onClick && <ChevronRight className="h-5 w-5 shrink-0 text-white/80" />}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4 text-sm text-slate-600">
        {child.attention && child.attention !== label && (
          <p className="flex items-center gap-2">
            <User className="h-4 w-4 shrink-0 text-slate-400" />
            {child.attention}
          </p>
        )}
        {child.email && (
          <p className="flex items-center gap-2 min-w-0">
            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{child.email}</span>
          </p>
        )}
        {child.phone && (
          <p className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0 text-slate-400" />
            {child.phone}
          </p>
        )}
        {!child.attention && !child.email && !child.phone && (
          <p className="text-slate-500">View enrolled classes</p>
        )}
      </div>
    </>
  );

  const cardClass = cn(
    'flex h-full flex-col overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition',
    selected ? 'border-primary-300 ring-2 ring-primary-100' : 'border-slate-200/80 hover:border-primary-200 hover:shadow-md',
    className
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(cardClass, 'cursor-pointer')}>
        {inner}
      </button>
    );
  }

  return <article className={cardClass}>{inner}</article>;
}
