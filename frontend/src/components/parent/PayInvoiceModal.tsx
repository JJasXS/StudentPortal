import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { maskCardDisplay } from '@/utils/parentPaymentDetails';
import { markInvoicePaid } from '@/utils/mockInvoicePayments';
import type { Invoice } from '@/types';
import type { ParentPaymentDetails } from '@/types/parentPayment';

interface PayInvoiceModalProps {
  invoice: Invoice | null;
  paymentDetails: ParentPaymentDetails | null;
  open: boolean;
  onClose: () => void;
  onPaid: (invoiceId: string) => void;
}

export function PayInvoiceModal({
  invoice,
  paymentDetails,
  open,
  onClose,
  onPaid,
}: PayInvoiceModalProps) {
  const [paying, setPaying] = useState(false);

  if (!invoice) return null;

  const handlePay = async () => {
    if (!paymentDetails) return;
    setPaying(true);
    await new Promise((r) => setTimeout(r, 600));
    markInvoicePaid(invoice.id);
    setPaying(false);
    onPaid(invoice.id);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Pay invoice" className="max-w-md">
      <div className="space-y-4 text-sm">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">{invoice.invoiceNo}</p>
          <p className="text-slate-600">{invoice.studentName}</p>
          <p className="mt-2 text-lg font-bold text-slate-900">RM {invoice.amount.toFixed(2)}</p>
          <p className="text-slate-500">Due {invoice.dueDate}</p>
        </div>
        {paymentDetails ? (
          <p className="text-slate-600">
            Charging {maskCardDisplay(paymentDetails.cardLast4)} · {paymentDetails.cardholderName}
          </p>
        ) : (
          <p className="text-amber-600">Save payment details before paying.</p>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={paying}>
            Cancel
          </Button>
          <Button type="button" onClick={handlePay} disabled={!paymentDetails || paying}>
            {paying ? 'Processing…' : 'Confirm payment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
