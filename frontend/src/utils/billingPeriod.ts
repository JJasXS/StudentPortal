const MONTH_NAMES = [
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
];

export function billingPeriodKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function formatBillingPeriodLabel(keyOrDate: string | Date): string {
  if (keyOrDate instanceof Date) {
    return `${MONTH_NAMES[keyOrDate.getMonth()]} ${keyOrDate.getFullYear()}`;
  }
  if (/^\d{4}-\d{2}$/.test(keyOrDate)) {
    const [y, m] = keyOrDate.split('-').map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  }
  return keyOrDate;
}

export function currentBillingPeriod(): string {
  return formatBillingPeriodLabel(new Date());
}
