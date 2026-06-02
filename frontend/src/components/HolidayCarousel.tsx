import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  enrichHoliday,
  formatHolidayDateShort,
  getDaysLeftLabel,
  sortHolidaysByDate,
} from '@/utils/holidays';
import type { Announcement } from '@/types';

interface HolidayCarouselProps {
  holidays: Announcement[];
  showViewAllLink?: boolean;
  viewAllPath?: string;
  className?: string;
}

export function HolidayCarousel({
  holidays,
  showViewAllLink = true,
  viewAllPath = '/admin/announcements',
  className,
}: HolidayCarouselProps) {
  const slides = useMemo(() => sortHolidaysByDate(holidays).map(enrichHoliday), [holidays]);
  const [index, setIndex] = useState(0);

  const count = slides.length;
  const canNavigate = count > 1;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count]
  );

  const goPrev = () => setIndex((i) => ((i - 1 + count) % count));
  const goNext = () => setIndex((i) => (i + 1) % count);

  useEffect(() => {
    if (index >= count && count > 0) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    if (!canNavigate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goTo(index - 1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goTo(index + 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, goTo, canNavigate]);

  if (count === 0) {
    return (
      <div
        className={cn(
          'flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50',
          className
        )}
      >
        <p className="text-xs text-slate-500">No public holidays scheduled.</p>
      </div>
    );
  }

  return (
    <div className={cn(className)}>
      {/* Carousel row: left arrow | slides | right arrow */}
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          onClick={goPrev}
          disabled={!canNavigate}
          aria-label="Previous holiday"
          className={cn(
            'relative z-10 flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 transition-colors',
            canNavigate
              ? 'cursor-pointer text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
              : 'cursor-not-allowed text-slate-300'
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="relative min-w-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{
              width: `${count * 100}%`,
              transform: `translateX(-${index * (100 / count)}%)`,
            }}
          >
            {slides.map(({ announcement, date, daysLeft }) => (
              <div
                key={announcement.id}
                className="flex shrink-0 items-center gap-3 px-3 py-3"
                style={{ width: `${100 / count}%` }}
              >
                {daysLeft !== null && (
                  <span
                    className={cn(
                      'shrink-0 rounded-md px-2 py-1 text-center text-xs font-bold leading-tight',
                      daysLeft === 0
                        ? 'bg-red-100 text-red-700'
                        : daysLeft <= 7
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-primary-100 text-primary-800'
                    )}
                  >
                    {getDaysLeftLabel(daysLeft)}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {date && (
                    <p className="text-xs font-medium text-slate-500">
                      {formatHolidayDateShort(date)}
                    </p>
                  )}
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {announcement.title}
                  </p>
                  <p className="line-clamp-1 text-xs text-slate-600">{announcement.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={!canNavigate}
          aria-label="Next holiday"
          className={cn(
            'relative z-10 flex shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 transition-colors',
            canNavigate
              ? 'cursor-pointer text-slate-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700'
              : 'cursor-not-allowed text-slate-300'
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {canNavigate &&
            slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === index ? 'w-4 bg-primary-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                )}
              />
            ))}
          <span className="ml-1 text-[10px] text-slate-400">
            {index + 1} of {count}
          </span>
        </div>
        {showViewAllLink && (
          <Link
            to={viewAllPath}
            className="text-[11px] font-medium text-primary-600 hover:text-primary-700"
          >
            View all →
          </Link>
        )}
      </div>
    </div>
  );
}
