const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

function parseTimeMinutes(value?: string): number | null {
  if (!value?.trim()) return null;
  const [h, m] = value.split(':').map((part) => Number(part));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

export interface NextLessonResult<T> {
  item: T;
  isToday: boolean;
  daysUntil: number;
  label: string;
}

export function findNextLesson<T extends { dayOfWeek?: string; startTime?: string }>(
  classes: T[],
  now = new Date()
): NextLessonResult<T> | null {
  if (classes.length === 0) return null;

  const todayIndex = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let best: { item: T; score: number; daysUntil: number; isToday: boolean } | null = null;

  for (const item of classes) {
    if (!item.dayOfWeek) continue;
    const dayIndex = WEEKDAYS.indexOf(item.dayOfWeek as (typeof WEEKDAYS)[number]);
    if (dayIndex < 0) continue;

    let daysUntil = (dayIndex - todayIndex + 7) % 7;
    const startMinutes = parseTimeMinutes(item.startTime) ?? 0;
    let isToday = daysUntil === 0;

    if (daysUntil === 0 && startMinutes <= nowMinutes) {
      daysUntil = 7;
      isToday = false;
    }

    const score = daysUntil * 24 * 60 + startMinutes;
    if (!best || score < best.score) {
      best = { item, score, daysUntil, isToday };
    }
  }

  if (!best) return null;

  const label =
    best.isToday
      ? 'Today'
      : best.daysUntil === 1
        ? 'Tomorrow'
        : `In ${best.daysUntil} days`;

  return {
    item: best.item,
    isToday: best.isToday,
    daysUntil: best.daysUntil,
    label,
  };
}
