import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { ParentPaymentDetailsForm } from '@/components/parent/ParentPaymentDetailsForm';
import { PayInvoiceModal } from '@/components/parent/PayInvoiceModal';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { invoicesApi } from '@/api/resources';
import { mockInvoices } from '@/utils/mockData';
import { INVOICE_STATUSES } from '@/utils/constants';
import { filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import { applyInvoiceStatusOverrides } from '@/utils/mockInvoicePayments';
import { loadParentPaymentDetails } from '@/utils/parentPaymentDetails';
import type { Invoice } from '@/types';
import type { ParentPaymentDetails } from '@/types/parentPayment';

const STATUS_TABS = ['All', ...INVOICE_STATUSES] as const;

function formatDueDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ParentInvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statusTab, setStatusTab] = useState('All');
  const [paymentDetails, setPaymentDetails] = useState<ParentPaymentDetails | null>(null);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);

  const loadInvoices = useCallback(() => {
    if (!user?.id) return;
    invoicesApi
      .getAll()
      .then((data) => {
        const mine = data.filter((i) => i.parentUserId === user.id);
        setInvoices(applyInvoiceStatusOverrides(mine));
      })
      .catch(() => {
        const mine = mockInvoices.filter((i) => i.parentUserId === user.id);
        setInvoices(applyInvoiceStatusOverrides(mine));
      });
  }, [user?.id]);

  useEffect(() => {
    loadInvoices();
    if (user?.id) {
      setPaymentDetails(loadParentPaymentDetails(user.id));
    }
  }, [loadInvoices, user?.id]);

  const statusCounts = useMemo(() => {
    const perStatus = getStatusCounts(invoices, (i) => i.status, INVOICE_STATUSES);
    const total = INVOICE_STATUSES.reduce((sum, st) => sum + (perStatus[st] ?? 0), 0);
    return { All: total, ...perStatus };
  }, [invoices]);

  const filtered = useMemo(
    () => filterByStatus(invoices, statusTab, (i) => i.status),
    [invoices, statusTab]
  );

  const handlePaid = (invoiceId: string) => {
    setInvoices((list) =>
      list.map((inv) => (inv.id === invoiceId ? { ...inv, status: 'Paid' as const } : inv))
    );
  };

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Manage payment details and pay tuition invoices for your children"
      />

      <div className="mb-6">
        {user?.id && (
          <ParentPaymentDetailsForm
            parentUserId={user.id}
            onSaved={(details) => setPaymentDetails(details)}
          />
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <SlidingTabs
            tabs={STATUS_TABS}
            value={statusTab}
            onChange={setStatusTab}
            counts={statusCounts}
            trailing={`${filtered.length} invoice${filtered.length === 1 ? '' : 's'}`}
          />

          <DataTable
            embedded
            data={filtered}
            emptyMessage={
              statusTab === 'All'
                ? 'No invoices yet.'
                : `No ${statusTab.toLowerCase()} invoices.`
            }
            columns={[
              { key: 'invoiceNo', header: 'Invoice' },
              { key: 'studentName', header: 'Child' },
              {
                key: 'amount',
                header: 'Amount',
                render: (i) => `RM ${i.amount.toFixed(2)}`,
              },
              {
                key: 'dueDate',
                header: 'Due',
                render: (i) => formatDueDate(i.dueDate),
              },
              {
                key: 'status',
                header: 'Status',
                render: (i) => <StatusBadge status={i.status} />,
              },
              {
                key: 'actions',
                header: '',
                className: 'text-right',
                render: (i) =>
                  i.status === 'Unpaid' ? (
                    <Button
                      type="button"
                      size="sm"
                      disabled={!paymentDetails}
                      title={paymentDetails ? undefined : 'Save payment details first'}
                      onClick={() => setPayInvoice(i)}
                    >
                      Payment
                    </Button>
                  ) : (
                    <span className="text-slate-400">—</span>
                  ),
              },
            ]}
          />
        </CardContent>
      </Card>

      <PayInvoiceModal
        invoice={payInvoice}
        paymentDetails={paymentDetails}
        open={Boolean(payInvoice)}
        onClose={() => setPayInvoice(null)}
        onPaid={handlePaid}
      />
    </div>
  );
}
