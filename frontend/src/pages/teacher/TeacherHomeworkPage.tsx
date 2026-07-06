import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileText, Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/context/AuthContext';
import { homeworkApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { accountInitials } from '@/utils/accountDisplay';
import type { PortalHomework } from '@/types/portal';

type Step = 'classes' | 'students' | 'files';

interface ClassHomeworkSummary {
  className: string;
  branchName: string;
  uploads: PortalHomework[];
  studentCount: number;
}

interface StudentHomeworkSummary {
  branchName: string;
  submittedBy: string;
  uploads: PortalHomework[];
}

export default function TeacherHomeworkPage() {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('classes');
  const [allHomework, setAllHomework] = useState<PortalHomework[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassHomeworkSummary | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentHomeworkSummary | null>(null);

  useEffect(() => {
    if (!user?.fullName) return;
    setLoading(true);
    homeworkApi
      .getAll(user.fullName)
      .then(setAllHomework)
      .catch(() => setAllHomework([]))
      .finally(() => setLoading(false));
  }, [user?.fullName]);

  const classSummaries = useMemo(() => {
    const byClass = new Map<string, ClassHomeworkSummary>();
    for (const upload of allHomework) {
      const key = `${upload.branchName}::${upload.className ?? 'Class'}`;
      if (!byClass.has(key)) {
        byClass.set(key, {
          className: upload.className ?? 'Class',
          branchName: upload.branchName,
          uploads: [],
          studentCount: 0,
        });
      }
      byClass.get(key)!.uploads.push(upload);
    }
    return [...byClass.values()]
      .map((s) => ({
        ...s,
        studentCount: new Set(s.uploads.map((u) => u.branchName)).size,
      }))
      .sort((a, b) => a.className.localeCompare(b.className));
  }, [allHomework]);

  const studentsInClass = useMemo((): StudentHomeworkSummary[] => {
    if (!selectedClass) return [];
    const byStudent = new Map<string, StudentHomeworkSummary>();
    for (const upload of selectedClass.uploads) {
      const key = upload.branchName;
      if (!byStudent.has(key)) {
        byStudent.set(key, {
          branchName: upload.branchName,
          submittedBy: upload.submittedBy,
          uploads: [],
        });
      }
      byStudent.get(key)!.uploads.push(upload);
    }
    return [...byStudent.values()]
      .map((s) => ({
        ...s,
        uploads: s.uploads.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      }))
      .sort((a, b) => a.submittedBy.localeCompare(b.submittedBy));
  }, [selectedClass]);

  const goClasses = () => {
    setStep('classes');
    setSelectedClass(null);
    setSelectedStudent(null);
  };

  const goStudents = () => {
    setStep('students');
    setSelectedStudent(null);
  };

  return (
    <div>
      <PageHeader
        title="Homework"
        description="Student submissions by class — select a class, then a student"
      />

      {step !== 'classes' && (
        <button
          type="button"
          onClick={step === 'files' ? goStudents : goClasses}
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" />
          {step === 'files' ? selectedClass?.className : 'All classes'}
        </button>
      )}

      {step === 'classes' &&
        (loading ? (
          <p className="text-sm text-slate-500">Loading homework…</p>
        ) : classSummaries.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No homework yet"
            description="When students upload homework for your classes, they will appear here."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {classSummaries.map((summary) => (
              <button
                key={`${summary.branchName}-${summary.className}`}
                type="button"
                onClick={() => {
                  setSelectedClass(summary);
                  setStep('students');
                }}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-primary-200 hover:shadow-md"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {summary.branchName}
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">{summary.className}</h3>
                <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5">
                    <FileText className="h-3.5 w-3.5" />
                    {summary.uploads.length} submission{summary.uploads.length === 1 ? '' : 's'}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5">
                    <Users className="h-3.5 w-3.5" />
                    {summary.studentCount} student{summary.studentCount === 1 ? '' : 's'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ))}

      {step === 'students' && selectedClass && (
        <div>
          <h2 className="mb-1 text-lg font-semibold text-slate-900">{selectedClass.className}</h2>
          <p className="mb-4 text-sm text-slate-500">{selectedClass.branchName} · Choose a student</p>
          <Card>
            <CardContent className="divide-y divide-slate-100 p-0">
              {studentsInClass.map((student) => (
                <button
                  key={student.branchName}
                  type="button"
                  onClick={() => {
                    setSelectedStudent(student);
                    setStep('files');
                  }}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                    {accountInitials(student.submittedBy)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{student.submittedBy}</p>
                    <p className="text-sm text-slate-500">
                      {student.branchName} · {student.uploads.length} submission
                      {student.uploads.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {step === 'files' && selectedClass && selectedStudent && (
        <div>
          <h2 className="mb-1 text-lg font-semibold text-slate-900">{selectedStudent.submittedBy}</h2>
          <p className="mb-4 text-sm text-slate-500">
            {selectedClass.className} · {selectedClass.branchName}
          </p>
          <Card>
            <CardContent className="divide-y divide-slate-100 p-0">
              {selectedStudent.uploads.map((entry) => (
                <div key={entry.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{entry.title || 'Homework'}</p>
                        {entry.fileName && (
                          <p className="text-sm text-slate-600">{entry.fileName}</p>
                        )}
                        <time className="text-xs text-slate-400">
                          {formatDateDDMMYYYY(entry.createdAt)}
                        </time>
                      </div>
                    </div>
                  </div>
                  {entry.note?.trim() && (
                    <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                      {entry.note}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
