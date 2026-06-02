import { Link } from 'react-router-dom';
import { teacherClassAttendanceUrl } from '@/utils/attendanceLinks';
import { Calendar, Clock, MapPin, Users, GraduationCap } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ClassItem } from '@/types';

const courseAccent: Record<string, string> = {
  Piano: 'from-violet-500 to-purple-600',
  Guitar: 'from-amber-500 to-orange-600',
  Violin: 'from-rose-500 to-pink-600',
  Vocal: 'from-sky-500 to-blue-600',
  Drums: 'from-emerald-500 to-teal-600',
};

function accentForClass(item: ClassItem) {
  const course = item.courseName ?? '';
  for (const key of Object.keys(courseAccent)) {
    if (course.toLowerCase().includes(key.toLowerCase())) return courseAccent[key];
  }
  return 'from-primary-500 to-primary-700';
}

interface TeacherClassCardProps {
  classItem: ClassItem;
  className?: string;
}

export function TeacherClassCard({ classItem, className }: TeacherClassCardProps) {
  const accent = accentForClass(classItem);

  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg',
        className
      )}
    >
      <div className={cn('relative h-24 bg-gradient-to-br p-4', accent)}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-end">
          <p className="text-xs font-medium uppercase tracking-wider text-white/75">
            {classItem.courseName ?? 'Music class'}
          </p>
          <h3 className="text-lg font-semibold leading-tight text-white">{classItem.className}</h3>
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-white/20 p-2 backdrop-blur-sm">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {classItem.enrolledCount != null && (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
            <Users className="h-3 w-3" />
            {classItem.enrolledCount} / {classItem.maxStudents}
          </span>
        )}

        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            {classItem.dayOfWeek}
          </li>
          <li className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-slate-400" />
            {classItem.startTime} – {classItem.endTime}
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            {classItem.location}
          </li>
        </ul>

        <div className="mt-auto flex gap-2 border-t border-slate-100 pt-3">
          <Link
            to={`/teacher/classes/${classItem.id}/sessions`}
            className="flex-1 rounded-lg bg-primary-50 px-3 py-2 text-center text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
          >
            Sessions
          </Link>
          <Link
            to={teacherClassAttendanceUrl(classItem.id)}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Attendance
          </Link>
        </div>
      </div>
    </article>
  );
}
