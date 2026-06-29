import { CalendarClock, Clock, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import type { NextLessonResult } from '@/utils/nextLesson';
import type { StudentClassCardData } from '@/components/student/StudentClassCard';

interface NextLessonCardProps {
  next: NextLessonResult<StudentClassCardData> | null;
}

export function NextLessonCard({ next }: NextLessonCardProps) {
  if (!next) return null;

  const { item, label, isToday } = next;

  return (
    <Card className="mb-6 overflow-hidden border-primary-200 bg-gradient-to-br from-primary-50 via-white to-slate-50">
      <CardContent className="p-0">
        <div className="p-5">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-600 px-2.5 py-0.5 text-xs font-semibold text-white">
                <CalendarClock className="h-3.5 w-3.5" />
                Next lesson
              </span>
              <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-primary-700 ring-1 ring-primary-200">
                {label}
              </span>
              {isToday && (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  Upcoming
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{item.className}</h2>
            {item.courseName && <p className="text-sm text-slate-600">{item.courseName}</p>}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              {item.dayOfWeek && (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-4 w-4 text-primary-500" />
                  {item.dayOfWeek}
                </span>
              )}
              {item.startTime && item.endTime && (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-4 w-4 text-primary-500" />
                  {item.startTime} – {item.endTime}
                </span>
              )}
              {item.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-4 w-4 text-primary-500" />
                  {item.location}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
