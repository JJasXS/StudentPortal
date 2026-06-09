import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { loadCentreSettings } from '@/utils/centreSettingsStorage';
import type { ClassItem, Enrollment, StudentProfile } from '@/types';

export type InvoiceCreateMode = 'student' | 'class';

export interface CreateInvoiceFormValues {
  mode: InvoiceCreateMode;
  studentUserId: string;
  classId: string;
  amount: number;
  dueDate: string;
  sendNow: boolean;
}

interface CreateInvoiceModalProps {
  open: boolean;
  onClose: () => void;
  students: StudentProfile[];
  classes: ClassItem[];
  enrollments: Enrollment[];
  saving?: boolean;
  onSubmit: (values: CreateInvoiceFormValues) => Promise<void>;
}

function defaultDueDate() {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export function CreateInvoiceModal({
  open,
  onClose,
  students,
  classes,
  enrollments,
  saving,
  onSubmit,
}: CreateInvoiceModalProps) {
  const settings = loadCentreSettings();
  const [mode, setMode] = useState<InvoiceCreateMode>('student');
  const [studentUserId, setStudentUserId] = useState('');
  const [classId, setClassId] = useState('');
  const [amount, setAmount] = useState(settings.defaultMonthlyFee);
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [sendNow, setSendNow] = useState(true);
  const [error, setError] = useState('');

  const activeStudents = useMemo(
    () => students.filter((s) => s.isActive !== false).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [students]
  );

  const activeClasses = useMemo(
    () => classes.filter((c) => c.isActive !== false).sort((a, b) => a.className.localeCompare(b.className)),
    [classes]
  );

  const classEnrollmentCount = useMemo(() => {
    if (!classId) return 0;
    return enrollments.filter((e) => e.classId === classId && e.status === 'Active').length;
  }, [classId, enrollments]);

  useEffect(() => {
    if (open) {
      setMode('student');
      setStudentUserId(activeStudents[0]?.userId ?? '');
      setClassId(activeClasses[0]?.id ?? '');
      setAmount(loadCentreSettings().defaultMonthlyFee);
      setDueDate(defaultDueDate());
      setSendNow(true);
      setError('');
    }
  }, [open, activeStudents, activeClasses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'student' && !studentUserId) {
      setError('Select a student.');
      return;
    }
    if (mode === 'class' && !classId) {
      setError('Select a class.');
      return;
    }
    if (mode === 'class' && classEnrollmentCount === 0) {
      setError('No active enrollments in this class.');
      return;
    }
    if (amount <= 0) {
      setError('Amount must be greater than zero.');
      return;
    }
    setError('');
    await onSubmit({ mode, studentUserId, classId, amount, dueDate, sendNow });
  };

  return (
    <Modal open={open} onClose={onClose} title="Create invoice" className="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-2 rounded-lg bg-slate-100 p-1">
          {(['student', 'class'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {m === 'student' ? 'Per child' : 'Per class'}
            </button>
          ))}
        </div>

        {mode === 'student' ? (
          <div>
            <Label htmlFor="inv-student">Student</Label>
            <Select
              id="inv-student"
              value={studentUserId}
              onChange={(e) => setStudentUserId(e.target.value)}
            >
              <option value="">Select student…</option>
              {activeStudents.map((s) => (
                <option key={s.userId} value={s.userId}>
                  {s.fullName}
                </option>
              ))}
            </Select>
          </div>
        ) : (
          <div>
            <Label htmlFor="inv-class">Class</Label>
            <Select id="inv-class" value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">Select class…</option>
              {activeClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.className} ({c.courseName})
                </option>
              ))}
            </Select>
            {classId && (
              <p className="mt-1 text-xs text-slate-500">
                {classEnrollmentCount} active enrollment{classEnrollmentCount === 1 ? '' : 's'} — one
                invoice each
              </p>
            )}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="inv-amount">Amount</Label>
            <Input
              id="inv-amount"
              type="number"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <p className="mt-1 text-xs text-slate-500">
              Default from Settings: {settings.defaultMonthlyFee}
            </p>
          </div>
          <div>
            <Label htmlFor="inv-due">Due date</Label>
            <Input
              id="inv-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={sendNow}
            onChange={(e) => setSendNow(e.target.checked)}
            className="rounded border-slate-300"
          />
          Send to parent immediately (Unpaid). Uncheck to save as Draft.
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Creating…' : mode === 'class' ? `Create ${classEnrollmentCount || ''} invoices` : 'Create invoice'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
