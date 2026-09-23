import { Link } from 'react-router-dom';
import { BookOpen, CalendarDays, CalendarOff, Megaphone } from 'lucide-react';
import { cn } from '@/utils/cn';

const ACTIONS = [
  {
    label: 'My Classes',
    href: '/teacher/classes',
    icon: BookOpen,
  },
  {
    label: 'Schedule',
    href: '/teacher/calendar',
    icon: CalendarDays,
  },
  {
    label: 'Leave',
    href: '/teacher/leave',
    icon: CalendarOff,
  },
  {
    label: 'Announcements',
    href: '/teacher/announcements',
    icon: Megaphone,
  },
] as const;

interface TeacherQuickActionsProps {
  className?: string;
}

export function TeacherQuickActions({ className }: TeacherQuickActionsProps) {
  return (
    <section className={cn(className)}>
      <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Quick actions</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              to={action.href}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-primary-200 hover:bg-primary-50/50 hover:text-primary-800"
            >
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 truncate">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
