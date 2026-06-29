import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import type { Announcement } from '@/types';

interface AnnouncementRowListProps {
  items: Announcement[];
  renderTitle: (item: Announcement) => ReactNode;
  senderLabel: (item: Announcement) => string;
  dateLabel: (item: Announcement) => string;
  className?: string;
}

export function AnnouncementRowList({
  items,
  renderTitle,
  senderLabel,
  dateLabel,
  className,
}: AnnouncementRowListProps) {
  return (
    <ul className={cn('divide-y divide-slate-100', className)}>
      {items.map((item) => (
        <li key={item.id}>
          <div className="py-3.5">
            <div className="text-sm leading-snug">{renderTitle(item)}</div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
              <span>{senderLabel(item)}</span>
              <span className="text-slate-300" aria-hidden>
                ·
              </span>
              <time className="tabular-nums">{dateLabel(item)}</time>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
