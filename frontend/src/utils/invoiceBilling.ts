import type { Invoice } from '@/types';

export function formatInvoiceCourse(invoice: Invoice): string {
  if (invoice.courseName && invoice.className) {
    return `${invoice.courseName} · ${invoice.className}`;
  }
  return invoice.courseName ?? invoice.className ?? 'Tuition';
}

export function unpaidInvoiceTotal(invoices: Invoice[]): number {
  return invoices
    .filter((i) => i.status === 'Unpaid')
    .reduce((sum, i) => sum + i.amount, 0);
}

export function formatAmount(amount: number) {
  return amount.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatRm(amount: number, currency = 'MYR') {
  const prefix = currency === 'MYR' ? 'RM' : currency;
  return `${prefix} ${amount.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
