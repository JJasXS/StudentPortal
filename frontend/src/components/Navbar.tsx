import { Link } from 'react-router-dom';
import { Menu, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { TeacherTodoToggleBubble } from '@/components/teacher/TeacherTodoToggleBubble';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { accountAvatarStyle, accountInitials } from '@/utils/accountDisplay';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-14 min-w-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 sm:h-16 sm:px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {user && (
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold sm:h-9 sm:w-9 sm:text-xs ${accountAvatarStyle(user.role)}`}
            >
              {accountInitials(user.fullName)}
            </div>
          )}
          <div className="min-w-0">
            <p className="hidden text-sm text-slate-500 sm:block">Welcome back,</p>
            <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">
              {user?.fullName}
            </p>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {user?.role && user.role !== 'Parent' && (
          <span className="hidden sm:inline-flex">
            <StatusBadge status={user.role} />
          </span>
        )}
        <TeacherTodoToggleBubble />
        <Link to="/profile" className="shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-10 gap-1 px-2.5 sm:h-8 sm:px-3"
            aria-label="Profile"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </Button>
        </Link>
      </div>
    </header>
  );
}
