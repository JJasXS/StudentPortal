import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import type { Invoice } from '@/types';

export interface EditInvoiceFormValues {
  amount: number;
  dueDate: string;
}

interface EditInvoiceModalProps {
  open: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  saving?: boolean;
  onSubmit: (invoice: Invoice, values: EditInvoiceFormValues) => Promise<void>;
}

export function EditInvoiceModal({
  open,
  invoice,
  onClose,
  saving,
  onSubmit,
}: EditInvoiceModalProps) {
  const [amount, setAmount] = useState(0);
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && invoice) {
      setAmount(invoice.amount);
      setDueDate(invoice.dueDate.slice(0, 10));
      setError('');
    }
  }, [open, invoice]);

  if (!invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    if (!dueDate) {
      setError('Due date is required.');
      return;
    }
    setError('');
    await onSubmit(invoice, { amount, dueDate });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Edit ${invoice.invoiceNo}`} className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-600">
          Draft invoices can be edited before sending to the parent.
        </p>
        <div>
          <Label htmlFor="edit-amount">Amount</Label>
          <Input
            id="edit-amount"
            type="number"
            min={1}
            step={0.01}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>
        <div>
          <Label htmlFor="edit-due">Due date</Label>
          <Input
            id="edit-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
