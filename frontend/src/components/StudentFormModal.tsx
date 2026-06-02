import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { GENDER_OPTIONS } from '@/utils/gender';
import { studentToForm, type StudentFormValues } from '@/utils/studentForm';
import type { StudentProfile } from '@/types';

interface StudentFormModalProps {
  open: boolean;
  onClose: () => void;
  student: StudentProfile | null;
  onSubmit: (values: StudentFormValues) => Promise<void>;
  saving?: boolean;
}

const emptyForm = (): StudentFormValues => ({
  fullName: '',
  email: '',
  studentCode: '',
  dateOfBirth: '',
  gender: '',
  schoolName: '',
  notes: '',
  password: '',
});

export function StudentFormModal({
  open,
  onClose,
  student,
  onSubmit,
  saving = false,
}: StudentFormModalProps) {
  const [form, setForm] = useState<StudentFormValues>(emptyForm());
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && student) {
      setForm(studentToForm(student));
      setError('');
    }
  }, [open, student]);

  const set = <K extends keyof StudentFormValues>(key: K, value: StudentFormValues[K]) => {
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
    if (!form.studentCode.trim()) {
      setError('Student code is required.');
      return;
    }
    if (!form.gender) {
      setError('Gender is required.');
      return;
    }
    setError('');
    await onSubmit(form);
  };

  if (!student) return null;

  return (
    <Modal open={open} onClose={onClose} title="Edit student" className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="studentCode">Code</Label>
            <Input
              id="studentCode"
              value={form.studentCode}
              onChange={(e) => set('studentCode', e.target.value)}
              required
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <Label htmlFor="studentGender">Gender</Label>
            <Select
              id="studentGender"
              value={form.gender}
              onChange={(e) => set('gender', e.target.value)}
              required
            >
              <option value="">Select…</option>
              {GENDER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="studentName">Full name</Label>
          <Input
            id="studentName"
            value={form.fullName}
            onChange={(e) => set('fullName', e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="studentEmail">Email</Label>
          <Input
            id="studentEmail"
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="studentDob">Date of birth</Label>
            <Input
              id="studentDob"
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set('dateOfBirth', e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="studentSchool">School</Label>
            <Input
              id="studentSchool"
              value={form.schoolName}
              onChange={(e) => set('schoolName', e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="studentNotes">Notes</Label>
          <Textarea
            id="studentNotes"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            placeholder="Optional"
          />
        </div>

        <div>
          <Label htmlFor="studentPassword">New password</Label>
          <Input
            id="studentPassword"
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
