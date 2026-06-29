import { cn } from '@/utils/cn';
import { accountAvatarStyle, accountInitials } from '@/utils/accountDisplay';
import type { User } from '@/types';

interface ProfileIdentityCardProps {
  user: User;
  onDoubleClick?: () => void;
  className?: string;
  subtitle?: string;
}

export function ProfileIdentityCard({
  user,
  onDoubleClick,
  className,
  subtitle,
}: ProfileIdentityCardProps) {
  const initials = accountInitials(user.fullName);

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4',
        onDoubleClick && 'cursor-pointer select-none hover:border-primary-200 hover:bg-primary-50/30',
        className
      )}
      onDoubleClick={onDoubleClick}
      title={onDoubleClick ? 'Double-click to switch account' : undefined}
    >
      <div
        className={cn(
          'flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold',
          accountAvatarStyle(user.role)
        )}
      >
        {initials}
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-semibold text-slate-900">{user.fullName}</p>
        <p className="truncate text-sm text-slate-500">{user.email}</p>
        {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
      </div>
    </div>
  );
}
