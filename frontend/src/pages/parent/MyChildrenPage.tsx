import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/PageHeader';
import { ChildProfileCard, PendingChildCard } from '@/components/parent/ChildProfileCard';
import { RegisterAnotherChildCard } from '@/components/parent/RegisterAnotherChildCard';
import { RegisterChildModal } from '@/components/parent/RegisterChildModal';
import { parentsApi, studentsApi } from '@/api/resources';
import { mockParents, mockStudents } from '@/utils/mockData';
import {
  addPendingRegistration,
  loadPendingRegistrations,
} from '@/utils/parentChildRegistrations';
import type { PendingChildRegistration, RegisterChildFormData } from '@/types/childRegistration';
import type { StudentProfile } from '@/types';

export default function MyChildrenPage() {
  const { user } = useAuth();
  const [children, setChildren] = useState<StudentProfile[]>([]);
  const [pending, setPending] = useState<PendingChildRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [registerOpen, setRegisterOpen] = useState(false);
  const { success: showToast } = useToast();

  const loadChildren = useCallback(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      parentsApi.getAll().catch(() => mockParents),
      studentsApi.getAll().catch(() => mockStudents),
    ])
      .then(([parents, students]) => {
        const parent = parents.find((p) => p.userId === user.id);
        const childIds = new Set(parent?.children ?? []);
        setChildren(students.filter((s) => childIds.has(s.userId)));
        setPending(loadPendingRegistrations(user.id));
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const handleRegister = (form: RegisterChildFormData) => {
    if (!user?.id) return;
    const entry = addPendingRegistration(user.id, form);
    setPending((list) => [...list, entry]);
    showToast(`${form.fullName} submitted — we'll notify you when linked.`);
  };

  return (
    <div>
      <PageHeader
        title="My Children"
        description="Students linked to your family account"
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {children.map((child, index) => (
            <ChildProfileCard key={child.id} child={child} index={index} />
          ))}
          {pending.map((reg) => (
            <PendingChildCard key={reg.id} registration={reg} />
          ))}
          <RegisterAnotherChildCard onClick={() => setRegisterOpen(true)} />
        </div>
      )}

      {!loading && children.length === 0 && pending.length === 0 && (
        <p className="mt-4 text-center text-sm text-slate-500">
          No children linked yet — use the card below to register your first child.
        </p>
      )}

      <RegisterChildModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSubmit={handleRegister}
      />
    </div>
  );
}
