import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { OutstandingPaymentWhatsAppButton } from '@/components/fees/OutstandingPaymentWhatsAppButton';
import { studentsApi } from '@/api/resources';
import { formatRm } from '@/utils/invoiceBilling';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { feeDisplayLabel } from '@/utils/whatsappPayment';
import type { SqlAccountOutstandingInvoice } from '@/types/sqlAccount';

type FeesTab = 'due' | 'history';

function DueList({ invoices }: { invoices: SqlAccountOutstandingInvoice[] }) {
  if (invoices.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-slate-500">No fees due.</p>
    );
  }

  return (
    <div className="p-2">
      <ul className="divide-y divide-slate-100">
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
      <div className="px-2 pb-2 pt-1">
        <OutstandingPaymentWhatsAppButton invoices={invoices} />
      </div>
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
              <span className="font-medium">{feeDisplayLabel(invoice)}</span>
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
