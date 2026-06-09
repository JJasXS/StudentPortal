import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import {
  cardLast4FromNumber,
  isValidCvv,
  loadParentPaymentDetails,
  maskCardDisplay,
  saveParentPaymentDetails,
} from '@/utils/parentPaymentDetails';
import type { ParentPaymentDetails } from '@/types/parentPayment';

interface ParentPaymentDetailsFormProps {
  parentUserId: string;
  onSaved?: (details: ParentPaymentDetails) => void;
  /** Render inside a parent card tab (no nested Card wrapper). */
  embedded?: boolean;
  title?: string;
}

const emptyForm = {
  cardholderName: '',
  cardNumber: '',
  expiry: '',
  cvv: '',
  billingEmail: '',
};

export function ParentPaymentDetailsForm({
  parentUserId,
  onSaved,
  embedded = false,
  title = 'Payment details',
}: ParentPaymentDetailsFormProps) {
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState<ParentPaymentDetails | null>(null);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const existing = loadParentPaymentDetails(parentUserId);
    setSaved(existing);
    if (existing) {
      setForm({
        cardholderName: existing.cardholderName,
        cardNumber: '',
        expiry: existing.expiry,
        cvv: '',
        billingEmail: existing.billingEmail,
      });
      setEditing(embedded);
    } else {
      setEditing(true);
    }
  }, [parentUserId, embedded]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const last4 = form.cardNumber ? cardLast4FromNumber(form.cardNumber) : saved?.cardLast4 ?? '';
    if (!form.cardholderName.trim() || !form.expiry.trim() || !form.billingEmail.trim()) {
      setMessage('Fill in all fields.');
      return;
    }
    if (!last4 || last4.length < 4) {
      setMessage('Enter a valid card number.');
      return;
    }
    if (!isValidCvv(form.cvv)) {
      setMessage('Enter a valid CVV (3 or 4 digits).');
      return;
    }

    const details: ParentPaymentDetails = {
      cardholderName: form.cardholderName.trim(),
      cardLast4: last4,
      expiry: form.expiry.trim(),
      billingEmail: form.billingEmail.trim(),
    };
    saveParentPaymentDetails(parentUserId, details);
    setSaved(details);
    setForm((f) => ({ ...f, cardNumber: '', cvv: '' }));
    setEditing(false);
    setMessage('Payment details saved.');
    onSaved?.(details);
  };

  const body = (
    <>
        {!embedded && saved && !editing ? (
          <div className="space-y-3">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-500">Cardholder</dt>
                <dd className="font-medium text-slate-900">{saved.cardholderName}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Card</dt>
                <dd className="font-mono font-medium text-slate-900">
                  {maskCardDisplay(saved.cardLast4)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Expiry</dt>
                <dd className="font-medium text-slate-900">{saved.expiry}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Billing email</dt>
                <dd className="font-medium text-slate-900">{saved.billingEmail}</dd>
              </div>
            </dl>
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
              Update details
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            {embedded && saved && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Card on file
                </p>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">Cardholder</dt>
                    <dd className="font-medium text-slate-900">{saved.cardholderName}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Card</dt>
                    <dd className="font-mono font-medium text-slate-900">
                      {maskCardDisplay(saved.cardLast4)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Expiry</dt>
                    <dd className="font-medium text-slate-900">{saved.expiry}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Billing email</dt>
                    <dd className="font-medium text-slate-900">{saved.billingEmail}</dd>
                  </div>
                </dl>
              </div>
            )}
            {embedded && (
              <p className="text-sm font-medium text-slate-900">
                {saved ? 'Update payment info' : 'Add payment info'}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="cardholder">Cardholder name</Label>
                <Input
                  id="cardholder"
                  value={form.cardholderName}
                  onChange={(e) => setForm((f) => ({ ...f, cardholderName: e.target.value }))}
                  placeholder="Name on card"
                  className="mt-1"
                  autoComplete="cc-name"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="cardNumber">Card number</Label>
                <Input
                  id="cardNumber"
                  value={form.cardNumber}
                  onChange={(e) => setForm((f) => ({ ...f, cardNumber: e.target.value }))}
                  placeholder={saved ? 'Enter new number to change' : '4242 4242 4242 4242'}
                  className="mt-1 font-mono"
                  autoComplete="cc-number"
                />
              </div>
              <div>
                <Label htmlFor="expiry">Expiry (MM/YY)</Label>
                <Input
                  id="expiry"
                  value={form.expiry}
                  onChange={(e) => setForm((f) => ({ ...f, expiry: e.target.value }))}
                  placeholder="12/28"
                  className="mt-1"
                  autoComplete="cc-exp"
                />
              </div>
              <div>
                <Label htmlFor="cvv">CVV</Label>
                <Input
                  id="cvv"
                  value={form.cvv}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      cvv: e.target.value.replace(/\D/g, '').slice(0, 4),
                    }))
                  }
                  placeholder="123"
                  className="mt-1 font-mono"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  maxLength={4}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="billingEmail">Billing email</Label>
                <Input
                  id="billingEmail"
                  type="email"
                  value={form.billingEmail}
                  onChange={(e) => setForm((f) => ({ ...f, billingEmail: e.target.value }))}
                  className="mt-1"
                  autoComplete="email"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" size="sm">
                {embedded ? 'Save payment info' : 'Save details'}
              </Button>
              {saved && !embedded && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditing(false);
                    setMessage('');
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
        {message && (
          <p
            className={`mt-3 text-sm ${message.includes('saved') ? 'text-emerald-600' : 'text-amber-600'}`}
          >
            {message}
          </p>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Demo only — card numbers and CVV are not sent to a payment gateway. CVV is never stored; only the last four digits of your card are saved locally.
        </p>
    </>
  );

  if (embedded) {
    return <div className="p-4 sm:p-6">{body}</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-5 w-5 text-primary-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{body}</CardContent>
    </Card>
  );
}
