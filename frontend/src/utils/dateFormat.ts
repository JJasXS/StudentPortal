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
