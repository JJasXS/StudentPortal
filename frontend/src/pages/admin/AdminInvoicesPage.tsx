import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Banknote, Calendar, FileText, Receipt, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { StatCard } from '@/components/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { invoicesApi } from '@/api/resources';
import { mockInvoices } from '@/utils/mockData';
import { INVOICE_STATUSES } from '@/utils/constants';
import { buildInvoiceStatusSummary } from '@/utils/adminDashboardAnalytics';
import { filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import type { Invoice } from '@/types';

const STATUS_TABS = ['All', ...INVOICE_STATUSES] as const;

function formatRm(amount: number) {
  return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function dueDateKey(value?: string) {
  if (!value) return '';
  return value.slice(0, 10);
}

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState('');
  const [dueFilter, setDueFilter] = useState('');
  const [statusTab, setStatusTab] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    invoicesApi
      .getAll()
      .then((data) => {
        setInvoices(data.length >= mockInvoices.length ? data : mockInvoices);
      })
      .catch(() => setInvoices(mockInvoices))
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => buildInvoiceStatusSummary(invoices), [invoices]);

  const filteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (q) {
        const haystack = [
          inv.invoiceNo,
          inv.studentName,
          inv.parentName,
          inv.status,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (dueFilter && dueDateKey(inv.dueDate) !== dueFilter) return false;
      return true;
    });
  }, [invoices, search, dueFilter]);

  const statusCounts = useMemo(() => {
    const perStatus = getStatusCounts(filteredBySearch, (i) => i.status, INVOICE_STATUSES);
    const total = INVOICE_STATUSES.reduce((sum, st) => sum + (perStatus[st] ?? 0), 0);
    return { All: total, ...perStatus };
  }, [filteredBySearch]);

  const filtered = useMemo(
    () => filterByStatus(filteredBySearch, statusTab, (i) => i.status),
    [filteredBySearch, statusTab]
  );

  const hasActiveFilters = Boolean(search.trim() || dueFilter || statusTab !== 'All');

  const clearFilters = () => {
    setSearch('');
    setDueFilter('');
    setStatusTab('All');
  };

  const activeCount = invoices.filter((i) => i.status !== 'Cancelled').length;

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Track tuition billing, payment status, and outstanding balances"
      />

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
        <span className="font-medium text-slate-800">Reference only</span> — online payment is not
        connected yet. Parents manage payments from their portal when enabled.
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Collected"
          value={formatRm(summary.collectedAmount)}
          icon={Banknote}
          description={`${summary.paid} paid`}
        />
        <StatCard
          title="Outstanding"
          value={formatRm(summary.outstandingAmount)}
          icon={AlertCircle}
          description={`${summary.unpaid + summary.draft} pending`}
        />
        <StatCard
          title="Total billed"
          value={formatRm(summary.totalAmount)}
          icon={Receipt}
          description={`${activeCount} active invoices`}
        />
        <StatCard
          title="Draft"
          value={summary.draft}
          icon={FileText}
          description={summary.cancelled > 0 ? `${summary.cancelled} cancelled` : 'Not yet sent'}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search invoice, student, or parent..."
              className="max-w-none flex-1"
            />
            <div className="relative shrink-0 sm:w-44">
              <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="date"
                value={dueFilter}
                onChange={(e) => setDueFilter(e.target.value)}
                className="pl-9"
                aria-label="Filter by due date"
                title="Due date"
              />
            </div>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="shrink-0 text-slate-600"
              >
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          <SlidingTabs
            tabs={STATUS_TABS}
            value={statusTab}
            onChange={setStatusTab}
            counts={statusCounts}
            trailing={`${filtered.length} of ${invoices.length}`}
          />

          <DataTable
            embedded
            centered
            data={filtered}
            emptyMessage={
              loading
                ? 'Loading invoices…'
                : hasActiveFilters
                  ? 'No invoices match your filters.'
                  : 'No invoices found.'
            }
            columns={[
              {
                key: 'invoiceNo',
                header: 'Invoice',
                sortable: true,
                sortType: 'text',
                getSortValue: (i) => i.invoiceNo,
                render: (i) => (
                  <span className="font-medium text-slate-900">{i.invoiceNo}</span>
                ),
              },
              {
                key: 'studentName',
                header: 'Student',
                sortable: true,
                sortType: 'text',
                getSortValue: (i) => i.studentName ?? '',
                render: (i) => i.studentName || '—',
              },
              {
                key: 'parentName',
                header: 'Parent',
                sortable: true,
                sortType: 'text',
                getSortValue: (i) => i.parentName ?? '',
                render: (i) => i.parentName || '—',
              },
              {
                key: 'amount',
                header: 'Amount',
                sortable: true,
                sortType: 'number',
                getSortValue: (i) => i.amount,
                render: (i) => (
                  <span className="font-semibold tabular-nums text-slate-900">
                    {formatRm(i.amount)}
                  </span>
                ),
              },
              {
                key: 'dueDate',
                header: 'Due',
                sortable: true,
                sortType: 'date',
                getSortValue: (i) => i.dueDate,
                render: (i) => formatDateDDMMYYYY(i.dueDate),
              },
              {
                key: 'createdAt',
                header: 'Issued',
                sortable: true,
                sortType: 'date',
                getSortValue: (i) => i.createdAt,
                render: (i) => formatDateDDMMYYYY(i.createdAt),
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
