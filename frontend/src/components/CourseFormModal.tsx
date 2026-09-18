import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import {
  COURSE_CATEGORIES,
  COURSE_LEVELS,
  courseToForm,
  emptyCourseForm,
  type CourseFormValues,
} from '@/utils/courseForm';
import type { Course } from '@/types';

interface CourseFormModalProps {
  open: boolean;
  onClose: () => void;
  course?: Course | null;
  onSubmit: (values: CourseFormValues) => Promise<void>;
  saving?: boolean;
}

export function CourseFormModal({
  open,
  onClose,
  course,
  onSubmit,
  saving = false,
}: CourseFormModalProps) {
  const [form, setForm] = useState<CourseFormValues>(emptyCourseForm());
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(course ? courseToForm(course) : emptyCourseForm());
      setError('');
    }
  }, [open, course]);

  const set = <K extends keyof CourseFormValues>(key: K, value: CourseFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseName.trim()) {
      setError('Course name is required.');
      return;
    }
    if (form.defaultDurationMinutes < 15 || form.defaultDurationMinutes > 180) {
      setError('Duration must be between 15 and 180 minutes.');
      return;
    }
    setError('');
    await onSubmit(form);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={course ? 'Edit course' : 'New course'}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="courseName">Course name</Label>
          <Input
            id="courseName"
            value={form.courseName}
            onChange={(e) => set('courseName', e.target.value)}
            placeholder="e.g. Piano Beginner"
            required
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="category">Category</Label>
            <Select id="category" value={form.category} onChange={(e) => set('category', e.target.value)}>
              {COURSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="level">Level</Label>
            <Select id="level" value={form.level} onChange={(e) => set('level', e.target.value)}>
              {COURSE_LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="duration">Lesson duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            min={15}
            max={180}
            step={5}
            value={form.defaultDurationMinutes}
            onChange={(e) => set('defaultDurationMinutes', Number(e.target.value))}
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="What students will learn..."
          />
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set('isActive', e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          Active course (visible in catalog)
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col-reverse gap-2 border-t sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : course ? 'Save changes' : 'Create course'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
