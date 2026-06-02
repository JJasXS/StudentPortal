import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import {
  addMinutesToTime,
  classToForm,
  DAYS_OF_WEEK,
  emptyClassForm,
  normalizeTimeInput,
  type ClassFormValues,
} from '@/utils/classForm';
import type { ClassItem, Course, TeacherProfile } from '@/types';

interface ClassFormModalProps {
  open: boolean;
  onClose: () => void;
  course: Course;
  teachers: TeacherProfile[];
  classItem?: ClassItem | null;
  onSubmit: (values: ClassFormValues) => Promise<void>;
  saving?: boolean;
}

export function ClassFormModal({
  open,
  onClose,
  course,
  teachers,
  classItem,
  onSubmit,
  saving = false,
}: ClassFormModalProps) {
  const [form, setForm] = useState<ClassFormValues>(() =>
    emptyClassForm(course.defaultDurationMinutes)
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(
        classItem ? classToForm(classItem) : emptyClassForm(course.defaultDurationMinutes)
      );
      setError('');
    }
  }, [open, classItem, course.defaultDurationMinutes]);

  const activeTeachers = useMemo(
    () => teachers.filter((t) => t.isActive !== false && t.userId),
    [teachers]
  );

  const set = <K extends keyof ClassFormValues>(key: K, value: ClassFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleStartTimeChange = (startTime: string) => {
    const normalized = normalizeTimeInput(startTime);
    setForm((prev) => ({
      ...prev,
      startTime: normalized,
      endTime: addMinutesToTime(normalized, course.defaultDurationMinutes),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.className.trim()) {
      setError('Class name is required.');
      return;
    }
    if (!form.teacherUserId) {
      setError('Select a teacher.');
      return;
    }
    if (!form.location.trim()) {
      setError('Location is required.');
      return;
    }
    if (form.maxStudents < 1 || form.maxStudents > 50) {
      setError('Max students must be between 1 and 50.');
      return;
    }
    if (form.startTime >= form.endTime) {
      setError('End time must be after start time.');
      return;
    }
    setError('');
    await onSubmit(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={classItem ? 'Edit class' : 'New class'}
      className="max-w-lg"
    >
      <p className="mb-4 text-sm text-slate-600">
        {classItem ? 'Update' : 'Add'} a class under <strong>{course.courseName}</strong>.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="className">Class name</Label>
          <Input
            id="className"
            value={form.className}
            onChange={(e) => set('className', e.target.value)}
            placeholder="e.g. Piano Mon AM"
            required
          />
        </div>

        <div>
          <Label htmlFor="classTeacher">Teacher</Label>
          <Select
            id="classTeacher"
            value={form.teacherUserId}
            onChange={(e) => set('teacherUserId', e.target.value)}
            className="mt-1"
            required
          >
            <option value="">Select teacher…</option>
            {activeTeachers.map((t) => (
              <option key={t.userId} value={t.userId}>
                {t.fullName}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="dayOfWeek">Day</Label>
            <Select
              id="dayOfWeek"
              value={form.dayOfWeek}
              onChange={(e) => set('dayOfWeek', e.target.value)}
            >
              {DAYS_OF_WEEK.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="maxStudents">Max students</Label>
            <Input
              id="maxStudents"
              type="number"
              min={1}
              max={50}
              value={form.maxStudents}
              onChange={(e) => set('maxStudents', Number(e.target.value))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="startTime">Start time</Label>
            <Input
              id="startTime"
              type="time"
              value={form.startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="endTime">End time</Label>
            <Input
              id="endTime"
              type="time"
              value={form.endTime}
              onChange={(e) => set('endTime', normalizeTimeInput(e.target.value))}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="e.g. Room A"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : classItem ? 'Save changes' : 'Create class'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
