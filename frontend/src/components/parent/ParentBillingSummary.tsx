import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatInvoiceCourse, formatRm, unpaidInvoiceTotal } from '@/utils/invoiceBilling';
import type { Invoice } from '@/types';

interface ParentBillingSummaryProps {
  invoices: Invoice[];
  onPay: (invoice: Invoice) => void;
}

export function ParentBillingSummary({ invoices, onPay }: ParentBillingSummaryProps) {
  const unpaid = invoices.filter((i) => i.status === 'Unpaid');
  const total = unpaidInvoiceTotal(invoices);

  if (unpaid.length === 0) {
    return (
      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
        All course fees are up to date — no payments due right now.
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-900">
              {unpaid.length} course fee{unpaid.length === 1 ? '' : 's'} due — {formatRm(total)}
            </p>
            <p className="mt-1 text-sm text-amber-800">
              Pay monthly tuition via FPX online banking below.
            </p>
          </div>
        </div>
      </div>
      <ul className="mt-3 space-y-2 border-t border-amber-200/80 pt-3">
        {unpaid.slice(0, 3).map((inv) => (
          <li
            key={inv.id}
            className="flex flex-wrap items-center justify-between gap-2 text-sm text-amber-900"
          >
            <span>
              <span className="font-medium">{inv.studentName}</span>
              {' — '}
              {formatInvoiceCourse(inv)}
              <span className="ml-2 tabular-nums text-amber-800">{formatRm(inv.amount)}</span>
            </span>
            <Button type="button" size="sm" onClick={() => onPay(inv)}>
              Pay now
            </Button>
          </li>
        ))}
      </ul>
      {unpaid.length > 3 && (
        <p className="mt-2 text-xs text-amber-700">
          +{unpaid.length - 3} more in the table below
        </p>
      )}
    </div>
  );
}
