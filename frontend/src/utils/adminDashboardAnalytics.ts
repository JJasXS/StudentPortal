import type { Enrollment, Invoice } from '@/types';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface MonthlyCountPoint {
  monthKey: string;
  monthLabel: string;
  count: number;
}

export interface MonthlyInvoicePoint {
  monthKey: string;
  monthLabel: string;
  paid: number;
  unpaid: number;
  draft: number;
}

export interface InvoiceStatusSummary {
  paid: number;
  unpaid: number;
  draft: number;
  cancelled: number;
  totalAmount: number;
  collectedAmount: number;
  outstandingAmount: number;
}

function monthKeyFromDate(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function monthLabelFromKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_LABELS[m - 1]} ${String(y).slice(2)}`;
}

function sortedMonthKeys(keys: Set<string>): string[] {
  return [...keys].sort();
}

export function buildEnrollmentMonthlySeries(enrollments: Enrollment[]): MonthlyCountPoint[] {
  const counts = new Map<string, number>();
  for (const e of enrollments) {
    if (e.status === 'Cancelled') continue;
    const key = monthKeyFromDate(e.enrollmentDate);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return sortedMonthKeys(new Set(counts.keys())).map((monthKey) => ({
    monthKey,
    monthLabel: monthLabelFromKey(monthKey),
    count: counts.get(monthKey) ?? 0,
  }));
}

/** Count unique students with their first enrollment in each month. */
export function buildStudentsJoinedMonthlySeries(enrollments: Enrollment[]): MonthlyCountPoint[] {
  const firstEnrollmentByStudent = new Map<string, string>();

  for (const e of enrollments) {
    if (e.status === 'Cancelled') continue;
    const existing = firstEnrollmentByStudent.get(e.studentUserId);
    if (!existing || e.enrollmentDate < existing) {
      firstEnrollmentByStudent.set(e.studentUserId, e.enrollmentDate);
    }
  }

  const counts = new Map<string, number>();
  for (const date of firstEnrollmentByStudent.values()) {
    const key = monthKeyFromDate(date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return sortedMonthKeys(new Set(counts.keys())).map((monthKey) => ({
    monthKey,
    monthLabel: monthLabelFromKey(monthKey),
    count: counts.get(monthKey) ?? 0,
  }));
}

export function buildInvoiceMonthlySeries(invoices: Invoice[]): MonthlyInvoicePoint[] {
  const byMonth = new Map<string, { paid: number; unpaid: number; draft: number }>();

  for (const inv of invoices) {
    if (inv.status === 'Cancelled') continue;
    const key = monthKeyFromDate(inv.createdAt);
    const row = byMonth.get(key) ?? { paid: 0, unpaid: 0, draft: 0 };
    if (inv.status === 'Paid') row.paid += inv.amount;
    else if (inv.status === 'Unpaid') row.unpaid += inv.amount;
    else if (inv.status === 'Draft') row.draft += inv.amount;
    byMonth.set(key, row);
  }

  return sortedMonthKeys(new Set(byMonth.keys())).map((monthKey) => {
    const row = byMonth.get(monthKey)!;
    return {
      monthKey,
      monthLabel: monthLabelFromKey(monthKey),
      paid: Math.round(row.paid),
      unpaid: Math.round(row.unpaid),
      draft: Math.round(row.draft),
    };
  });
}

export function buildInvoiceStatusSummary(invoices: Invoice[]): InvoiceStatusSummary {
  let paid = 0;
  let unpaid = 0;
  let draft = 0;
  let cancelled = 0;
  let collectedAmount = 0;
  let outstandingAmount = 0;
  let totalAmount = 0;

  for (const inv of invoices) {
    if (inv.status === 'Cancelled') {
      cancelled += 1;
      continue;
    }
    totalAmount += inv.amount;
    if (inv.status === 'Paid') {
      paid += 1;
      collectedAmount += inv.amount;
    } else if (inv.status === 'Unpaid') {
      unpaid += 1;
      outstandingAmount += inv.amount;
    } else if (inv.status === 'Draft') {
      draft += 1;
      outstandingAmount += inv.amount;
    }
  }

  return {
    paid,
    unpaid,
    draft,
    cancelled,
    totalAmount: Math.round(totalAmount),
    collectedAmount: Math.round(collectedAmount),
    outstandingAmount: Math.round(outstandingAmount),
  };
}

export function countEnrollmentsThisMonth(enrollments: Enrollment[], now = new Date()): number {
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  return enrollments.filter(
    (e) => e.status !== 'Cancelled' && monthKeyFromDate(e.enrollmentDate) === key
  ).length;
}

export function filterInvoicesByDateRange(
  invoices: Invoice[],
  fromMonth?: string,
  toMonth?: string
): Invoice[] {
  if (!fromMonth && !toMonth) return invoices;
  return invoices.filter((inv) => {
    const key = monthKeyFromDate(inv.createdAt);
    if (fromMonth && key < fromMonth) return false;
    if (toMonth && key > toMonth) return false;
    return true;
  });
}

export function filterEnrollmentsByDateRange(
  enrollments: Enrollment[],
  fromMonth?: string,
  toMonth?: string
): Enrollment[] {
  if (!fromMonth && !toMonth) return enrollments;
  return enrollments.filter((e) => {
    const key = monthKeyFromDate(e.enrollmentDate);
    if (fromMonth && key < fromMonth) return false;
    if (toMonth && key > toMonth) return false;
    return true;
  });
}

export interface CourseRevenuePoint {
  courseName: string;
  paid: number;
  unpaid: number;
  total: number;
}

/** Revenue totals grouped by course (paid vs outstanding). */
export function buildRevenueByCourseSeries(invoices: Invoice[]): CourseRevenuePoint[] {
  const byCourse = new Map<string, { paid: number; unpaid: number }>();

  for (const inv of invoices) {
    if (inv.status === 'Cancelled') continue;
    const course = inv.courseName ?? 'Other';
    const row = byCourse.get(course) ?? { paid: 0, unpaid: 0 };
    if (inv.status === 'Paid') row.paid += inv.amount;
    else row.unpaid += inv.amount;
    byCourse.set(course, row);
  }

  return [...byCourse.entries()]
    .map(([courseName, row]) => ({
      courseName,
      paid: Math.round(row.paid),
      unpaid: Math.round(row.unpaid),
      total: Math.round(row.paid + row.unpaid),
    }))
    .sort((a, b) => b.total - a.total);
}
