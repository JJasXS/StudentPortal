import { useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Label, Select } from '@/components/ui/Input';
import type { Enrollment, StudentProfile } from '@/types';

interface AssignStudentToClassModalProps {
  open: boolean;
  onClose: () => void;
  className: string;
  classId: string;
  maxStudents: number;
  currentCount: number;
  students: StudentProfile[];
  enrollments: Enrollment[];
  saving?: boolean;
  onAssign: (studentUserId: string, studentName: string) => void;
}

export function AssignStudentToClassModal({
  open,
  onClose,
  className,
  classId,
  maxStudents,
  currentCount,
  students,
  enrollments,
  saving,
  onAssign,
}: AssignStudentToClassModalProps) {
  const [studentUserId, setStudentUserId] = useState('');
  const [error, setError] = useState('');

  const enrolledIds = useMemo(
    () =>
      new Set(
        enrollments
          .filter((e) => e.classId === classId && e.status === 'Active')
          .map((e) => e.studentUserId)
      ),
    [enrollments, classId]
  );

  const available = useMemo(
    () =>
      students.filter(
        (s) => s.isActive !== false && s.userId && !enrolledIds.has(s.userId)
      ),
    [students, enrolledIds]
  );

  const atCapacity = currentCount >= maxStudents;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (atCapacity) {
      setError('This class is full.');
      return;
    }
    if (!studentUserId) {
      setError('Select a student.');
      return;
    }
    const student = students.find((s) => s.userId === studentUserId);
    if (!student) return;
    setError('');
    onAssign(student.userId, student.fullName);
    setStudentUserId('');
  };

  return (
    <Modal open={open} onClose={onClose} title="Assign student to class" className="max-w-md">
      <p className="mb-4 text-sm text-slate-600">
        Add a student to <strong>{className}</strong>.{' '}
        <span className="text-slate-500">
          ({currentCount}/{maxStudents} enrolled)
        </span>
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="assignStudent">Student</Label>
          <Select
            id="assignStudent"
            value={studentUserId}
            onChange={(e) => {
              setStudentUserId(e.target.value);
              setError('');
            }}
            className="mt-1"
            disabled={atCapacity || available.length === 0}
          >
            <option value="">
              {atCapacity
                ? 'Class is full'
                : available.length === 0
                  ? 'No students available'
                  : 'Select a student…'}
            </option>
            {available.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.fullName} ({s.studentCode})
              </option>
            ))}
          </Select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <p className="text-xs text-slate-500">
          Only active students not already in this class are listed. In mock mode, assignments
          are saved for this browser session.
        </p>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || atCapacity || available.length === 0}>
            {saving ? 'Assigning…' : 'Assign'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
