import { AlertCircle } from 'lucide-react';
import { formatRm } from '@/utils/invoiceBilling';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import type { SqlAccountOutstandingInvoice } from '@/types/sqlAccount';

interface ParentOutstandingFeesCardProps {
  invoices: SqlAccountOutstandingInvoice[];
}

export function ParentOutstandingFeesCard({ invoices }: ParentOutstandingFeesCardProps) {
  if (invoices.length === 0) return null;

  const total = invoices.reduce((sum, invoice) => sum + invoice.outstanding, 0);

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-amber-900">
            Payment reminder — {invoices.length} fee
            {invoices.length === 1 ? '' : 's'} due · {formatRm(total)}
          </p>
          <p className="mt-1 text-sm text-amber-800">
            Music class fees waiting to be paid. Pay at the centre or via your usual payment method.
          </p>
          <ul className="mt-3 space-y-2 border-t border-amber-200/80 pt-3">
            {invoices.map((invoice) => (
              <li
                key={invoice.docKey}
                className="flex flex-wrap items-baseline justify-between gap-2 text-sm text-amber-900"
              >
                <span>
                  <span className="font-medium">{invoice.docNo}</span>
                  {invoice.dueDate ? (
                    <span className="ml-2 text-amber-800">
                      due {formatDateDDMMYYYY(invoice.dueDate)}
                    </span>
                  ) : null}
                  {invoice.description ? (
                    <span className="mt-0.5 block text-xs text-amber-700">{invoice.description}</span>
                  ) : null}
                </span>
                <span className="tabular-nums font-medium text-amber-900">
                  {formatRm(invoice.outstanding)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
