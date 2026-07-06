import { useEffect, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import type { Enrollment, StudentProfile, TeacherProfile } from '@/types';

export interface AssignStudentOptions {
  studentUserId: string;
  studentName: string;
  teacherUserId: string;
  teacherName: string;
  repeat: boolean;
  startDate: string;
  endDate: string;
}

interface AssignStudentToClassModalProps {
  open: boolean;
  onClose: () => void;
  className: string;
  classId: string;
  maxStudents: number;
  currentCount: number;
  students: StudentProfile[];
  enrollments: Enrollment[];
  teachers: TeacherProfile[];
  currentTeacherUserId: string;
  saving?: boolean;
  onAssign: (options: AssignStudentOptions) => void;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function addWeeksStr(weeks: number): string {
  return new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
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
  teachers,
  currentTeacherUserId,
  saving,
  onAssign,
}: AssignStudentToClassModalProps) {
  const [studentUserId, setStudentUserId] = useState('');
  const [teacherUserId, setTeacherUserId] = useState('');
  const [repeat, setRepeat] = useState(true);
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(addWeeksStr(8));
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setStudentUserId('');
      setTeacherUserId(currentTeacherUserId ?? '');
      setRepeat(true);
      setStartDate(todayStr());
      setEndDate(addWeeksStr(8));
      setError('');
    }
  }, [open, currentTeacherUserId]);

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

  const activeTeachers = useMemo(
    () => teachers.filter((t) => t.isActive !== false && t.userId),
    [teachers]
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
    if (!teacherUserId) {
      setError('Select a teacher.');
      return;
    }
    if (!startDate) {
      setError('Choose a start date.');
      return;
    }
    if (repeat && !endDate) {
      setError('Choose an end date.');
      return;
    }
    if (repeat && endDate < startDate) {
      setError('End date must be on or after the start date.');
      return;
    }
    const student = students.find((s) => s.userId === studentUserId);
    if (!student) return;
    const teacher = teachers.find((t) => t.userId === teacherUserId);
    setError('');
    onAssign({
      studentUserId: student.userId,
      studentName: student.fullName,
      teacherUserId,
      teacherName: teacher?.fullName ?? '',
      repeat,
      startDate,
      endDate: repeat ? endDate : startDate,
    });
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

        <div>
          <Label htmlFor="assignTeacher">Teacher</Label>
          <Select
            id="assignTeacher"
            value={teacherUserId}
            onChange={(e) => {
              setTeacherUserId(e.target.value);
              setError('');
            }}
            className="mt-1"
          >
            <option value="">Select a teacher…</option>
            {activeTeachers.map((t) => (
              <option key={t.userId} value={t.userId}>
                {t.fullName}
                {t.specialization ? ` · ${t.specialization.split(',')[0]}` : ''}
              </option>
            ))}
          </Select>
          <p className="mt-1 text-xs text-slate-500">
            Defaults to the current class teacher. Changing this updates the class.
          </p>
        </div>

        <div>
          <Label>Schedule</Label>
          <div className="mt-1 flex gap-4">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="assignRepeat"
                checked={repeat}
                onChange={() => setRepeat(true)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              Repeats weekly
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="assignRepeat"
                checked={!repeat}
                onChange={() => setRepeat(false)}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500"
              />
              One-off session
            </label>
          </div>
        </div>

        <div className={repeat ? 'grid grid-cols-2 gap-3' : ''}>
          <div>
            <Label htmlFor="assignStartDate">{repeat ? 'Start date' : 'Session date'}</Label>
            <Input
              id="assignStartDate"
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setError('');
              }}
              className="mt-1"
            />
          </div>
          {repeat && (
            <div>
              <Label htmlFor="assignEndDate">End date</Label>
              <Input
                id="assignEndDate"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setError('');
                }}
                className="mt-1"
              />
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <p className="text-xs text-slate-500">
          Only active students not already in this class are listed. Sessions are generated for the
          whole class from the weekly schedule. In mock mode, changes are saved for this browser
          session.
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
