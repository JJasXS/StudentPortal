import { OutstandingPaymentWhatsAppButton } from '@/components/fees/OutstandingPaymentWhatsAppButton';
import { formatRm } from '@/utils/invoiceBilling';
import { feeDisplayLabel } from '@/utils/whatsappPayment';
import type { SqlAccountOutstandingInvoice } from '@/types/sqlAccount';

interface ParentOutstandingFeesCardProps {
  invoices: SqlAccountOutstandingInvoice[];
  studentName?: string;
}

export function ParentOutstandingFeesCard({
  invoices,
  studentName,
}: ParentOutstandingFeesCardProps) {
  if (invoices.length === 0) return null;

  const total = invoices.reduce((sum, invoice) => sum + invoice.outstanding, 0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2.5">
        <p className="text-sm font-semibold text-slate-800">
          Due · {invoices.length} fee{invoices.length === 1 ? '' : 's'}
        </p>
        <p className="tabular-nums text-sm font-semibold text-amber-900">{formatRm(total)}</p>
      </div>
      <ul className="divide-y divide-slate-100 px-1">
        {invoices.map((invoice) => (
          <li
            key={invoice.docKey}
            className="flex flex-wrap items-baseline justify-between gap-2 px-2 py-2.5 text-sm"
          >
            <span className="min-w-0 font-medium text-slate-800">
              {feeDisplayLabel(invoice)}
            </span>
            <span className="tabular-nums font-medium text-amber-900">
              {formatRm(invoice.outstanding)}
            </span>
          </li>
        ))}
      </ul>
      <div className="px-3 pb-3 pt-1">
        <OutstandingPaymentWhatsAppButton invoices={invoices} studentName={studentName} />
      </div>
    </div>
  );
}
