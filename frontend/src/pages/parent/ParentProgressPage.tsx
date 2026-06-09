import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { ParentProgressSection } from '@/components/parent/ParentProgressSection';
import { useParentChildren } from '@/hooks/useParentChildren';

export default function ParentProgressPage() {
  const { user } = useAuth();
  const { records, loading } = useParentChildren(user?.id);

  const studentUserIds = useMemo(
    () => records.map((r) => r.child.userId).filter(Boolean) as string[],
    [records]
  );

  return (
    <div>
      <PageHeader
        title="Learning progress"
        description="Track attendance, skill growth, and teacher feedback for your children"
      />

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <ParentProgressSection studentUserIds={studentUserIds} />
      )}
    </div>
  );
}
