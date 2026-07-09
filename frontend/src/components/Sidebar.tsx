import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  UserCircle,
  Users,
  Calendar,
  CalendarDays,
  Megaphone,
  Settings,
  LogOut,
  X,
  History,
  BookOpenCheck,
  CalendarOff,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCentreBranding } from '@/context/CentreBrandingContext';
import { CentreMarkInline } from '@/components/branding/CentreMark';
import { cn } from '@/utils/cn';
import { isStudentPortalRole, learnerPortalPath } from '@/utils/learnerPortal';
import { dashboardNotifyApi } from '@/api/resources';
import { NOTIFY_READS_CHANGED } from '@/utils/notifyEvents';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  parentLabel?: string;
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Students', path: '/admin/parents', icon: Users },
  { label: 'Staff Management', path: '/admin/teachers', icon: UserCircle },
  { label: 'Calendar & Courses', path: '/admin/calendar', icon: CalendarDays },
  { label: 'Leave requests', path: '/admin/leave', icon: CalendarOff },
  { label: 'Announcements', path: '/admin/announcements', icon: Megaphone },
  { label: 'Audit log', path: '/admin/audit-log', icon: History },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

const teacherNav: NavItem[] = [
  { label: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
  { label: 'Schedule', path: '/teacher/calendar', icon: CalendarDays },
  { label: 'My Classes', path: '/teacher/classes', icon: Calendar },
  { label: 'Leave', path: '/teacher/leave', icon: CalendarOff },
  { label: 'Announcements', path: '/teacher/announcements', icon: Megaphone },
];

const learnerNav: NavItem[] = [
  { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
  { label: 'Schedule', path: '/student/schedule', icon: CalendarDays },
  { label: 'My Courses', path: '/student/courses', icon: GraduationCap, parentLabel: 'Assignment' },
  { label: 'Homework', path: '/student/homework', icon: BookOpenCheck },
  { label: 'Leave', path: '/student/leave', icon: CalendarOff },
  { label: 'Announcements', path: '/student/announcements', icon: Megaphone },
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
  const location = useLocation();
  const [unreadNotifyCount, setUnreadNotifyCount] = useState(0);

  useEffect(() => {
    if (role !== 'Parent') return;

    const refresh = () => {
      dashboardNotifyApi
        .getUnreadCount()
        .then(setUnreadNotifyCount)
        .catch(() => setUnreadNotifyCount(0));
    };

    refresh();
    window.addEventListener(NOTIFY_READS_CHANGED, refresh);
    return () => window.removeEventListener(NOTIFY_READS_CHANGED, refresh);
  }, [role, location.pathname]);

  const items = isStudentPortalRole(role)
    ? learnerNav
        .filter((item) => !(role === 'Parent' && item.path === '/student/homework'))
        .map((item) => ({
          ...item,
          label: role === 'Parent' && item.parentLabel ? item.parentLabel : item.label,
          path: learnerPortalPath(item.path, role),
        }))
    : navByRole[role as Exclude<UserRole, 'Parent'>];

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
            {items.map((item) => {
              const isDashboard =
                role === 'Parent' &&
                (item.path === '/parent/dashboard' || item.path.endsWith('/dashboard'));
              const showDot = isDashboard && unreadNotifyCount > 0;

              return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    )
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                  {showDot && (
                    <span
                      className="ml-auto h-2 w-2 shrink-0 rounded-full bg-red-500"
                      aria-label={`${unreadNotifyCount} unread notifications`}
                    />
                  )}
                </NavLink>
              </li>
            );
            })}
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
