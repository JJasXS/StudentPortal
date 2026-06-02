import type { Announcement } from '@/types';
import { getAnnouncementCategory } from './announcements';

export function getHolidayDate(announcement: Announcement): Date | null {
  if (announcement.holidayDate) {
    const d = new Date(announcement.holidayDate);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const juneMatch = announcement.content.match(/june\s+(\d{1,2})/i);
  if (juneMatch) {
    const year = new Date().getFullYear();
    return new Date(year, 5, parseInt(juneMatch[1], 10));
  }
  const augMatch = announcement.content.match(/(\d{1,2})\s+august/i);
  if (augMatch) {
    const year = new Date().getFullYear();
    return new Date(year, 7, parseInt(augMatch[1], 10));
  }
  return null;
}

export function getDaysUntil(date: Date, from: Date = new Date()): number {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = end.getTime() - start.getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function formatHolidayDate(date: Date) {
  return date.toLocaleDateString('en-MY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatHolidayDateShort(date: Date) {
  return date.toLocaleDateString('en-MY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getDaysLeftLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  if (days === 0) return 'Today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

export function sortHolidaysByDate(holidays: Announcement[]) {
  return [...holidays].sort((a, b) => {
    const da = getHolidayDate(a)?.getTime() ?? Infinity;
    const db = getHolidayDate(b)?.getTime() ?? Infinity;
    return da - db;
  });
}

export function enrichHoliday(announcement: Announcement) {
  const date = getHolidayDate(announcement);
  const daysLeft = date !== null ? getDaysUntil(date) : null;
  return { announcement, date, daysLeft };
}

export type EnrichedHoliday = ReturnType<typeof enrichHoliday>;

export function filterHolidayAnnouncements(announcements: Announcement[]) {
  return announcements.filter((a) => getAnnouncementCategory(a) === 'Holiday');
}
