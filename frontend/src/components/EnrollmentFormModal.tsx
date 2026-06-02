import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { ENROLLMENT_STATUSES } from '@/utils/constants';
import type { ClassItem, Enrollment, StudentProfile } from '@/types';

export interface EnrollmentFormValues {
  studentUserId: string;
  classId: string;
  enrollmentDate: string;
  status: Enrollment['status'];
}

interface EnrollmentFormModalProps {
  open: boolean;
  onClose: () => void;
  enrollment?: Enrollment | null;
  students: StudentProfile[];
  classes: ClassItem[];
  enrollments: Enrollment[];
  saving?: boolean;
  onSubmit: (values: EnrollmentFormValues) => Promise<void>;
}

const emptyForm = (): EnrollmentFormValues => ({
  studentUserId: '',
  classId: '',
  enrollmentDate: new Date().toISOString().slice(0, 10),
  status: 'Active',
});

export function EnrollmentFormModal({
  open,
  onClose,
  enrollment,
  students,
  classes,
  enrollments,
  saving,
  onSubmit,
}: EnrollmentFormModalProps) {
  const isEdit = Boolean(enrollment);
  const [form, setForm] = useState<EnrollmentFormValues>(emptyForm());
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(
        enrollment
          ? {
              studentUserId: enrollment.studentUserId,
              classId: enrollment.classId,
              enrollmentDate: enrollment.enrollmentDate.slice(0, 10),
              status: enrollment.status,
            }
          : emptyForm()
      );
      setError('');
    }
  }, [open, enrollment]);

  const activeClasses = useMemo(
    () => classes.filter((c) => c.isActive !== false),
    [classes]
  );

  const activeStudents = useMemo(
    () => students.filter((s) => s.isActive !== false && s.userId),
    [students]
  );

  const set = <K extends keyof EnrollmentFormValues>(key: K, value: EnrollmentFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentUserId || !form.classId) {
      setError('Select both a student and a class.');
      return;
    }
    if (!isEdit) {
      const duplicate = enrollments.some(
        (en) =>
          en.studentUserId === form.studentUserId &&
          en.classId === form.classId &&
          en.status === 'Active'
      );
      if (duplicate) {
        setError('This student already has an active enrollment in that class.');
        return;
      }
    }
    setError('');
    await onSubmit(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit enrollment' : 'New enrollment'}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="enrollStudent">Student</Label>
          <Select
            id="enrollStudent"
            value={form.studentUserId}
            onChange={(e) => set('studentUserId', e.target.value)}
            className="mt-1"
            disabled={isEdit}
            required
          >
            <option value="">Select student…</option>
            {activeStudents.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.fullName} ({s.studentCode})
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="enrollClass">Class</Label>
          <Select
            id="enrollClass"
            value={form.classId}
            onChange={(e) => set('classId', e.target.value)}
            className="mt-1"
            disabled={isEdit}
            required
          >
            <option value="">Select class…</option>
            {activeClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.className}
                {c.courseName ? ` · ${c.courseName}` : ''}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="enrollDate">Enrolled date</Label>
            <Input
              id="enrollDate"
              type="date"
              value={form.enrollmentDate}
              onChange={(e) => set('enrollmentDate', e.target.value)}
              className="mt-1"
              required
            />
          </div>
          <div>
            <Label htmlFor="enrollStatus">Status</Label>
            <Select
              id="enrollStatus"
              value={form.status}
              onChange={(e) => set('status', e.target.value as Enrollment['status'])}
              className="mt-1"
            >
              {ENROLLMENT_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
