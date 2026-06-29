import type { ClassSession } from '@/types';

export function sessionStatusColor(status: ClassSession['status']) {
  switch (status) {
    case 'Completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900';
    case 'Cancelled':
      return 'border-slate-200 bg-slate-100 text-slate-500 line-through';
    case 'Rescheduled':
      return 'border-amber-200 bg-amber-50 text-amber-900';
    default:
      return 'border-primary-200 bg-primary-50 text-primary-900';
  }
}
