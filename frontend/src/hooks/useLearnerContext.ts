import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

export function useLearnerContext() {
  const { user } = useAuth();

  const studentUserId = user?.role === 'Student' ? user.id : undefined;

  const learners = useMemo(() => {
    if (!studentUserId || !user) return [];
    return [{ userId: studentUserId, fullName: user.fullName }];
  }, [studentUserId, user]);

  const studentUserIds = useMemo(
    () => (studentUserId ? [studentUserId] : []),
    [studentUserId]
  );

  return {
    user,
    studentUserId,
    learners,
    studentUserIds,
    loading: false,
  };
}
