function pad2(n: number) {
  return String(n).padStart(2, '0');
}

/** Format as dd-mm-yyyy (e.g. 15-05-2012). */
export function formatDateDDMMYYYY(value?: string | Date | null): string {
  if (value == null || value === '') return '—';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '—';
    return `${pad2(value.getDate())}-${pad2(value.getMonth() + 1)}-${value.getFullYear()}`;
  }

  const iso = value.slice(0, 10);
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (ymd) return `${ymd[3]}-${ymd[2]}-${ymd[1]}`;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/** Format as HH:mm (24h local). */
export function formatTimeHHmm(value?: string | Date | null): string {
  if (value == null || value === '') return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

const MONTH_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** Format as day + month, e.g. "2 March". */
export function formatDateDayMonth(value?: string | Date | null): string {
  if (value == null || value === '') return '—';

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '—';
    return `${value.getDate()} ${MONTH_LONG[value.getMonth()]}`;
  }

  const iso = value.slice(0, 10);
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (ymd) {
    const month = Number(ymd[2]) - 1;
    const day = Number(ymd[3]);
    if (month < 0 || month > 11 || Number.isNaN(day)) return '—';
    return `${day} ${MONTH_LONG[month]}`;
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.getDate()} ${MONTH_LONG[d.getMonth()]}`;
}

/** Format as 12h clock, e.g. "2:00PM". Accepts "HH:mm" or Date. */
export function formatTime12h(value?: string | Date | null): string {
  if (value == null || value === '') return '—';

  let hours: number;
  let minutes: number;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return '—';
    hours = value.getHours();
    minutes = value.getMinutes();
  } else {
    const hm = /^(\d{1,2}):(\d{2})/.exec(value.trim());
    if (hm) {
      hours = Number(hm[1]);
      minutes = Number(hm[2]);
    } else {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;
      hours = d.getHours();
      minutes = d.getMinutes();
    }
  }

  if (Number.isNaN(hours) || Number.isNaN(minutes)) return '—';
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${pad2(minutes)}${period}`;
}
