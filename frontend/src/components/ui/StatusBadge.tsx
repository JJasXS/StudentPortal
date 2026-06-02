import { cn } from '@/utils/cn';

const statusStyles: Record<string, string> = {
  Active: 'bg-green-100 text-green-800',
  Paused: 'bg-yellow-100 text-yellow-800',
  Completed: 'bg-blue-100 text-blue-800',
  Cancelled: 'bg-red-100 text-red-800',
  Scheduled: 'bg-blue-100 text-blue-800',
  Rescheduled: 'bg-purple-100 text-purple-800',
  Present: 'bg-green-100 text-green-800',
  Absent: 'bg-red-100 text-red-800',
  Late: 'bg-yellow-100 text-yellow-800',
  Excused: 'bg-slate-100 text-slate-800',
  Draft: 'bg-slate-100 text-slate-800',
  Unpaid: 'bg-orange-100 text-orange-800',
  Paid: 'bg-green-100 text-green-800',
  Pending: 'bg-amber-100 text-amber-800',
  Admin: 'bg-purple-100 text-purple-800',
  Teacher: 'bg-blue-100 text-blue-800',
  Student: 'bg-green-100 text-green-800',
  Parent: 'bg-orange-100 text-orange-800',
  All: 'bg-slate-100 text-slate-800',
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status] || 'bg-slate-100 text-slate-800',
        className
      )}
    >
      {status}
    </span>
  );
}
