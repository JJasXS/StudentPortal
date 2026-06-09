import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  GraduationCap,
  BookOpen,
  Calendar,
  CalendarDays,
  Megaphone,
  FileText,
  Settings,
  Music,
  ClipboardCheck,
  BarChart3,
  History,
  NotebookPen,
  Baby,
  Bell,
  TrendingUp,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/utils/cn';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const adminNav: NavItem[] = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Students', path: '/admin/students', icon: GraduationCap },
  { label: 'Parents', path: '/admin/parents', icon: Users },
  { label: 'Staff Management', path: '/admin/teachers', icon: UserCircle },
  { label: 'Courses', path: '/admin/courses', icon: BookOpen },
  { label: 'Calendar', path: '/admin/calendar', icon: CalendarDays },
  { label: 'Announcements', path: '/admin/announcements', icon: Megaphone },
  { label: 'Invoices', path: '/admin/invoices', icon: FileText },
  { label: 'Reports', path: '/admin/reports', icon: BarChart3 },
  { label: 'Audit log', path: '/admin/audit-log', icon: History },
  { label: 'Attendance', path: '/admin/attendance', icon: ClipboardCheck },
  { label: 'Settings', path: '/admin/settings', icon: Settings },
];

const teacherNav: NavItem[] = [
  { label: 'Dashboard', path: '/teacher/dashboard', icon: LayoutDashboard },
  { label: 'Calendar', path: '/teacher/calendar', icon: CalendarDays },
  { label: 'My Classes', path: '/teacher/classes', icon: Calendar },
  { label: 'Lesson Notes', path: '/teacher/lesson-notes', icon: NotebookPen },
  { label: 'Announcements', path: '/teacher/announcements', icon: Megaphone },
];

const studentNav: NavItem[] = [
  { label: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
  { label: 'My Classes', path: '/student/classes', icon: Calendar },
  { label: 'My Attendance', path: '/student/attendance', icon: ClipboardCheck },
  { label: 'Lesson Notes', path: '/student/lesson-notes', icon: NotebookPen },
  { label: 'Announcements', path: '/student/announcements', icon: Megaphone },
];

const parentNav: NavItem[] = [
  { label: 'Dashboard', path: '/parent/dashboard', icon: LayoutDashboard },
  { label: 'My Children', path: '/parent/children', icon: Baby },
  { label: 'Progress', path: '/parent/progress', icon: TrendingUp },
  { label: 'Notifications', path: '/parent/notifications', icon: Bell },
  { label: 'Child Classes', path: '/parent/classes', icon: Calendar },
  { label: 'Child Attendance', path: '/parent/attendance', icon: ClipboardCheck },
  { label: 'Lesson Notes', path: '/parent/lesson-notes', icon: NotebookPen },
  { label: 'Announcements', path: '/parent/announcements', icon: Megaphone },
  { label: 'Billing', path: '/parent/invoices', icon: FileText },
];

export const navByRole: Record<UserRole, NavItem[]> = {
  Admin: adminNav,
  Teacher: teacherNav,
  Student: studentNav,
  Parent: parentNav,
};

interface SidebarProps {
  role: UserRole;
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ role, open, onClose }: SidebarProps) {
  const { logout } = useAuth();
  const items = navByRole[role];

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
          <div className="flex items-center gap-2">
            <Music className="h-7 w-7 text-primary-600" />
            <span className="font-bold text-slate-900">Tuition Portal</span>
          </div>
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
          Music Tuition Portal v1.0
        </div>
      </aside>
    </>
  );
}
