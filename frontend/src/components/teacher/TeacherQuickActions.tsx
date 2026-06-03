import { Link } from 'react-router-dom';
import { Calendar, ClipboardCheck, NotebookPen, ClipboardList, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/utils/cn';

interface QuickAction {
  label: string;
  description: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface TeacherQuickActionsProps {
  className?: string;
}

const ACTIONS: QuickAction[] = [
  {
    label: 'My classes',
    description: 'View all teaching groups',
    to: '/teacher/classes',
    icon: Calendar,
  },
  {
    label: 'Class sessions',
    description: 'Lesson schedule & topics',
    to: '/teacher/classes',
    icon: ClipboardList,
  },
  {
    label: 'Attendance',
    description: 'Check-in & mark roster',
    to: '/teacher/classes',
    icon: ClipboardCheck,
  },
  {
    label: 'Lesson notes',
    description: 'Record student progress',
    to: '/teacher/lesson-notes',
    icon: NotebookPen,
  },
];

export function TeacherQuickActions({ className }: TeacherQuickActionsProps) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quick links</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.to}
              className={cn(
                'group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3',
                'transition-colors hover:border-primary-200 hover:bg-primary-50/50'
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600 group-hover:bg-primary-100">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900">{action.label}</span>
                <span className="block text-xs text-slate-500">{action.description}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-primary-600" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
