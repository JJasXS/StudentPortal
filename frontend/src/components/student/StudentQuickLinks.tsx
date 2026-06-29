import { Link } from 'react-router-dom';
import { CalendarDays, Megaphone, NotebookPen, BookOpenCheck } from 'lucide-react';
import { cn } from '@/utils/cn';

const links = [
  {
    label: 'Schedule',
    description: 'Monthly lesson view',
    href: '/student/schedule',
    icon: CalendarDays,
    accent: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  },
  {
    label: 'My courses',
    description: 'Classes & lesson notes',
    href: '/student/courses',
    icon: NotebookPen,
    accent: 'bg-violet-50 text-violet-700 ring-violet-100',
  },
  {
    label: 'Notifications',
    description: 'Centre updates',
    href: '/student/notifications',
    icon: Megaphone,
    accent: 'bg-amber-50 text-amber-800 ring-amber-100',
  },
  {
    label: 'Homework',
    description: 'Upload for teacher',
    href: '/student/homework',
    icon: BookOpenCheck,
    accent: 'bg-sky-50 text-sky-800 ring-sky-100',
  },
] as const;

export function StudentQuickLinks({ className }: { className?: string }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {links.map((link) => (
        <Link
          key={link.href}
          to={link.href}
          className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-primary-200 hover:shadow-md"
        >
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1',
              link.accent
            )}
          >
            <link.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 group-hover:text-primary-700">
              {link.label}
            </p>
            <p className="text-xs text-slate-500">{link.description}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
