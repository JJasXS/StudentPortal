import { FolderOpen, Plus } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

interface MaterialsTabProps {
  onUploadHint: () => void;
}

export function MaterialsTab({ onUploadHint }: MaterialsTabProps) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No materials uploaded yet"
      description="Music sheets, PDFs, audio, and lesson resources will live here."
      actions={[
        {
          label: '+ Upload Material',
          onClick: onUploadHint,
        },
      ]}
    />
  );
}
