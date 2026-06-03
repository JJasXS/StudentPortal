import { Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { getAnnouncementCategory } from '@/utils/announcements';
import { enrichHoliday, formatHolidayDateShort, getDaysLeftLabel } from '@/utils/holidays';
import type { Announcement } from '@/types';

interface GeneralAnnouncementListProps {
  items: Announcement[];
  emptyMessage?: string;
}

export function GeneralAnnouncementList({
  items,
  emptyMessage = 'No announcements.',
}: GeneralAnnouncementListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((a) => {
        const isHoliday = getAnnouncementCategory(a) === 'Holiday';
        const holidayMeta = isHoliday ? enrichHoliday(a) : null;

        return (
          <Card
            key={a.id}
            className={isHoliday ? 'border-amber-200/80 bg-amber-50/30' : undefined}
          >
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base leading-snug">{a.title}</CardTitle>
                <div className="flex flex-wrap items-center gap-1.5">
                  {isHoliday ? (
                    <StatusBadge status="Public holiday" />
                  ) : (
                    a.targetRole !== 'All' && <StatusBadge status={a.targetRole} />
                  )}
                </div>
              </div>
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                {isHoliday && holidayMeta?.date && (
                  <>
                    <Calendar className="h-3.5 w-3.5 text-amber-600" />
                    <span className="font-medium text-amber-800">
                      {formatHolidayDateShort(holidayMeta.date)}
                      {holidayMeta.daysLeft != null &&
                        getDaysLeftLabel(holidayMeta.daysLeft) &&
                        ` · ${getDaysLeftLabel(holidayMeta.daysLeft)}`}
                    </span>
                    <span className="text-slate-300">·</span>
                  </>
                )}
                <span>
                  Posted {formatDateDDMMYYYY(a.createdAt)}
                  {a.createdByName ? ` · ${a.createdByName}` : ''}
                </span>
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-slate-700">{a.content}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
