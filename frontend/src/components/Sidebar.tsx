import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCircle,
  GraduationCap,
  Calendar,
  CalendarDays,
  Megaphone,
  Settings,
  NotebookPen,
  Bell,
  LogOut,
  X,
  History,
  BookOpenCheck,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCentreBranding } from '@/context/CentreBrandingContext';
import { CentreMarkInline } from '@/components/branding/CentreMark';
import { cn } from '@/utils/cn';
import { isStudentPortalRole } from '@/utils/learnerPortal';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Students & Parents', path: '/admin/students', icon: GraduationCap },
  { label: 'Staff Management', path: '/admin/teachers', icon: UserCircle },
  { label: 'Calendar & Courses', path: '/admin/calendar', icon: CalendarDays },
  { label: 'Homework', path: '/admin/homework', icon: BookOpenCheck },
  { label: 'Announcements', path: '/admin/announcements', icon: Megaphone },
  { label: 'Audit log', path: '/admin/audit-log', icon: History },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

const teacherNav: NavItem[] = [
  { label: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
  { label: 'Schedule', path: '/teacher/calendar', icon: CalendarDays },
  { label: 'My Classes', path: '/teacher/classes', icon: Calendar },
  { label: 'Lesson Notes', path: '/teacher/lesson-notes', icon: NotebookPen },
  { label: 'Homework', path: '/teacher/homework', icon: BookOpenCheck },
  { label: 'Notifications', path: '/teacher/notifications', icon: Bell },
];

const learnerNav: NavItem[] = [
  { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Schedule', path: '/student/schedule', icon: CalendarDays },
  { label: 'My Courses', path: '/student/courses', icon: GraduationCap },
  { label: 'Homework', path: '/student/homework', icon: BookOpenCheck },
  { label: 'Notifications', path: '/student/notifications', icon: Bell },
];

export const navByRole: Record<Exclude<UserRole, 'Parent'>, NavItem[]> = {
  Admin: adminNav,
  Teacher: teacherNav,
  Student: learnerNav,
};

interface SidebarProps {
  role: UserRole;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ role, open, onClose }: SidebarProps) {
  const { logout } = useAuth();
  const { centreName } = useCentreBranding();
  const items = isStudentPortalRole(role) ? learnerNav : navByRole[role as Exclude<UserRole, 'Parent'>];

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4">
          <CentreMarkInline className="min-w-0 flex-1" />
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col overflow-y-auto p-3">
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
          <ul className="mt-auto space-y-1 border-t border-slate-200 pt-3">
            <li>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                Log out
              </button>
            </li>
          </ul>
        </nav>
        <div className="border-t border-slate-200 p-4 text-center text-xs text-slate-400">
          {centreName} · v1.0
        </div>
      </aside>
    </>
  );
}
