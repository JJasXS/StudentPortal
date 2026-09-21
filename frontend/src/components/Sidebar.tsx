import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Calendar,
  CalendarDays,
  Megaphone,
  Settings,
  LogOut,
  X,
  History,
  CalendarOff,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { CentreMarkInline } from '@/components/branding/CentreMark';
import { isUserManagementPath } from '@/components/admin/UserManagementSwitcher';
import { cn } from '@/utils/cn';
import { isStudentPortalRole } from '@/utils/learnerPortal';
import { dashboardNotifyApi, homeworkApi } from '@/api/resources';
import { NOTIFY_READS_CHANGED } from '@/utils/notifyEvents';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'User Management', path: '/admin/parents', icon: Users },
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
  { label: 'Assignment', path: '/student/courses', icon: GraduationCap },
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
  const location = useLocation();
  const [unreadNotifyCount, setUnreadNotifyCount] = useState(0);
  const [pendingHomeworkCount, setPendingHomeworkCount] = useState(0);

  useEffect(() => {
    if (!isStudentPortalRole(role)) return;

    const refresh = () => {
      dashboardNotifyApi
        .getUnreadCount()
        .then(setUnreadNotifyCount)
        .catch(() => setUnreadNotifyCount(0));
      homeworkApi
        .getPendingCount()
        .then((data) => setPendingHomeworkCount(data.total))
        .catch(() => setPendingHomeworkCount(0));
    };

    refresh();
    window.addEventListener(NOTIFY_READS_CHANGED, refresh);
    return () => window.removeEventListener(NOTIFY_READS_CHANGED, refresh);
  }, [role, location.pathname]);

  const items = isStudentPortalRole(role)
    ? learnerNav
    : navByRole[role as Exclude<UserRole, 'Parent'>];

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[min(16rem,85vw)] flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-out lg:static lg:w-64 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Main navigation"
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-slate-200 px-3 sm:h-16 sm:px-4">
          <CentreMarkInline className="min-w-0 flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-slate-100 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col overflow-y-auto overscroll-contain p-3">
          <ul className="space-y-1">
            {items.map((item) => {
              const isDashboard =
                isStudentPortalRole(role) && item.path.endsWith('/dashboard');
              const isAssignment =
                isStudentPortalRole(role) && item.path === '/student/courses';
              const showDot =
                (isDashboard && unreadNotifyCount > 0) ||
                (isAssignment && pendingHomeworkCount > 0);
              const isUserMgmt = item.path === '/admin/parents';

              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) => {
                      const active = isUserMgmt
                        ? isUserManagementPath(location.pathname)
                        : isActive;
                      return cn(
                        'relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      );
                    }}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="min-w-0 truncate">{item.label}</span>
                    {showDot && (
                      <span
                        className="ml-auto h-2 w-2 shrink-0 rounded-full bg-red-500"
                        aria-label={
                          isAssignment
                            ? `${pendingHomeworkCount} pending homework`
                            : `${unreadNotifyCount} unread notifications`
                        }
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
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                Log out
              </button>
            </li>
          </ul>
        </nav>
      </aside>
    </>
  );
}
