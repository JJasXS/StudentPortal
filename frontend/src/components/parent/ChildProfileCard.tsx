import { Calendar, GraduationCap, Mail, Music2, School } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { formatGender } from '@/utils/gender';
import { StatusBadge } from '@/components/ui/StatusBadge';
import type { StudentProfile } from '@/types';

const accents = [
  'from-violet-500 to-purple-600',
  'from-sky-500 to-blue-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-emerald-500 to-teal-600',
] as const;

function accentAt(index: number) {
  return accents[index % accents.length];
}

function ageFromDob(value?: string) {
  if (!value) return null;
  const born = new Date(value);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const m = today.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age -= 1;
  return age;
}

interface ChildProfileCardProps {
  child: StudentProfile;
  index?: number;
  className?: string;
}

export function ChildProfileCard({ child, index = 0, className }: ChildProfileCardProps) {
  const accent = accentAt(index);
  const age = ageFromDob(child.dateOfBirth);
  const active = child.isActive !== false;

  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md',
        className
      )}
    >
      <div className={cn('relative h-28 bg-gradient-to-br p-4', accent)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.22),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-end">
          <p className="text-xs font-medium uppercase tracking-wider text-white/80">
            {child.studentCode}
          </p>
          <h3 className="text-xl font-semibold leading-tight text-white">{child.fullName}</h3>
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-white/20 p-2.5 backdrop-blur-sm">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={active ? 'Active' : 'Cancelled'} />
          {child.gender && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {formatGender(child.gender)}
            </span>
          )}
          {age != null && (
            <span className="text-xs text-slate-500">
              {age} years old
            </span>
          )}
        </div>

        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            Born {formatDateDDMMYYYY(child.dateOfBirth)}
          </li>
          <li className="flex items-center gap-2">
            <School className="h-4 w-4 shrink-0 text-slate-400" />
            {child.schoolName || 'School not listed'}
          </li>
          <li className="flex items-center gap-2 min-w-0">
            <Mail className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{child.email}</span>
          </li>
        </ul>
      </div>
    </article>
  );
}

interface PendingChildCardProps {
  registration: {
    fullName: string;
    dateOfBirth: string;
    gender: string;
    schoolName?: string;
    instrument?: string;
    submittedAt: string;
  };
  className?: string;
}

export function PendingChildCard({ registration, className }: PendingChildCardProps) {
  const age = ageFromDob(registration.dateOfBirth);

  return (
    <article
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-sm',
        className
      )}
    >
      <div className="relative h-28 bg-gradient-to-br from-amber-400 to-orange-500 p-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_15%,rgba(255,255,255,0.2),transparent_55%)]" />
        <div className="relative flex h-full flex-col justify-end">
          <p className="text-xs font-medium uppercase tracking-wider text-white/85">
            Registration submitted
          </p>
          <h3 className="text-xl font-semibold leading-tight text-white">{registration.fullName}</h3>
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-white/20 p-2.5 backdrop-blur-sm">
          <Music2 className="h-5 w-5 text-white" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <StatusBadge status="Pending" />
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            Born {formatDateDDMMYYYY(registration.dateOfBirth)}
            {age != null && ` · ${age} years`}
          </li>
          {registration.schoolName && (
            <li className="flex items-center gap-2">
              <School className="h-4 w-4 shrink-0 text-slate-400" />
              {registration.schoolName}
            </li>
          )}
          {registration.instrument && (
            <li className="flex items-center gap-2">
              <Music2 className="h-4 w-4 shrink-0 text-slate-400" />
              Interested in {registration.instrument}
            </li>
          )}
        </ul>
        <p className="mt-auto text-xs text-amber-700">
          Our team will review and link this profile within 1–2 working days.
        </p>
      </div>
    </article>
  );
}
