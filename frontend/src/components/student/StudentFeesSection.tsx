import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { studentsApi } from '@/api/resources';
import { formatRm } from '@/utils/invoiceBilling';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import type { SqlAccountOutstandingInvoice } from '@/types/sqlAccount';

type FeesTab = 'due' | 'history';

function DueList({ invoices }: { invoices: SqlAccountOutstandingInvoice[] }) {
  if (invoices.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500">No fees due.</p>
    );
  }

  const total = invoices.reduce((sum, invoice) => sum + invoice.outstanding, 0);

  return (
    <div className="space-y-3 p-4">
      <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50/80 px-3 py-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-900">
            Payment reminder — {invoices.length} fee{invoices.length === 1 ? '' : 's'} due ·{' '}
            {formatRm(total)}
          </p>
          <p className="mt-0.5 text-xs text-amber-800">
            Music class fees waiting to be paid. Pay at the centre or via your usual method.
          </p>
        </div>
      </div>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {invoices.map((invoice) => (
          <li
            key={invoice.docKey}
            className="flex flex-wrap items-baseline justify-between gap-2 px-3 py-2.5 text-sm"
          >
            <span className="min-w-0 text-slate-800">
              <span className="font-medium">{invoice.docNo}</span>
              {invoice.dueDate ? (
                <span className="ml-2 text-slate-500">due {formatDateDDMMYYYY(invoice.dueDate)}</span>
              ) : null}
              {invoice.description ? (
                <span className="mt-0.5 block text-xs text-slate-500">{invoice.description}</span>
              ) : null}
            </span>
            <span className="tabular-nums font-medium text-amber-900">
              {formatRm(invoice.outstanding)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function HistoryList({ invoices }: { invoices: SqlAccountOutstandingInvoice[] }) {
  if (invoices.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500">No payment history yet.</p>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 p-2">
      {invoices.map((invoice) => (
        <li
          key={invoice.docKey}
          className="flex flex-wrap items-start justify-between gap-2 rounded-lg px-2 py-2.5 text-sm"
        >
          <span className="min-w-0 text-slate-800">
            <span className="inline-flex flex-wrap items-center gap-2">
              <span className="font-medium">{invoice.docNo}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
                Paid
              </span>
            </span>
            {invoice.docDate ? (
              <span className="mt-0.5 block text-xs text-slate-500">
                {formatDateDDMMYYYY(invoice.docDate)}
              </span>
            ) : null}
            {invoice.description ? (
              <span className="mt-0.5 block text-xs text-slate-500">{invoice.description}</span>
            ) : null}
          </span>
          <span className="tabular-nums font-medium text-slate-800">
            {formatRm(invoice.paymentAmt || invoice.docAmt)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function StudentFeesSection() {
  const [due, setDue] = useState<SqlAccountOutstandingInvoice[]>([]);
  const [history, setHistory] = useState<SqlAccountOutstandingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FeesTab>('due');

  useEffect(() => {
    setLoading(true);
    studentsApi
      .getMyInvoices()
      .then((data) => {
        setDue(data.due ?? []);
        setHistory(data.history ?? []);
        setTab((data.due?.length ?? 0) > 0 ? 'due' : 'history');
      })
      .catch(() => {
        setDue([]);
        setHistory([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const trailing = useMemo(() => {
    if (tab === 'due') {
      const total = due.reduce((sum, i) => sum + i.outstanding, 0);
      return due.length > 0 ? formatRm(total) : null;
    }
    return history.length > 0 ? `${history.length} paid` : null;
  }, [tab, due, history]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-slate-500">Loading fees…</CardContent>
      </Card>
    );
  }

  if (due.length === 0 && history.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <SlidingTabs
        tabs={['due', 'history'] as const}
        value={tab}
        onChange={(v) => setTab(v as FeesTab)}
        labels={{ due: 'Due', history: 'History' }}
        counts={{ due: due.length, history: history.length }}
        trailing={trailing}
      />
      <CardContent className="p-0">
        {tab === 'due' ? <DueList invoices={due} /> : <HistoryList invoices={history} />}
      </CardContent>
    </Card>
  );
}
