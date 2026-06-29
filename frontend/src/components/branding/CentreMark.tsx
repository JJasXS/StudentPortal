import { Music } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useCentreBranding } from '@/context/CentreBrandingContext';

interface CentreMarkProps {
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  subtitle?: string;
  className?: string;
  nameClassName?: string;
}

const sizes = {
  sm: { box: 'h-9 w-9 rounded-lg', icon: 'h-5 w-5', img: 'h-9 w-9 rounded-lg', title: 'text-sm' },
  md: { box: 'h-14 w-14 rounded-2xl', icon: 'h-8 w-8', img: 'h-14 w-14 rounded-2xl', title: 'text-2xl' },
  lg: { box: 'h-16 w-16 rounded-2xl', icon: 'h-9 w-9', img: 'h-16 w-16 rounded-2xl', title: 'text-2xl' },
} as const;

export function CentreMark({
  size = 'md',
  showName = true,
  subtitle,
  className,
  nameClassName,
}: CentreMarkProps) {
  const { centreName, logoDataUrl } = useCentreBranding();
  const s = sizes[size];

  return (
    <div className={cn('flex flex-col items-center text-center', className)}>
      {logoDataUrl ? (
        <img
          src={logoDataUrl}
          alt={`${centreName} logo`}
          className={cn(s.img, 'border border-slate-200 bg-white object-contain shadow-sm')}
        />
      ) : (
        <div
          className={cn(
            s.box,
            'flex items-center justify-center bg-primary-600 shadow-sm'
          )}
        >
          <Music className={cn(s.icon, 'text-white')} />
        </div>
      )}
      {showName && (
        <>
          <h1 className={cn('mt-4 font-bold text-slate-900', s.title, nameClassName)}>
            {centreName}
          </h1>
          {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
        </>
      )}
    </div>
  );
}

export function CentreMarkInline({ className }: { className?: string }) {
  const { centreName, logoDataUrl } = useCentreBranding();

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      {logoDataUrl ? (
        <img
          src={logoDataUrl}
          alt=""
          className="h-8 w-8 shrink-0 rounded-lg border border-slate-200 bg-white object-contain"
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600">
          <Music className="h-4 w-4 text-white" />
        </div>
      )}
      <span className="truncate font-bold text-slate-900">{centreName}</span>
    </div>
  );
}
