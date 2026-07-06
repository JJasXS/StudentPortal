import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { useToast } from '@/context/ToastContext';
import { homeworkApi } from '@/api/resources';
import { useSqlAccountChildEnrollments } from '@/hooks/useSqlAccountChildEnrollments';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { getApiErrorMessage } from '@/utils/apiError';
import type { SqlAccountChildEnrollment } from '@/types/sqlAccount';
import type { PortalHomework } from '@/types/portal';

interface ParentChildHomeworkPanelProps {
  branchName: string;
}

export function ParentChildHomeworkPanel({ branchName }: ParentChildHomeworkPanelProps) {
  const { success: showSuccess, error: showError } = useToast();
  const { enrollments, loading: enrollmentsLoading } = useSqlAccountChildEnrollments(
    branchName,
    true
  );
  const [submissions, setSubmissions] = useState<PortalHomework[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [selectedClass, setSelectedClass] = useState<SqlAccountChildEnrollment | null>(null);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    try {
      setSubmissions(await homeworkApi.getMine(branchName));
    } catch {
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [branchName]);

  useEffect(() => {
    void loadSubmissions();
  }, [loadSubmissions]);

  const classSubmissions = useMemo(() => {
    if (!selectedClass) return submissions;
    return submissions.filter(
      (s) => s.docKey === selectedClass.docKey && s.seq === selectedClass.seq
    );
  }, [submissions, selectedClass]);

  const handleSubmit = async () => {
    if (!selectedClass || !title.trim()) return;
    setSubmitting(true);
    try {
      await homeworkApi.submit({
        docKey: selectedClass.docKey,
        seq: selectedClass.seq,
        branchName,
        title: title.trim(),
        note: note.trim() || undefined,
        fileName: fileName.trim() || undefined,
      });
      setTitle('');
      setNote('');
      setFileName('');
      await loadSubmissions();
      showSuccess('Homework submitted.');
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not submit homework.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Class</Label>
          <select
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={selectedClass ? `${selectedClass.docKey}-${selectedClass.seq}` : ''}
            onChange={(e) => {
              const key = e.target.value;
              setSelectedClass(
                enrollments.find((en) => `${en.docKey}-${en.seq}` === key) ?? null
              );
            }}
            disabled={enrollmentsLoading}
          >
            <option value="">Select class…</option>
            {enrollments.map((en) => (
              <option key={`${en.docKey}-${en.seq}`} value={`${en.docKey}-${en.seq}`}>
                {en.className}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedClass && (
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <p className="text-sm font-medium text-slate-800">
            <BookOpenCheck className="mr-1 inline h-4 w-4" />
            Submit homework for {selectedClass.className}
          </p>
          <div className="space-y-1">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>File name (optional)</Label>
            <Input value={fileName} onChange={(e) => setFileName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Note (optional)</Label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button type="button" disabled={submitting || !title.trim()} onClick={() => void handleSubmit()}>
            {submitting ? 'Submitting…' : 'Submit'}
          </Button>
        </div>
      )}

      {loadingSubmissions ? (
        <p className="text-sm text-slate-500">Loading submissions…</p>
      ) : (
        <DataTable
          embedded
          data={classSubmissions.length > 0 || selectedClass ? classSubmissions : submissions}
          emptyMessage="No homework submitted yet."
          columns={[
            {
              key: 'className',
              header: 'Class',
              render: (s) => s.className ?? '—',
            },
            {
              key: 'title',
              header: 'Title',
              render: (s) => s.title || s.fileName || 'Homework',
            },
            {
              key: 'createdAt',
              header: 'Submitted',
              render: (s) => formatDateDDMMYYYY(s.createdAt),
            },
          ]}
        />
      )}
    </div>
  );
}
