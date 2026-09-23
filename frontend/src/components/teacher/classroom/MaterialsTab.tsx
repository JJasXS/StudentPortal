import { useEffect, useState } from 'react';
import { Download, FolderOpen, Plus, Trash2, Video } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input, Label } from '@/components/ui/Input';
import { classMaterialsApi } from '@/api/resources';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { getApiErrorMessage } from '@/utils/apiError';
import type { PortalClassMaterial } from '@/types/portal';

interface MaterialsTabProps {
  className: string;
  materials: PortalClassMaterial[];
  loading?: boolean;
  onRefresh: () => Promise<void> | void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export function MaterialVideoPlayer({ materialId }: { materialId: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    void classMaterialsApi
      .getFileBlob(materialId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = window.URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setSrc(null);
      });

    return () => {
      cancelled = true;
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [materialId]);

  if (!src) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-500">
        Loading video…
      </div>
    );
  }

  return (
    <video controls className="max-h-64 w-full rounded-lg bg-black" src={src} preload="metadata">
      Your browser does not support video playback.
    </video>
  );
}

export function MaterialsTab({
  className,
  materials,
  loading,
  onRefresh,
  onError,
  onSuccess,
}: MaterialsTabProps) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!className.trim() || !title.trim() || !file) {
      onError('Add a title and choose an MP4, WebM, or MOV video.');
      return;
    }
    setUploading(true);
    try {
      await classMaterialsApi.upload({ className, title: title.trim(), file });
      setTitle('');
      setFile(null);
      await onRefresh();
      onSuccess('Video uploaded.');
    } catch (err) {
      onError(getApiErrorMessage(err, 'Could not upload video.'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await classMaterialsApi.remove(id);
      await onRefresh();
      onSuccess('Video removed.');
    } catch (err) {
      onError(getApiErrorMessage(err, 'Could not remove video.'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (material: PortalClassMaterial) => {
    try {
      await classMaterialsApi.downloadFile(material.id, material.fileName);
    } catch (err) {
      onError(getApiErrorMessage(err, 'Could not download video.'));
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Upload lesson video</h3>
        <p className="mt-1 text-xs text-slate-500">MP4, WebM, or MOV · max 100 MB</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="materialTitle">Title</Label>
              <Input
                id="materialTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Week 3 technique demo"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="materialFile">Video file</Label>
              <Input
                id="materialFile"
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => void handleUpload()}
              disabled={uploading || !title.trim() || !file}
            >
              <Plus className="mr-1 h-4 w-4" />
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading materials…</p>
      ) : materials.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No videos uploaded yet"
          description="Upload a lesson video for students in this class to watch and download."
        />
      ) : (
        <ul className="space-y-4">
          {materials.map((m) => (
            <li
              key={m.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <Video className="h-4 w-4 shrink-0 text-primary-600" />
                    <span className="truncate">{m.title}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {formatDateDDMMYYYY(m.createdAt)}
                    {m.uploadedByName ? ` · ${m.uploadedByName}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Download video"
                    onClick={() => void handleDownload(m)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label="Delete video"
                    disabled={deletingId === m.id}
                    onClick={() => void handleDelete(m.id)}
                  >
                    <Trash2 className="h-4 w-4 text-rose-600" />
                  </Button>
                </div>
              </div>
              <div className="p-4">
                <MaterialVideoPlayer materialId={m.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
