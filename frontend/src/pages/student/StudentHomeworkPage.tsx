import { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { homeworkApi, parentsApi } from '@/api/resources';
import { useSqlAccountChildEnrollments } from '@/hooks/useSqlAccountChildEnrollments';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { getApiErrorMessage } from '@/utils/apiError';
import type { SqlAccountChild, SqlAccountChildEnrollment } from '@/types/sqlAccount';
import type { PortalHomework } from '@/types/portal';

type Step = 'child' | 'class' | 'submit';

export default function StudentHomeworkPage() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useToast();
  const [step, setStep] = useState<Step>('child');
  const [children, setChildren] = useState<SqlAccountChild[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [selectedChild, setSelectedChild] = useState<SqlAccountChild | null>(null);
  const [selectedClass, setSelectedClass] = useState<SqlAccountChildEnrollment | null>(null);
  const [submissions, setSubmissions] = useState<PortalHomework[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { enrollments, loading: loadingEnrollments } = useSqlAccountChildEnrollments(
    selectedChild?.branchName ?? null,
    Boolean(selectedChild)
  );

  useEffect(() => {
    if (user?.role !== 'Parent') {
      setLoadingChildren(false);
      return;
    }
    setLoadingChildren(true);
    parentsApi
      .getMySqlAccountChildren()
      .then((data) => setChildren(data.children))
      .catch(() => setChildren([]))
      .finally(() => setLoadingChildren(false));
  }, [user?.role]);

  const loadSubmissions = useCallback(async (branchName: string) => {
    setLoadingSubmissions(true);
    try {
      const data = await homeworkApi.getMine(branchName);
      setSubmissions(data);
    } catch {
      setSubmissions([]);
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChild?.branchName) {
      void loadSubmissions(selectedChild.branchName);
    }
  }, [selectedChild?.branchName, loadSubmissions]);

  const classSubmissions = useMemo(() => {
    if (!selectedClass) return [];
    return submissions.filter(
      (s) => s.docKey === selectedClass.docKey && s.seq === selectedClass.seq
    );
  }, [submissions, selectedClass]);

  const handleSubmit = async () => {
    if (!selectedChild || !selectedClass || !title.trim()) return;
    setSubmitting(true);
    try {
      await homeworkApi.submit({
        docKey: selectedClass.docKey,
        seq: selectedClass.seq,
        branchName: selectedChild.branchName,
        title: title.trim(),
        note: note.trim() || undefined,
        fileName: fileName.trim() || undefined,
      });
      setTitle('');
      setNote('');
      setFileName('');
      await loadSubmissions(selectedChild.branchName);
      showSuccess('Homework submitted — your teacher can review it.');
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not submit homework.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role !== 'Parent') {
    return (
      <div>
        <PageHeader
          title="Homework"
          description="Homework is submitted by parents for enrolled children."
        />
        <EmptyState
          icon={BookOpenCheck}
          title="Parent account required"
          description="Please sign in as a parent to submit homework for your children."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homework"
        description="Choose a child and class, then submit practice details for your teacher"
      />

      {step !== 'child' && (
        <button
          type="button"
          onClick={() => {
            if (step === 'submit') {
              setStep('class');
              setSelectedClass(null);
            } else {
              setStep('child');
              setSelectedChild(null);
              setSelectedClass(null);
            }
          }}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 'submit' ? selectedChild?.branchName : 'All children'}
        </button>
      )}

      {step === 'child' && (
        <>
          {loadingChildren ? (
            <p className="text-sm text-slate-500">Loading children…</p>
          ) : children.length === 0 ? (
            <EmptyState
              icon={BookOpenCheck}
              title="No children linked"
              description="Your SQL Account children will appear here when linked to your account."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {children.map((child) => (
                <button
                  key={child.branchName}
                  type="button"
                  onClick={() => {
                    setSelectedChild(child);
                    setStep('class');
                  }}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-primary-200 hover:shadow-md"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{child.branchName}</p>
                    {child.attention && (
                      <p className="mt-1 text-sm text-slate-500">{child.attention}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {step === 'class' && selectedChild && (
        <>
          <h2 className="text-lg font-semibold text-slate-900">{selectedChild.branchName}</h2>
          <p className="mb-2 text-sm text-slate-500">Select a class to submit homework</p>
          {loadingEnrollments ? (
            <p className="text-sm text-slate-500">Loading classes…</p>
          ) : enrollments.length === 0 ? (
            <EmptyState
              icon={BookOpenCheck}
              title="No classes"
              description="No enrolled classes found for this child."
              compact
            />
          ) : (
            <Card>
              <CardContent className="divide-y divide-slate-100 p-0">
                {enrollments.map((enrollment) => (
                  <button
                    key={`${enrollment.docKey}-${enrollment.seq}`}
                    type="button"
                    onClick={() => {
                      setSelectedClass(enrollment);
                      setStep('submit');
                    }}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{enrollment.className}</p>
                      {enrollment.conductedBy && (
                        <p className="text-sm text-slate-500">Teacher: {enrollment.conductedBy}</p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {step === 'submit' && selectedChild && selectedClass && (
        <>
          <PageHeader
            title={selectedClass.className}
            description={`${selectedChild.branchName}${selectedClass.conductedBy ? ` · ${selectedClass.conductedBy}` : ''}`}
          />

          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Submit homework</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="hw-title">Title</Label>
                <Input
                  id="hw-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Week 5 scale practice"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hw-note">Note for teacher (optional)</Label>
                <Textarea
                  id="hw-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  placeholder="What did you practice?"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hw-file">File name (optional)</Label>
                <Input
                  id="hw-file"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g. scales-week5.pdf"
                />
              </div>
              <Button
                type="button"
                className="w-full"
                disabled={!title.trim() || submitting}
                onClick={() => void handleSubmit()}
              >
                Submit homework
              </Button>
            </CardContent>
          </Card>

          <h2 className="mb-3 text-sm font-semibold text-slate-900">Previous submissions</h2>
          {loadingSubmissions ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : classSubmissions.length === 0 ? (
            <p className="text-sm text-slate-500">No submissions for this class yet.</p>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {classSubmissions.map((entry) => (
                <li key={entry.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">{entry.title || 'Homework'}</p>
                      {entry.fileName && (
                        <p className="text-sm text-slate-600">{entry.fileName}</p>
                      )}
                      {entry.note && <p className="mt-0.5 text-sm text-slate-500">{entry.note}</p>}
                    </div>
                    <time className="shrink-0 text-xs text-slate-400">
                      {formatDateDDMMYYYY(entry.createdAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
