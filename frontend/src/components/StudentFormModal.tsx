import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { StepProgress } from '@/components/ui/StepProgress';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { ParentPickerField } from '@/components/ParentPickerField';
import { GENDER_OPTIONS } from '@/utils/gender';
import {
  ADMIN_STUDENT_CREATE_STEPS,
  DEFAULT_STUDENT_PASSWORD,
  emptyStudentForm,
  studentToForm,
  type StudentFormValues,
} from '@/utils/studentForm';
import type { ParentProfile, StudentProfile } from '@/types';

interface StudentFormModalProps {
  open: boolean;
  onClose: () => void;
  student?: StudentProfile | null;
  parents: ParentProfile[];
  mode: 'create' | 'edit';
  onSubmit: (values: StudentFormValues) => Promise<void>;
  saving?: boolean;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value || '—'}</span>
    </div>
  );
}

function validateCreateStep(step: number, form: StudentFormValues): string | null {
  if (step === 1) {
    if (!form.parentUserId) return 'Select a parent — create a parent account first if none are listed.';
    if (!form.fullName.trim()) return 'Full name is required.';
    if (!form.email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email.';
    if (!form.phoneNumber.trim()) return 'Phone number is required.';
  }
  return null;
}

export function StudentFormModal({
  open,
  onClose,
  student,
  parents,
  mode,
  onSubmit,
  saving = false,
}: StudentFormModalProps) {
  const [form, setForm] = useState<StudentFormValues>(emptyStudentForm());
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const isCreate = mode === 'create';

  useEffect(() => {
    if (!open) return;
    if (isCreate) {
      setForm({
        ...emptyStudentForm(),
        parentUserId: parents[0]?.userId ?? '',
      });
      setStep(1);
    } else if (student) {
      setForm(studentToForm(student));
    }
    setError('');
  }, [open, student, isCreate, parents]);

  const set = <K extends keyof StudentFormValues>(key: K, value: StudentFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const selectedParent = parents.find((p) => p.userId === form.parentUserId);

  const goNext = () => {
    const message = validateCreateStep(step, form);
    if (message) {
      setError(message);
      return;
    }
    setError('');
    setStep((s) => Math.min(s + 1, ADMIN_STUDENT_CREATE_STEPS.length));
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleCreateSubmit = async () => {
    const message = validateCreateStep(1, form);
    if (message) {
      setError(message);
      return;
    }
    setError('');
    await onSubmit(form);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
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

  if (!open) return null;

  if (isCreate) {
    return (
      <Modal open={open} onClose={onClose} title="Add student" className="max-w-lg">
        <StepProgress steps={[...ADMIN_STUDENT_CREATE_STEPS]} currentStep={step} className="mb-6" />

        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Enter essential details only. The student completes date of birth, school, and music
              preferences from their profile after sign-in.
            </p>
            {parents.length === 0 ? (
              <div>
                <Label htmlFor="studentParent">Parent account</Label>
                <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  No parents yet. Add a parent on the Parents page before creating a student.
                </p>
              </div>
            ) : (
              <ParentPickerField
                id="studentParent"
                parents={parents}
                value={form.parentUserId}
                onChange={(parentUserId) => set('parentUserId', parentUserId)}
              />
            )}
            <div>
              <Label htmlFor="studentName">Full name</Label>
              <Input
                id="studentName"
                value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                placeholder="Student full name"
                autoComplete="name"
              />
            </div>
            <div>
              <Label htmlFor="studentEmail">Email</Label>
              <Input
                id="studentEmail"
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="studentPhone">Phone</Label>
              <Input
                id="studentPhone"
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => set('phoneNumber', e.target.value)}
                placeholder="+60 12-345 6789"
                autoComplete="tel"
              />
            </div>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              Password is set to{' '}
              <span className="font-medium text-slate-800">{DEFAULT_STUDENT_PASSWORD}</span> by
              default. The student can change it from their profile after signing in.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Check the details, then create the student account.</p>
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2">
              <ReviewRow label="Parent" value={selectedParent?.fullName ?? ''} />
              <ReviewRow label="Parent email" value={selectedParent?.email ?? ''} />
              <ReviewRow label="Name" value={form.fullName} />
              <ReviewRow label="Email" value={form.email} />
              <ReviewRow label="Phone" value={form.phoneNumber} />
              <ReviewRow label="Password" value={`${DEFAULT_STUDENT_PASSWORD} (default)`} />
            </div>
            <p className="text-xs text-slate-500">
              Student code is assigned automatically. Other profile fields are filled in by the
              student under Account details.
            </p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex justify-between gap-2 border-t border-slate-100 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={step === 1 ? onClose : goBack}
            disabled={saving}
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>
          {step < ADMIN_STUDENT_CREATE_STEPS.length ? (
            <Button type="button" onClick={goNext} disabled={parents.length === 0}>
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleCreateSubmit}
              disabled={saving || parents.length === 0}
            >
              {saving ? 'Creating…' : 'Create student'}
            </Button>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit student" className="max-w-lg">
      <form onSubmit={handleEditSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

        <div className="flex flex-col-reverse gap-2 border-t sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto border-slate-100 pt-4">
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
