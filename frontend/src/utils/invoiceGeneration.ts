import type { ClassItem, Enrollment, Invoice } from '@/types';
import { loadCentreSettings } from '@/utils/centreSettingsStorage';
import { parentByStudent } from '@/utils/mockDashboardSeed';
import { mockParents } from '@/utils/mockData';
import { formatBillingPeriodLabel } from '@/utils/billingPeriod';

function parentForStudent(studentUserId: string) {
  for (const p of mockParents) {
    if (p.children?.includes(studentUserId)) {
      return { parentUserId: p.userId, parentName: p.fullName };
    }
  }
  return parentByStudent[studentUserId] ?? { parentUserId: '6', parentName: 'Michael Tan' };
}

function monthBillingKey(studentUserId: string, classId: string, monthKey: string) {
  return `${studentUserId}:${classId}:${monthKey}`;
}

function existingBillingKeys(invoices: Invoice[]): Set<string> {
  const keys = new Set<string>();
  for (const inv of invoices) {
    if (inv.status === 'Cancelled') continue;
    const monthKey = inv.createdAt.slice(0, 7);
    const className = inv.className ?? '';
    keys.add(`${inv.studentUserId}:${className}:${monthKey}`);
  }
  return keys;
}

let invoiceCounter = Date.now();

function nextInvoiceId() {
  invoiceCounter += 1;
  return `inv-gen-${invoiceCounter}`;
}

function nextInvoiceNo(existing: Invoice[], settings: ReturnType<typeof loadCentreSettings>, year: number): string {
  const prefix = (settings.invoicePrefix || 'INV').replace(/-+$/, '');
  const pattern = `${prefix}-${year}-`;
  const nums = existing
    .map((i) => i.invoiceNo)
    .filter((no) => no.startsWith(pattern))
    .map((no) => parseInt(no.slice(pattern.length), 10))
    .filter((n) => !Number.isNaN(n));
  const seq = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${pattern}${String(seq).padStart(3, '0')}`;
}

function dueDateFromIssued(issued: string): string {
  const d = new Date(issued);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export interface CreateInvoiceInput {
  studentUserId: string;
  studentName: string;
  classId?: string;
  className?: string;
  courseName?: string;
  amount?: number;
  dueDate?: string;
  billingPeriod?: string;
  sendNow?: boolean;
}

export function buildInvoice(
  input: CreateInvoiceInput,
  existing: Invoice[],
  issuedAt = new Date()
): Invoice {
  const settings = loadCentreSettings();
  const issued = issuedAt.toISOString().slice(0, 10);
  const parent = parentForStudent(input.studentUserId);
  const year = issuedAt.getFullYear();
  const period = input.billingPeriod ?? formatBillingPeriodLabel(issuedAt);

  return {
    id: nextInvoiceId(),
    studentUserId: input.studentUserId,
    studentName: input.studentName,
    parentUserId: parent.parentUserId,
    parentName: parent.parentName,
    courseName: input.courseName,
    className: input.className,
    invoiceNo: nextInvoiceNo(existing, settings, year),
    amount: input.amount ?? settings.defaultMonthlyFee,
    billingPeriod: period,
    status: input.sendNow ? 'Unpaid' : 'Draft',
    dueDate: input.dueDate ?? dueDateFromIssued(issued),
    createdAt: `${issued}T09:00:00`,
  };
}

export function invoicesForClass(
  classItem: ClassItem,
  enrollments: Enrollment[],
  existing: Invoice[],
  options?: { amount?: number; sendNow?: boolean }
): Invoice[] {
  const active = enrollments.filter((e) => e.classId === classItem.id && e.status === 'Active');
  const built: Invoice[] = [];
  let base = [...existing, ...built];

  for (const e of active) {
    built.push(
      buildInvoice(
        {
          studentUserId: e.studentUserId,
          studentName: e.studentName ?? 'Student',
          className: classItem.className,
          courseName: classItem.courseName,
          amount: options?.amount,
          sendNow: options?.sendNow,
        },
        base
      )
    );
    base = [...existing, ...built];
  }
  return built;
}

export interface MonthlyBillingResult {
  created: Invoice[];
  skipped: number;
}

/** Bill active enrollments for the current month using the default fee from Settings. */
export function generateMonthlyBilling(
  enrollments: Enrollment[],
  classes: ClassItem[],
  existing: Invoice[],
  now = new Date()
): MonthlyBillingResult {
  const settings = loadCentreSettings();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const billed = existingBillingKeys(existing);
  const classById = new Map(classes.map((c) => [c.id, c]));
  const created: Invoice[] = [];
  let skipped = 0;
  let base = [...existing];

  for (const e of enrollments.filter((x) => x.status === 'Active')) {
    const cls = classById.get(e.classId);
    const className = cls?.className ?? e.className ?? '';
    const key = monthBillingKey(e.studentUserId, className, monthKey);
    if (billed.has(key)) {
      skipped += 1;
      continue;
    }

    const inv = buildInvoice(
      {
        studentUserId: e.studentUserId,
        studentName: e.studentName ?? 'Student',
        className,
        courseName: cls?.courseName,
        amount: settings.defaultMonthlyFee,
        billingPeriod: formatBillingPeriodLabel(now),
        sendNow: true,
      },
      base,
      now
    );
    created.push(inv);
    base = [...base, inv];
    billed.add(key);
  }

  return { created, skipped };
}
