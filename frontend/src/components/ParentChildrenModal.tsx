import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { activeRecordStatus } from '@/utils/statusFilter';
import type { ParentProfile, StudentProfile } from '@/types';

interface ParentChildrenModalProps {
  parent: ParentProfile | null;
  students: StudentProfile[];
  onClose: () => void;
}

export function ParentChildrenModal({ parent, students, onClose }: ParentChildrenModalProps) {
  const childIds = new Set(parent?.children ?? []);
  const linked = students.filter((s) => childIds.has(s.userId) || childIds.has(s.id));

  return (
    <Modal open={Boolean(parent)} onClose={onClose} title={parent ? `Children of ${parent.fullName}` : 'Children'}>
      {linked.length === 0 ? (
        <p className="text-sm text-slate-500">No students linked to this parent.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {linked.map((child) => (
            <li key={child.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">{child.fullName}</p>
                <p className="text-xs text-slate-500">
                  {child.studentCode} · {child.schoolName || '—'}
                </p>
              </div>
              <StatusBadge status={activeRecordStatus(child.isActive)} />
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
