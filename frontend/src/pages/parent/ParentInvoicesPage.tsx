import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Download } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { ParentPaymentDetailsForm } from '@/components/parent/ParentPaymentDetailsForm';
import { ParentBillingSummary } from '@/components/parent/ParentBillingSummary';
import { PayInvoiceModal } from '@/components/parent/PayInvoiceModal';
import { formatInvoiceCourse, formatRm } from '@/utils/invoiceBilling';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { invoicesApi, settingsApi } from '@/api/resources';
import { mockInvoices } from '@/utils/mockData';
import { filterByStatus } from '@/utils/statusFilter';
import { applyInvoicePatches } from '@/utils/mockInvoicePayments';
import { loadParentPaymentDetails } from '@/utils/parentPaymentDetails';
import { loadCentreSettings } from '@/utils/centreSettingsStorage';
import { DEFAULT_CENTRE_SETTINGS } from '@/types/centreSettings';
import { downloadInvoicePdf, downloadPaymentReceiptPdf } from '@/utils/invoicePdf';
import type { Invoice } from '@/types';
import type { ParentPaymentDetails } from '@/types/parentPayment';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';

const FEE_TABS = ['Unpaid', 'Paid'] as const;

export default function ParentInvoicesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [onPaymentTab, setOnPaymentTab] = useState(false);
  const [paymentBanner, setPaymentBanner] = useState<'success' | 'failed' | null>(null);
  const [feeTab, setFeeTab] = useState<(typeof FEE_TABS)[number]>('Unpaid');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [paymentDetails, setPaymentDetails] = useState<ParentPaymentDetails | null>(null);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [receiptOffer, setReceiptOffer] = useState<Invoice | null>(null);
  const [paymentNote, setPaymentNote] = useState(
    DEFAULT_CENTRE_SETTINGS.paymentInstructions ?? ''
  );

  const loadInvoices = useCallback(() => {
    if (!user?.id) return;
    invoicesApi
      .getAll()
      .then((data) => {
        const mine = data.filter((i) => i.parentUserId === user.id);
        setInvoices(applyInvoicePatches(mine));
      })
      .catch(() => {
        const mine = mockInvoices.filter((i) => i.parentUserId === user.id);
        setInvoices(applyInvoicePatches(mine));
      });
  }, [user?.id]);

  useEffect(() => {
    loadInvoices();
    if (user?.id) {
      setPaymentDetails(loadParentPaymentDetails(user.id));
    }
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      setPaymentNote(loadCentreSettings().paymentInstructions ?? '');
    } else {
      settingsApi
        .getCentre()
        .then((s) => setPaymentNote(s.paymentInstructions ?? ''))
        .catch(() => setPaymentNote(loadCentreSettings().paymentInstructions ?? ''));
    }
  }, [loadInvoices, user?.id]);

  useEffect(() => {
    const result = searchParams.get('payment');
    if (!result) return;

    if (result === 'success') {
      setPaymentBanner('success');
      loadInvoices();
    } else if (result === 'failed') {
      setPaymentBanner('failed');
    }

    const next = new URLSearchParams(searchParams);
    next.delete('payment');
    next.delete('billId');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, loadInvoices]);

  const feeCounts = useMemo(() => {
    const unpaid = invoices.filter((i) => i.status === 'Unpaid').length;
    const paid = invoices.filter((i) => i.status === 'Paid').length;
    return { Unpaid: unpaid, Paid: paid };
  }, [invoices]);

  const filteredFees = useMemo(
    () => filterByStatus(invoices, feeTab, (i) => i.status),
    [invoices, feeTab]
  );

  const handlePaid = (invoiceId: string) => {
    const paidAt = new Date().toISOString();
    setInvoices((list) =>
      list.map((inv) =>
        inv.id === invoiceId ? { ...inv, status: 'Paid' as const, paidAt } : inv
      )
    );
    const paid = invoices.find((i) => i.id === invoiceId);
    if (paid) {
      setReceiptOffer({ ...paid, status: 'Paid', paidAt });
    }
  };

  const invoiceColumns = [
    { key: 'invoiceNo', header: 'Invoice' },
    { key: 'studentName', header: 'Child' },
    {
      key: 'course',
      header: 'Course',
      className: 'max-w-xs whitespace-normal',
      render: (i: Invoice) => (
        <span className="text-slate-700">{formatInvoiceCourse(i)}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (i: Invoice) => (
        <span className="font-semibold tabular-nums">{formatRm(i.amount)}</span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due',
      render: (i: Invoice) => formatDateDDMMYYYY(i.dueDate),
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right whitespace-nowrap',
      render: (i: Invoice) => (
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => downloadInvoicePdf(i)}
          >
            <Download className="mr-1 h-3.5 w-3.5" />
            Invoice
          </Button>
          {i.status === 'Unpaid' ? (
            <Button type="button" size="sm" onClick={() => setPayInvoice(i)}>
              Pay
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => downloadPaymentReceiptPdf(i)}
            >
              Receipt
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Billing"
        description={
          onPaymentTab
            ? 'Optional billing contact for receipts'
            : 'Course fees — pay via FPX or download invoices and receipts'
        }
      />

      {paymentBanner === 'success' && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Payment submitted successfully. Your invoice will show as paid once the bank confirms.
          <button
            type="button"
            className="ml-2 font-medium underline"
            onClick={() => setPaymentBanner(null)}
          >
            Dismiss
          </button>
        </div>
      )}
      {paymentBanner === 'failed' && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Payment was not completed. You can try again from the unpaid list.
          <button
            type="button"
            className="ml-2 font-medium underline"
            onClick={() => setPaymentBanner(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {receiptOffer && (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Payment received for <strong>{receiptOffer.invoiceNo}</strong>.
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => downloadPaymentReceiptPdf(receiptOffer)}
            >
              Download receipt
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setReceiptOffer(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      <Card>
        <div className="flex justify-end border-b border-slate-200 bg-white">
          <button
            type="button"
            role="tab"
            aria-selected={onPaymentTab}
            onClick={() => setOnPaymentTab(true)}
            className={
              onPaymentTab
                ? 'border-b-2 border-primary-600 px-4 py-3 text-sm font-medium text-primary-600'
                : 'border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-500 hover:text-slate-700'
            }
          >
            Billing contact
          </button>
        </div>

        {onPaymentTab ? (
          <>
            {user?.id && (
              <ParentPaymentDetailsForm
                embedded
                parentUserId={user.id}
                title="Billing contact (optional)"
                onSaved={(details) => setPaymentDetails(details)}
              />
            )}
            <div className="border-t border-slate-200 px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setOnPaymentTab(false)}
                className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
              >
                ← Back to billing
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-4 border-b border-slate-200 p-4 sm:p-6">
              <ParentBillingSummary invoices={invoices} onPay={setPayInvoice} />
              {paymentNote && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
                  {paymentNote}
                </div>
              )}
              <p className="text-sm text-slate-600">
                Online payments use{' '}
                <strong>Billplz FPX</strong> — you will be redirected to your bank.{' '}
                <button
                  type="button"
                  onClick={() => setOnPaymentTab(true)}
                  className="font-medium text-primary-600 hover:underline"
                >
                  Billing contact
                </button>{' '}
                is optional for receipts.
              </p>
            </div>

            <SlidingTabs
              tabs={FEE_TABS}
              value={feeTab}
              onChange={(tab) => setFeeTab(tab as (typeof FEE_TABS)[number])}
              counts={feeCounts}
              trailing={`${filteredFees.length} record${filteredFees.length === 1 ? '' : 's'}`}
            />

            <DataTable
              embedded
              data={filteredFees}
              emptyMessage={
                feeTab === 'Unpaid'
                  ? 'No unpaid course fees.'
                  : 'No paid invoices yet.'
              }
              columns={invoiceColumns}
            />
          </>
        )}
      </Card>

      <PayInvoiceModal
        invoice={payInvoice}
        payerEmail={paymentDetails?.billingEmail ?? user?.email ?? ''}
        payerName={paymentDetails?.cardholderName ?? user?.fullName ?? 'Parent'}
        open={Boolean(payInvoice)}
        onClose={() => setPayInvoice(null)}
        onPaid={handlePaid}
      />
    </div>
  );
}
