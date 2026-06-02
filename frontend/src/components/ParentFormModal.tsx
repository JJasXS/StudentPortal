import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { parentToForm, type ParentFormValues } from '@/utils/parentForm';
import type { ParentProfile } from '@/types';

interface ParentFormModalProps {
  open: boolean;
  onClose: () => void;
  parent: ParentProfile | null;
  onSubmit: (values: ParentFormValues) => Promise<void>;
  saving?: boolean;
}

export function ParentFormModal({
  open,
  onClose,
  parent,
  onSubmit,
  saving = false,
}: ParentFormModalProps) {
  const [form, setForm] = useState<ParentFormValues>({
    fullName: '',
    email: '',
    phoneNumber: '',
    relationship: '',
    address: '',
    password: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && parent) {
      setForm(parentToForm(parent));
      setError('');
    }
  }, [open, parent]);

  const set = <K extends keyof ParentFormValues>(key: K, value: ParentFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setError('Name is required.');
      return;
    }
    if (!form.email.trim()) {
      setError('Email is required.');
      return;
    }
    setError('');
    await onSubmit(form);
  };

  if (!parent) return null;

  return (
    <Modal open={open} onClose={onClose} title="Edit parent" className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="parentName">Full name</Label>
          <Input
            id="parentName"
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="parentEmail">Email</Label>
          <Input
            id="parentEmail"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="parentPhone">Phone</Label>
            <Input
              id="parentPhone"
              value={form.phoneNumber}
              onChange={(e) => set('phoneNumber', e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div>
            <Label htmlFor="parentRelationship">Relationship</Label>
            <Input
              id="parentRelationship"
              value={form.relationship}
              onChange={(e) => set('relationship', e.target.value)}
              placeholder="e.g. Father"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="parentAddress">Address</Label>
          <Textarea
            id="parentAddress"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            rows={2}
            placeholder="Optional"
          />
        </div>

        <div>
          <Label htmlFor="parentPassword">New password</Label>
          <Input
            id="parentPassword"
            type="password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder="Leave blank to keep current"
            autoComplete="new-password"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
