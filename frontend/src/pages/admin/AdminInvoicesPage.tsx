import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Banknote, Calendar, Download, FileText, Plus, Receipt, Send, X, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { StatCard } from '@/components/StatCard';
import { DataTable } from '@/components/ui/DataTable';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { CreateInvoiceModal, type CreateInvoiceFormValues } from '@/components/admin/CreateInvoiceModal';
import {
  EditInvoiceModal,
  type EditInvoiceFormValues,
} from '@/components/admin/EditInvoiceModal';
import {
  classesApi,
  enrollmentsApi,
  invoicesApi,
  studentsApi,
} from '@/api/resources';
import {
  mockClasses,
  mockEnrollments,
  mockInvoices,
  mockStudents,
} from '@/utils/mockData';
import { INVOICE_STATUSES } from '@/utils/constants';
import { buildInvoiceStatusSummary } from '@/utils/adminDashboardAnalytics';
import { markInvoicePaid, setInvoiceStatus } from '@/utils/mockInvoicePayments';
import { filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { formatAmount, formatInvoiceCourse } from '@/utils/invoiceBilling';
import { loadCentreSettings } from '@/utils/centreSettingsStorage';
import {
  appendInvoices,
  loadAllInvoices,
  updateStoredInvoice,
} from '@/utils/mockInvoiceStore';
import {
  buildInvoice,
  generateMonthlyBilling,
  invoicesForClass,
} from '@/utils/invoiceGeneration';
import { downloadInvoicePdf } from '@/utils/invoicePdf';
import { logAdminAction } from '@/utils/auditLog';
import { AUDIT_ACTIONS } from '@/types/auditLog';
import type { ClassItem, Enrollment, Invoice, StudentProfile } from '@/types';

const STATUS_TABS = ['All', ...INVOICE_STATUSES] as const;

function dueDateKey(value?: string) {
  if (!value) return '';
  return value.slice(0, 10);
}

export default function AdminInvoicesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>(mockStudents);
  const [classes, setClasses] = useState<ClassItem[]>(mockClasses);
  const [enrollments, setEnrollments] = useState<Enrollment[]>(mockEnrollments);
  const [search, setSearch] = useState('');
  const [dueFilter, setDueFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusTab, setStatusTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [billing, setBilling] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(''), 5000);
  };

  const refreshInvoices = useCallback(() => {
    setInvoices(loadAllInvoices());
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      invoicesApi.getAll().catch(() => mockInvoices),
      studentsApi.getAll().catch(() => mockStudents),
      classesApi.getAll().catch(() => mockClasses),
      enrollmentsApi.getAll().catch(() => mockEnrollments),
    ])
      .then(([inv, st, cl, enr]) => {
        if (inv.length >= mockInvoices.length) {
          refreshInvoices();
        } else {
          setInvoices(loadAllInvoices());
        }
        setStudents(st.length ? st : mockStudents);
        setClasses(cl.length ? cl : mockClasses);
        setEnrollments(enr.length ? enr : mockEnrollments);
      })
      .catch(() => {
        setInvoices(loadAllInvoices());
      })
      .finally(() => setLoading(false));
  }, [refreshInvoices]);

  const summary = useMemo(() => buildInvoiceStatusSummary(invoices), [invoices]);

  const filteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (q) {
        const haystack = [inv.invoiceNo, inv.studentName, inv.parentName, inv.status]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (dueFilter && dueDateKey(inv.dueDate) !== dueFilter) return false;
      if (monthFilter && inv.createdAt.slice(0, 7) !== monthFilter) return false;
      if (classFilter && inv.className !== classFilter) return false;
      return true;
    });
  }, [invoices, search, dueFilter, monthFilter, classFilter]);

  const statusCounts = useMemo(() => {
    const perStatus = getStatusCounts(filteredBySearch, (i) => i.status, INVOICE_STATUSES);
    const total = INVOICE_STATUSES.reduce((sum, st) => sum + (perStatus[st] ?? 0), 0);
    return { All: total, ...perStatus };
  }, [filteredBySearch]);

  const filtered = useMemo(
    () => filterByStatus(filteredBySearch, statusTab, (i) => i.status),
    [filteredBySearch, statusTab]
  );

  const hasActiveFilters = Boolean(
    search.trim() || dueFilter || monthFilter || classFilter || statusTab !== 'All'
  );

  const clearFilters = () => {
    setSearch('');
    setDueFilter('');
    setMonthFilter('');
    setClassFilter('');
    setStatusTab('All');
  };

  const handleMarkPaid = async (invoice: Invoice) => {
    setSavingId(invoice.id);
    try {
      if (import.meta.env.VITE_USE_MOCK === 'true') {
        markInvoicePaid(invoice.id);
        setInvoices((list) =>
          list.map((inv) => (inv.id === invoice.id ? { ...inv, status: 'Paid' } : inv))
        );
        logAdminAction(user, {
          action: AUDIT_ACTIONS.invoiceMarkedPaid,
          entityType: 'Invoice',
          entityId: invoice.id,
          entityLabel: invoice.invoiceNo,
        });
      } else {
        const updated = await invoicesApi.updateStatus(invoice.id, 'Paid');
        setInvoices((list) =>
          list.map((inv) => (inv.id === invoice.id ? { ...inv, ...updated } : inv))
        );
      }
    } catch {
      setInvoices((list) =>
        list.map((inv) => (inv.id === invoice.id ? { ...inv, status: 'Paid' } : inv))
      );
    } finally {
      setSavingId(null);
    }
  };

  const handleSendDraft = (invoice: Invoice) => {
    const updated = updateStoredInvoice(invoice.id, { status: 'Unpaid' });
    if (!updated.some((i) => i.id === invoice.id && i.status === 'Unpaid')) {
      setInvoiceStatus(invoice.id, 'Unpaid');
      refreshInvoices();
    } else {
      setInvoices(updated);
    }
    showToast(`${invoice.invoiceNo} sent to parent (demo).`);
    logAdminAction(user, {
      action: AUDIT_ACTIONS.invoiceSent,
      entityType: 'Invoice',
      entityId: invoice.id,
      entityLabel: invoice.invoiceNo,
    });
  };

  const handleCreate = async (values: CreateInvoiceFormValues) => {
    setCreating(true);
    try {
      const existing = loadAllInvoices();
      let created: Invoice[] = [];

      if (values.mode === 'student') {
        const student = students.find((s) => s.userId === values.studentUserId);
        const enrollment = enrollments.find(
          (e) => e.studentUserId === values.studentUserId && e.status === 'Active'
        );
        const cls = enrollment ? classes.find((c) => c.id === enrollment.classId) : undefined;
        created = [
          buildInvoice(
            {
              studentUserId: values.studentUserId,
              studentName: student?.fullName ?? 'Student',
              className: cls?.className ?? enrollment?.className,
              courseName: cls?.courseName,
              amount: values.amount,
              dueDate: values.dueDate,
              sendNow: values.sendNow,
            },
            existing
          ),
        ];
      } else {
        const cls = classes.find((c) => c.id === values.classId);
        if (!cls) throw new Error('Class not found');
        created = invoicesForClass(cls, enrollments, existing, {
          amount: values.amount,
          sendNow: values.sendNow,
        });
      }

      setInvoices(appendInvoices(created));
      setCreateOpen(false);
      showToast(
        `Created ${created.length} invoice${created.length === 1 ? '' : 's'}${
          values.sendNow ? ' and marked as sent' : ' as draft'
        }.`
      );
      for (const inv of created) {
        logAdminAction(user, {
          action: values.sendNow ? AUDIT_ACTIONS.invoiceSent : AUDIT_ACTIONS.invoiceCreated,
          entityType: 'Invoice',
          entityId: inv.id,
          entityLabel: inv.invoiceNo,
          details: formatAmount(inv.amount),
        });
      }
    } finally {
      setCreating(false);
    }
  };

  const handleCancel = (invoice: Invoice) => {
    if (invoice.status === 'Paid') return;
    updateStoredInvoice(invoice.id, { status: 'Cancelled' });
    refreshInvoices();
    showToast(`${invoice.invoiceNo} cancelled.`);
    logAdminAction(user, {
      action: AUDIT_ACTIONS.invoiceCancelled,
      entityType: 'Invoice',
      entityId: invoice.id,
      entityLabel: invoice.invoiceNo,
    });
  };

  const handleEdit = async (invoice: Invoice, values: EditInvoiceFormValues) => {
    setEditing(true);
    try {
      const patch = {
        amount: values.amount,
        dueDate: values.dueDate,
      };
      if (import.meta.env.VITE_USE_MOCK !== 'true') {
        try {
          await invoicesApi.update(invoice.id, patch);
        } catch {
          /* fall through to local store */
        }
      }
      setInvoices(updateStoredInvoice(invoice.id, patch));
      setEditInvoice(null);
      showToast(`${invoice.invoiceNo} updated.`);
      logAdminAction(user, {
        action: AUDIT_ACTIONS.invoiceUpdated,
        entityType: 'Invoice',
        entityId: invoice.id,
        entityLabel: invoice.invoiceNo,
        details: formatAmount(values.amount),
      });
    } finally {
      setEditing(false);
    }
  };

  const classNameOptions = useMemo(() => {
    const names = new Set(invoices.map((i) => i.className).filter(Boolean) as string[]);
    return [...names].sort();
  }, [invoices]);

  const handleMonthlyBilling = async () => {
    setBilling(true);
    try {
      const existing = loadAllInvoices();
      const { created, skipped } = generateMonthlyBilling(enrollments, classes, existing);
      if (!created.length) {
        showToast(
          skipped > 0
            ? `No new invoices — ${skipped} enrollment(s) already billed this month.`
            : 'No active enrollments to bill.'
        );
        return;
      }
      setInvoices(appendInvoices(created));
      const fee = loadCentreSettings().defaultMonthlyFee;
      showToast(
        `Monthly billing: ${created.length} invoice(s) at ${fee.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} each${
          skipped ? ` (${skipped} skipped — already billed)` : ''
        }.`
      );
      logAdminAction(user, {
        action: AUDIT_ACTIONS.invoiceMonthlyBilling,
        entityType: 'Invoice',
        entityLabel: 'Monthly billing',
        details: `${created.length} created, ${skipped} skipped`,
      });
    } finally {
      setBilling(false);
    }
  };

  const activeCount = invoices.filter((i) => i.status !== 'Cancelled').length;

  return (
    <div>
      <PageHeader
        title="Invoices"
        description="Create, send, and track tuition billing"
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create invoice
            </Button>
            <Button type="button" onClick={handleMonthlyBilling} disabled={billing}>
              <Zap className="mr-1.5 h-4 w-4" />
              {billing ? 'Billing…' : 'Run monthly billing'}
            </Button>
          </>
        }
      />

      {toast && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {toast}
        </div>
      )}

      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
        Create invoices per child or whole class. <strong>Run monthly billing</strong> uses active
        enrollments and the default fee from Settings. The download button saves an invoice PDF to
        your device (demo layout).
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Collected"
          value={formatAmount(summary.collectedAmount)}
          icon={Banknote}
          description={`${summary.paid} paid`}
        />
        <StatCard
          title="Outstanding"
          value={formatAmount(summary.outstandingAmount)}
          icon={AlertCircle}
          description={`${summary.unpaid + summary.draft} pending`}
        />
        <StatCard
          title="Total billed"
          value={formatAmount(summary.totalAmount)}
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
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="pl-9"
                aria-label="Filter by issued month"
                title="Issued month"
              />
            </div>
            <div className="shrink-0 sm:w-48">
              <Select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                aria-label="Filter by class"
              >
                <option value="">All classes</option>
                {classNameOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
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
                key: 'course',
                header: 'Course',
                sortable: true,
                sortType: 'text',
                getSortValue: (i) => formatInvoiceCourse(i),
                className: 'max-w-xs whitespace-normal',
                render: (i) => formatInvoiceCourse(i),
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
                    {formatAmount(i.amount)}
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
              {
                key: 'actions',
                header: '',
                className: 'text-right whitespace-nowrap',
                render: (i) => (
                  <div className="flex flex-wrap justify-end gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => downloadInvoicePdf(i)}
                      title="Download PDF"
                    >
                      <Download className="mr-1 h-3.5 w-3.5" />
                      PDF
                    </Button>
                    {i.status === 'Draft' && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditInvoice(i)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => handleSendDraft(i)}
                        >
                          <Send className="mr-1 h-3.5 w-3.5" />
                          Send
                        </Button>
                      </>
                    )}
                    {i.status === 'Unpaid' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={savingId === i.id}
                        onClick={() => handleMarkPaid(i)}
                      >
                        {savingId === i.id ? 'Saving…' : 'Mark paid'}
                      </Button>
                    )}
                    {(i.status === 'Draft' || i.status === 'Unpaid') && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleCancel(i)}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </CardContent>
      </Card>

      <CreateInvoiceModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        students={students}
        classes={classes}
        enrollments={enrollments}
        saving={creating}
        onSubmit={handleCreate}
      />

      <EditInvoiceModal
        open={Boolean(editInvoice)}
        invoice={editInvoice}
        onClose={() => setEditInvoice(null)}
        saving={editing}
        onSubmit={handleEdit}
      />
    </div>
  );
}
