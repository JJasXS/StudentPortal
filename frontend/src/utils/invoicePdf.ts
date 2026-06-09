import type { Invoice } from '@/types';

export async function downloadInvoicePdf(invoice: Invoice) {
  const { renderInvoicePdf } = await import('@/utils/invoicePdfRenderer');
  renderInvoicePdf(invoice, 'invoice');
}

export async function downloadPaymentReceiptPdf(invoice: Invoice) {
  const { renderInvoicePdf } = await import('@/utils/invoicePdfRenderer');
  renderInvoicePdf(invoice, 'receipt');
}
