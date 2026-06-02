import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Label, Select } from '@/components/ui/Input';
import type { TeacherProfile } from '@/types';

interface AssignTeacherToClassModalProps {
  open: boolean;
  onClose: () => void;
  className: string;
  currentTeacherUserId?: string;
  teachers: TeacherProfile[];
  saving?: boolean;
  onSave: (teacherUserId: string, teacherName: string) => void;
}

export function AssignTeacherToClassModal({
  open,
  onClose,
  className,
  currentTeacherUserId,
  teachers,
  saving,
  onSave,
}: AssignTeacherToClassModalProps) {
  const [teacherUserId, setTeacherUserId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTeacherUserId(currentTeacherUserId ?? '');
      setError('');
    }
  }, [open, currentTeacherUserId]);

  const activeTeachers = useMemo(
    () => teachers.filter((t) => t.isActive !== false && t.userId),
    [teachers]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherUserId) {
      setError('Select a teacher.');
      return;
    }
    const teacher = teachers.find((t) => t.userId === teacherUserId);
    if (!teacher) return;
    setError('');
    onSave(teacher.userId, teacher.fullName);
  };

  return (
    <Modal open={open} onClose={onClose} title="Assign teacher" className="max-w-md">
      <p className="mb-4 text-sm text-slate-600">
        Choose the teacher for <strong>{className}</strong>.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="classTeacher">Teacher</Label>
          <Select
            id="classTeacher"
            value={teacherUserId}
            onChange={(e) => {
              setTeacherUserId(e.target.value);
              setError('');
            }}
            className="mt-1"
            required
          >
            <option value="">Select teacher…</option>
            {activeTeachers.map((t) => (
              <option key={t.userId} value={t.userId}>
                {t.fullName}
                {t.specialization ? ` · ${t.specialization.split(',')[0]}` : ''}
              </option>
            ))}
          </Select>
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
