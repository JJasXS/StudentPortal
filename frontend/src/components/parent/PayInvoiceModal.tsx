import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Label, Select } from '@/components/ui/Input';
import { paymentsApi } from '@/api/payments';
import { formatInvoiceCourse, formatRm } from '@/utils/invoiceBilling';
import { markInvoicePaid } from '@/utils/mockInvoicePayments';
import { fpxBankLabel } from '@/utils/fpxBanks';
import type { Invoice } from '@/types';

interface PayInvoiceModalProps {
  invoice: Invoice | null;
  payerEmail: string;
  payerName: string;
  open: boolean;
  onClose: () => void;
  onPaid: (invoiceId: string) => void;
}

export function PayInvoiceModal({
  invoice,
  payerEmail,
  payerName,
  open,
  onClose,
  onPaid,
}: PayInvoiceModalProps) {
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [banks, setBanks] = useState<{ code: string; active: boolean }[]>([]);
  const [bankCode, setBankCode] = useState('');
  const [billplzEnabled, setBillplzEnabled] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  useEffect(() => {
    if (!open || isMock) return;

    setLoadingBanks(true);
    setError('');
    paymentsApi
      .getBillplzStatus()
      .then((status) => {
        setBillplzEnabled(status.enabled);
        if (!status.enabled) {
          setError(
            'Billplz is not configured on the server. Add Billplz__ApiKey and Billplz__CollectionId to .env, then restart the backend.'
          );
          return null;
        }
        return paymentsApi.getFpxBanks();
      })
      .then((list) => {
        if (!list) return;
        const active = list.filter((b) => b.active);
        setBanks(active);
        setBankCode(active[0]?.code ?? '');
      })
      .catch(() => setError('Could not load FPX banks. Try again later.'))
      .finally(() => setLoadingBanks(false));
  }, [open, isMock]);

  if (!invoice) return null;

  const handlePay = async () => {
    setPaying(true);
    setError('');
    try {
      if (isMock) {
        await new Promise((r) => setTimeout(r, 600));
        markInvoicePaid(invoice.id);
        onPaid(invoice.id);
        onClose();
        return;
      }

      if (!billplzEnabled) {
        setError('Online payment is not configured.');
        return;
      }
      if (!bankCode) {
        setError('Select your bank.');
        return;
      }

      const session = await paymentsApi.createBillplzPayment(invoice.id, bankCode);
      window.location.href = session.paymentUrl;
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(message ?? 'Payment could not be started. Try again.');
    } finally {
      setPaying(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Pay with FPX" className="max-w-md">
      <div className="space-y-4 text-sm">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">{formatInvoiceCourse(invoice)}</p>
          <p className="text-slate-600">
            {invoice.studentName} · {invoice.invoiceNo}
          </p>
          <p className="mt-2 text-lg font-bold text-slate-900">{formatRm(invoice.amount)}</p>
          <p className="text-slate-500">Due {invoice.dueDate}</p>
        </div>

        {isMock ? (
          <p className="text-slate-600">
            Demo mode — payment will be marked as paid instantly (no Billplz redirect).
          </p>
        ) : (
          <>
            <p className="text-slate-600">
              You will be redirected to your bank via{' '}
              <strong>Billplz</strong> to complete FPX payment securely.
            </p>
            <p className="text-xs text-slate-500">
              Payer: {payerName} ({payerEmail})
            </p>

            {loadingBanks ? (
              <p className="text-slate-500">Loading banks…</p>
            ) : billplzEnabled && banks.length > 0 ? (
              <div>
                <Label htmlFor="fpxBank">Your bank</Label>
                <Select
                  id="fpxBank"
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                >
                  {banks.map((b) => (
                    <option key={b.code} value={b.code}>
                      {fpxBankLabel(b.code)}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col-reverse gap-2 border-t sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={paying}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePay}
            disabled={paying || (!isMock && (!billplzEnabled || !bankCode))}
          >
            {paying ? (
              'Starting…'
            ) : isMock ? (
              'Confirm payment'
            ) : (
              <>
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Continue to bank
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
