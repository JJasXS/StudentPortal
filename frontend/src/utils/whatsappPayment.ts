import { formatRm } from '@/utils/invoiceBilling';

/** Digits only for wa.me; leading 0 → Malaysia country code 60. */
export function toWhatsAppDigits(phone: string | undefined | null): string | null {
  if (!phone?.trim()) return null;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0')) digits = `60${digits.slice(1)}`;
  return digits.length >= 8 ? digits : null;
}

/** Drop "(payment reminder)" from SQL Account description for UI + WhatsApp. */
export function feeDisplayLabel(invoice: {
  description?: string | null;
  docNo?: string;
}): string {
  const raw = invoice.description?.trim() || '';
  const cleaned = raw
    .replace(/\s*\(\s*payment\s+reminder\s*\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || invoice.docNo?.trim() || 'Music class fees';
}

function formatInvoiceLine(
  index: number,
  invoice: { outstanding: number; description?: string | null; docNo?: string }
): string {
  return `${index}. ${feeDisplayLabel(invoice)} - ${formatRm(invoice.outstanding)}`;
}

export function buildOutstandingPaymentMessage(opts: {
  centreName: string;
  studentName: string;
  totalOutstanding: number;
  invoices: { outstanding: number; description?: string | null; docNo?: string }[];
}): string {
  const centre = opts.centreName.trim() || 'the music centre';
  const name = opts.studentName.trim() || 'a student';
  const total = formatRm(opts.totalOutstanding);
  const lines = opts.invoices.map((invoice, i) => formatInvoiceLine(i + 1, invoice));

  return [
    `Hi ${centre}, I'm ${name}`,
    '',
    `I would like to make payment for outstanding music class fees of ${total}.`,
    '',
    ...lines,
  ].join('\n');
}

export function buildOutstandingPaymentWhatsAppUrl(opts: {
  phone: string | undefined | null;
  centreName: string;
  studentName: string;
  totalOutstanding: number;
  invoices: { outstanding: number; description?: string | null; docNo?: string }[];
}): string | null {
  const digits = toWhatsAppDigits(opts.phone);
  if (!digits) return null;

  const text = buildOutstandingPaymentMessage(opts);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
