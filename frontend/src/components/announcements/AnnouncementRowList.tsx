import { CalendarDays, ChevronRight, Megaphone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { getAnnouncementCategory, isAnnouncementExpired } from '@/utils/announcements';
import type { Announcement } from '@/types';

interface AnnouncementRowListProps {
  items: Announcement[];
  senderLabel: (item: Announcement) => string;
  dateLabel: (item: Announcement) => string;
  detailBasePath?: string;
  showExpiredBadge?: boolean;
  className?: string;
}

function AnnouncementRow({
  item,
  senderLabel,
  dateLabel,
  showExpiredBadge,
}: {
  item: Announcement;
  senderLabel: (item: Announcement) => string;
  dateLabel: (item: Announcement) => string;
  showExpiredBadge: boolean;
}) {
  const expired = isAnnouncementExpired(item);
  const isHoliday = getAnnouncementCategory(item) === 'Holiday';
  const preview = item.content?.trim();

  return (
    <div className="flex items-start gap-3 px-1 py-3.5 sm:gap-4 sm:px-2">
      <div
        className={cn(
          'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          isHoliday ? 'bg-amber-50 text-amber-700' : 'bg-primary-50 text-primary-700'
        )}
      >
        {isHoliday ? <CalendarDays className="h-5 w-5" /> : <Megaphone className="h-5 w-5" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{item.title}</span>
            {expired && showExpiredBadge && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                Expired
              </span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
            <span className="truncate max-w-[8rem]">{senderLabel(item)}</span>
            <span className="text-slate-300" aria-hidden>
              ·
            </span>
            <time className="tabular-nums whitespace-nowrap">{dateLabel(item)}</time>
          </div>
        </div>

        <p className="mt-1 line-clamp-2 text-sm leading-snug text-slate-600">
          {preview || '—'}
        </p>
      </div>
    </div>
  );
}

export function AnnouncementRowList({
  items,
  senderLabel,
  dateLabel,
  detailBasePath,
  showExpiredBadge = false,
  className,
}: AnnouncementRowListProps) {
  return (
    <ul className={cn('divide-y divide-slate-100', className)}>
      {items.map((item) => (
        <li key={item.id}>
          {detailBasePath ? (
            <Link
              to={`${detailBasePath}/${item.id}`}
              state={{ announcement: item }}
              className="group flex items-start gap-1 rounded-lg transition-colors hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
            >
              <div className="min-w-0 flex-1">
                <AnnouncementRow
                  item={item}
                  senderLabel={senderLabel}
                  dateLabel={dateLabel}
                  showExpiredBadge={showExpiredBadge}
                />
              </div>
              <ChevronRight className="mt-5 mr-2 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-primary-500" />
            </Link>
          ) : (
            <AnnouncementRow
              item={item}
              senderLabel={senderLabel}
              dateLabel={dateLabel}
              showExpiredBadge={showExpiredBadge}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
