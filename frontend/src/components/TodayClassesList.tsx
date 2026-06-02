import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Eye, MapPin, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/utils/cn';
import {
  formatTodayHeading,
  isInProgressToday,
  isUpcomingToday,
  type TodayClassItem,
} from '@/utils/teacherSchedule';

interface TodayClassesListProps {
  items: TodayClassItem[];
  loading?: boolean;
}

function TodayClassDetailModal({
  item,
  onClose,
}: {
  item: TodayClassItem;
  onClose: () => void;
}) {
  const inProgress = isInProgressToday(item.startTime, item.endTime);
  const upcoming = isUpcomingToday(item.startTime);

  return (
    <Modal open onClose={onClose} title={item.className} className="max-w-md">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={item.status} />
          {inProgress && (
            <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-medium text-white">
              In progress
            </span>
          )}
          {upcoming && !inProgress && (
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
              Up next
            </span>
          )}
        </div>
        {item.courseName && (
          <p className="text-sm text-slate-600">{item.courseName}</p>
        )}
        {item.topic && (
          <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{item.topic}</p>
        )}
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
            {formatTodayHeading()}
          </li>
          <li className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-slate-400" />
            {item.startTime} – {item.endTime}
          </li>
          <li className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
            {item.location}
          </li>
          {item.enrolledCount != null && (
            <li className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0 text-slate-400" />
              {item.enrolledCount} students enrolled
            </li>
          )}
        </ul>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Link to="/teacher/classes">
            <Button type="button">All my classes</Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
}

export function TodayClassesList({ items, loading }: TodayClassesListProps) {
  const heading = formatTodayHeading();
  const [viewItem, setViewItem] = useState<TodayClassItem | null>(null);

  return (
    <Card className="mb-6">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-lg">My classes today</CardTitle>
        <p className="text-sm font-normal text-slate-500">{heading}</p>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="p-6 text-sm text-slate-500">Loading today&apos;s schedule…</p>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-slate-700">No classes today</p>
            <p className="mt-1 text-sm text-slate-500">
              You have no recurring classes or sessions scheduled for this day.
            </p>
            <Link
              to="/teacher/classes"
              className="mt-4 inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
            >
              View all my classes
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((item) => {
              const inProgress = isInProgressToday(item.startTime, item.endTime);
              const upcoming = isUpcomingToday(item.startTime);
              return (
                <li
                  key={item.id}
                  className={cn(
                    'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between',
                    inProgress && 'bg-primary-50/60'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{item.className}</h3>
                      {inProgress && (
                        <span className="rounded-full bg-primary-600 px-2 py-0.5 text-xs font-medium text-white">
                          Now
                        </span>
                      )}
                      {upcoming && !inProgress && (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                          Up next
                        </span>
                      )}
                      <StatusBadge status={item.status} />
                    </div>
                    {item.courseName && (
                      <p className="mt-0.5 text-sm text-slate-500">{item.courseName}</p>
                    )}
                    {item.topic && (
                      <p className="mt-1 text-sm text-slate-600">{item.topic}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-4 w-4 text-slate-400" />
                        {item.startTime} – {item.endTime}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4 text-slate-400" />
                        {item.location}
                      </span>
                      {item.enrolledCount != null && (
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-4 w-4 text-slate-400" />
                          {item.enrolledCount} students
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setViewItem(item)}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 hover:bg-slate-50"
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      View
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      {viewItem && (
        <TodayClassDetailModal item={viewItem} onClose={() => setViewItem(null)} />
      )}
    </Card>
  );
}
