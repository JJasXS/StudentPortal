import { useCallback, useEffect, useState } from 'react';
import { studentsApi } from '@/api/resources';
import type { SqlAccountStudent } from '@/types/sqlAccount';
import { getApiErrorMessage } from '@/utils/apiError';

const useApi = import.meta.env.VITE_USE_MOCK !== 'true';

const mockStudent: SqlAccountStudent = {
  customerCode: '300-P0001',
  studentName: 'Demo Student',
  email: null,
  phone: null,
  branchName: 'Demo Student',
};

export function useSqlAccountStudent(enabled: boolean) {
  const [student, setStudent] = useState<SqlAccountStudent | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setStudent(null);
      setError('');
      setLoading(false);
      setHasFetched(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError('');
    setHasFetched(false);

    (async () => {
      try {
        if (!useApi) {
          if (!cancelled) setStudent(mockStudent);
          return;
        }

        const data = await studentsApi.getMySqlAccount();
        if (!cancelled) setStudent(data);
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Could not load student from SQL Account.'));
          setStudent(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHasFetched(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, refreshKey]);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  return { student, loading, hasFetched, error, reload };
}
