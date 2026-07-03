import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { parentsApi } from '@/api/resources';
import { mockParents } from '@/utils/mockData';

const useApi = import.meta.env.VITE_USE_MOCK !== 'true';

export function useLearnerContext() {
  const { user } = useAuth();
  const [parentChildIds, setParentChildIds] = useState<string[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  useEffect(() => {
    if (user?.role !== 'Parent') {
      setParentChildIds([]);
      return;
    }

    setLoadingChildren(true);
    parentsApi
      .getAll()
      .catch(() => mockParents)
      .then((parents) => {
        const me = parents.find((p) => p.userId === user.id);
        setParentChildIds(me?.children ?? []);
      })
      .finally(() => setLoadingChildren(false));
  }, [user?.id, user?.role]);

  const studentUserId =
    user?.role === 'Student' ? user.id : user?.role === 'Parent' ? parentChildIds[0] : undefined;

  const learners = useMemo(() => {
    if (!user) return [];
    if (user.role === 'Student') {
      return [{ userId: user.id, fullName: user.fullName }];
    }
    if (user.role === 'Parent') {
      return parentChildIds.map((userId) => ({ userId, fullName: user.fullName }));
    }
    return [];
  }, [parentChildIds, user]);

  const studentUserIds = useMemo(
    () => (studentUserId ? [studentUserId] : parentChildIds),
    [parentChildIds, studentUserId]
  );

  return {
    user,
    studentUserId,
    learners,
    studentUserIds,
    loading: loadingChildren,
  };
}
