import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import {
  cardLast4FromNumber,
  loadParentPaymentDetails,
  maskCardDisplay,
  saveParentPaymentDetails,
} from '@/utils/parentPaymentDetails';
import type { ParentPaymentDetails } from '@/types/parentPayment';

interface ParentPaymentDetailsFormProps {
  parentUserId: string;
  onSaved?: (details: ParentPaymentDetails) => void;
}

const emptyForm = {
  cardholderName: '',
  cardNumber: '',
  expiry: '',
  billingEmail: '',
};

export function ParentPaymentDetailsForm({ parentUserId, onSaved }: ParentPaymentDetailsFormProps) {
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
        billingEmail: existing.billingEmail,
      });
      setEditing(false);
    } else {
      setEditing(true);
    }
  }, [parentUserId]);

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

    const details: ParentPaymentDetails = {
      cardholderName: form.cardholderName.trim(),
      cardLast4: last4,
      expiry: form.expiry.trim(),
      billingEmail: form.billingEmail.trim(),
    };
    saveParentPaymentDetails(parentUserId, details);
    setSaved(details);
    setForm((f) => ({ ...f, cardNumber: '' }));
    setEditing(false);
    setMessage('Payment details saved.');
    onSaved?.(details);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-5 w-5 text-primary-600" />
          Payment details
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {saved && !editing ? (
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
                Save details
              </Button>
              {saved && (
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
          Demo only — card numbers are not sent to a payment gateway. Only the last four digits are stored locally.
        </p>
      </CardContent>
    </Card>
  );
}
