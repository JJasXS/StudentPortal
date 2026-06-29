import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileUp, Upload } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { useLearnerContext } from '@/hooks/useLearnerContext';
import { useToast } from '@/context/ToastContext';
import { mockClasses, mockEnrollments } from '@/utils/mockData';
import { resolveMockStudentUserId } from '@/utils/learnerSchedule';
import {
  addHomeworkSubmission,
  ensureHomeworkSeeded,
  loadHomeworkForStudentClass,
} from '@/utils/homeworkStore';
import type { HomeworkSubmission } from '@/types/homework';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';

export default function StudentHomeworkClassPage() {
  const { classId } = useParams<{ classId: string }>();
  const { user } = useLearnerContext();
  const { success: showSuccess } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState<HomeworkSubmission[]>([]);

  const mockStudentId = useMemo(
    () => resolveMockStudentUserId(user?.email),
    [user?.email]
  );

  ensureHomeworkSeeded();

  useEffect(() => {
    if (classId) {
      setEntries(loadHomeworkForStudentClass(mockStudentId, classId));
    }
  }, [mockStudentId, classId]);

  const enrolled = useMemo(
    () =>
      mockEnrollments.some(
        (e) =>
          e.studentUserId === mockStudentId &&
          e.classId === classId &&
          e.status === 'Active'
      ),
    [mockStudentId, classId]
  );

  const classItem = useMemo(
    () => mockClasses.find((c) => c.id === classId),
    [classId]
  );

  if (!classId || !classItem || !enrolled) {
    return <Navigate to="/student/homework" replace />;
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const submission = addHomeworkSubmission({
      studentUserId: mockStudentId,
      studentName: user?.fullName ?? 'Student',
      classId: classItem.id,
      className: classItem.className,
      courseId: classItem.courseId,
      courseName: classItem.courseName ?? 'Course',
      fileName: file.name,
      note: note.trim() || undefined,
    });

    setEntries((prev) => [submission, ...prev]);
    setNote('');
    showSuccess('Homework uploaded — your teacher can review it.');
    e.target.value = '';
  };

  return (
    <div>
      <Link
        to="/student/homework"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        All classes
      </Link>

      <PageHeader
        title={classItem.className}
        description={`${classItem.courseName ?? 'Course'} · ${classItem.teacherName ?? 'Teacher'}`}
      />

      <Card className="mb-6">
        <CardContent className="flex flex-col gap-4 p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Upload homework</p>
              <p className="mt-1 text-sm text-slate-500">PDF, image, or audio files</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hw-note">Note for teacher (optional)</Label>
            <Input
              id="hw-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Week 5 scale practice"
            />
          </div>

          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav"
            onChange={handleUpload}
          />
          <Button type="button" className="w-full" onClick={() => fileRef.current?.click()}>
            <FileUp className="mr-1.5 h-4 w-4" />
            Choose file
          </Button>
        </CardContent>
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-slate-900">Your uploads</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">No uploads for this class yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {entries.map((entry) => (
            <li key={entry.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{entry.fileName}</p>
                  {entry.note && (
                    <p className="mt-0.5 text-sm text-slate-500">{entry.note}</p>
                  )}
                </div>
                <time className="shrink-0 text-xs text-slate-400">
                  {formatDateDDMMYYYY(entry.uploadedAt)}
                </time>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
