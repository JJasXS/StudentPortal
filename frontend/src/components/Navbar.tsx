import { Link } from 'react-router-dom';
import { Menu, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { NotificationBell } from '@/components/NotificationBell';
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="rounded-lg p-2 hover:bg-slate-100 lg:hidden">
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden items-center gap-3 sm:flex">
          {user && (
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${accountAvatarStyle(user.role)}`}
            >
              {accountInitials(user.fullName)}
            </div>
          )}
          <div>
            <p className="text-sm text-slate-500">Welcome back,</p>
            <p className="font-semibold text-slate-900">{user?.fullName}</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {user?.role && user.role !== 'Parent' && <StatusBadge status={user.role} />}
        <TeacherTodoToggleBubble />
        <NotificationBell />
        <Link to="/profile">
          <Button variant="outline" size="sm">
            <User className="mr-1 h-4 w-4" />
            Profile
          </Button>
        </Link>
      </div>
    </header>
  );
}
