import { useEffect, useMemo, useState } from 'react';
import { InvoicePlaceholderPage } from '@/pages/shared/InvoicePlaceholder';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTabs } from '@/components/ui/StatusTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { invoicesApi } from '@/api/resources';
import { mockInvoices } from '@/utils/mockData';
import { INVOICE_STATUSES } from '@/utils/constants';
import { filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import type { Invoice } from '@/types';

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [statusTab, setStatusTab] = useState('All');

  useEffect(() => {
    invoicesApi.getAll().then(setInvoices).catch(() => setInvoices(mockInvoices));
  }, []);

  const statusCounts = useMemo(
    () => getStatusCounts(invoices, (i) => i.status, INVOICE_STATUSES),
    [invoices]
  );

  const filtered = useMemo(
    () => filterByStatus(invoices, statusTab, (i) => i.status),
    [invoices, statusTab]
  );

  return (
    <div>
      <InvoicePlaceholderPage role="admin" />
      <Card className="mt-4">
        <CardContent className="space-y-4 p-4">
          <StatusTabs
            statuses={INVOICE_STATUSES}
            value={statusTab}
            onChange={setStatusTab}
            counts={statusCounts}
          />
          <DataTable
            data={filtered}
            columns={[
              { key: 'invoiceNo', header: 'Invoice No' },
              { key: 'studentName', header: 'Student' },
              { key: 'parentName', header: 'Parent' },
              { key: 'amount', header: 'Amount', render: (i) => `RM ${i.amount.toFixed(2)}` },
              { key: 'dueDate', header: 'Due Date' },
            ]}
            emptyMessage={`No ${statusTab === 'All' ? '' : statusTab.toLowerCase() + ' '}invoices found.`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
