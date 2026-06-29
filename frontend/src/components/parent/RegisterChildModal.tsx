import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { GENDER_OPTIONS } from '@/utils/gender';
import type { RegisterChildFormData } from '@/types/childRegistration';

const emptyForm: RegisterChildFormData = {
  fullName: '',
  dateOfBirth: '',
  gender: 'Male',
  schoolName: '',
  instrument: '',
};

interface RegisterChildModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RegisterChildFormData) => void;
}

export function RegisterChildModal({ open, onClose, onSubmit }: RegisterChildModalProps) {
  const [form, setForm] = useState(emptyForm);

  const handleClose = () => {
    setForm(emptyForm);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.dateOfBirth || !form.gender) return;
    onSubmit(form);
    setForm(emptyForm);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Register a child" className="max-w-lg">
      <p className="mb-4 text-sm text-slate-600">
        Submit your child&apos;s details. The centre will create their student profile and link it to
        your account.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="childName">Full name</Label>
          <Input
            id="childName"
            value={form.fullName}
            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
            placeholder="Child's full name"
            className="mt-1"
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="childDob">Date of birth</Label>
            <Input
              id="childDob"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="childGender">Gender</Label>
            <Select
              id="childGender"
              value={form.gender}
              onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
              className="mt-1"
              required
            >
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="childSchool">School (optional)</Label>
          <Input
            id="childSchool"
            value={form.schoolName}
            onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
            placeholder="School name"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="childInstrument">Instrument / programme (optional)</Label>
          <Input
            id="childInstrument"
            value={form.instrument}
            onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))}
            placeholder="e.g. Piano, Violin"
            className="mt-1"
          />
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit">Submit registration</Button>
        </div>
      </form>
    </Modal>
  );
}
