import { useRef, useState } from 'react';
import { Download, Link2, Paperclip, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Label, Textarea } from '@/components/ui/Input';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { cn } from '@/utils/cn';
import {
  assignmentWorkStatus,
  workStatusBadgeClass,
  type StudentWorkStatus,
} from '@/utils/studentLearning';
import type { PortalAssignment, PortalHomework } from '@/types/portal';

interface YourWorkCardProps {
  assignment?: PortalAssignment | null;
  submission?: PortalHomework | null;
  submitting?: boolean;
  onSubmit: (payload: { url?: string; note?: string; file?: File }) => void | Promise<void>;
  onDownload?: (entry: PortalHomework) => void;
}

export function YourWorkCard({
  assignment,
  submission,
  submitting,
  onSubmit,
  onDownload,
}: YourWorkCardProps) {
  const [showLink, setShowLink] = useState(false);
  const [showFile, setShowFile] = useState(false);
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const status: StudentWorkStatus = assignment
    ? assignmentWorkStatus(assignment, submission)
    : submission
      ? submission.status === 'Completed'
        ? 'Completed'
        : submission.status === 'Rejected'
          ? 'Returned'
          : 'Submitted'
      : 'Not Started';

  const turnedIn = Boolean(submission);

  const handleTurnIn = () => {
    void onSubmit({
      url: url.trim() || undefined,
      note: note.trim() || undefined,
      file: file ?? undefined,
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your work</h3>

      <span
        className={cn(
          'mt-3 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1',
          workStatusBadgeClass(status)
        )}
      >
        {turnedIn && status === 'Not Started' ? 'Submitted' : status}
      </span>

      {turnedIn && submission ? (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-slate-800">Submitted</p>
          <p className="text-xs text-slate-500">{formatDateDDMMYYYY(submission.createdAt)}</p>
          {submission.url && (
            <a
              href={submission.url}
              target="_blank"
              rel="noreferrer"
              className="block truncate text-sm text-primary-600 hover:underline"
            >
              {submission.url}
            </a>
          )}
          {(submission.hasFile || submission.filePath) && onDownload && (
            <button
              type="button"
              onClick={() => onDownload(submission)}
              className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
            >
              <Download className="h-3.5 w-3.5" />
              {submission.fileName || 'Download attachment'}
            </button>
          )}
          {submission.note && <p className="text-sm text-slate-600">{submission.note}</p>}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setShowFile(true);
                fileRef.current?.click();
              }}
            >
              <Paperclip className="mr-1 h-3.5 w-3.5" />
              Add File
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowLink((v) => !v)}>
              <Link2 className="mr-1 h-3.5 w-3.5" />
              Add Link
            </Button>
          </div>

          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.zip,.mp3,.mp4"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setShowFile(true);
            }}
          />

          {showFile && file && (
            <p className="text-xs text-slate-600">
              Selected: <span className="font-medium">{file.name}</span>
            </p>
          )}

          {showLink && (
            <div className="space-y-1">
              <Label>Link</Label>
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label>Note to teacher</Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <Button
            type="button"
            className="w-full"
            disabled={submitting || (!url.trim() && !file && !note.trim())}
            onClick={handleTurnIn}
          >
            <Plus className="mr-1 h-4 w-4" />
            {submitting ? 'Turning in…' : 'Turn In'}
          </Button>
        </div>
      )}
    </div>
  );
}
