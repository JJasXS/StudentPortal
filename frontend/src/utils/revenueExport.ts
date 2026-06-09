import type { Invoice } from '@/types';
import { formatInvoiceCourse, formatRm } from '@/utils/invoiceBilling';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { downloadCsv } from '@/utils/exportDownload';

export function exportRevenueCsv(invoices: Invoice[], filename = 'revenue-export.csv') {
  const headers = [
    'Invoice',
    'Student',
    'Parent',
    'Course',
    'Billing period',
    'Amount',
    'Status',
    'Issued',
    'Due',
    'Paid',
  ];
  const rows = invoices
    .filter((i) => i.status !== 'Cancelled')
    .map((i) => [
      i.invoiceNo,
      i.studentName ?? '',
      i.parentName ?? '',
      formatInvoiceCourse(i),
      i.billingPeriod ?? '',
      formatRm(i.amount),
      i.status,
      formatDateDDMMYYYY(i.createdAt),
      formatDateDDMMYYYY(i.dueDate),
      i.paidAt ? formatDateDDMMYYYY(i.paidAt) : '',
    ]);
  downloadCsv(filename, headers, rows);
}
