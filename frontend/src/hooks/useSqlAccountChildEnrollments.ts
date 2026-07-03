import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { parentsApi } from '@/api/resources';
import type { SqlAccountChildEnrollment } from '@/types/sqlAccount';
import { getApiErrorMessage } from '@/utils/apiError';

const useApi = import.meta.env.VITE_USE_MOCK !== 'true';

const mockEnrollments: SqlAccountChildEnrollment[] = [
  {
    docNo: 'SO-00010',
    docDate: '2024-01-15',
    className: 'Premium PU Leather Gaming Chair',
    itemCode: 'CHAIR-001',
    qty: '1',
    amount: '599.00',
  },
  {
    docNo: 'SO-00010',
    docDate: '2024-01-15',
    className: 'Creative Curvy Eames Style Chair',
    itemCode: 'CHAIR-002',
    qty: '1',
    amount: '299.00',
  },
];

export function useSqlAccountChildEnrollments(branchName: string | null, enabled: boolean) {
  const [enrollments, setEnrollments] = useState<SqlAccountChildEnrollment[]>([]);
  const [loading, setLoading] = useState(enabled && Boolean(branchName?.trim()));
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!enabled || !branchName?.trim()) {
      setEnrollments([]);
      setError('');
      setLoading(false);
      setHasFetched(false);
      return;
    }

    let cancelled = false;
    const branch = branchName.trim();
    setLoading(true);
    setError('');
    setHasFetched(false);

    (async () => {
      try {
        if (!useApi) {
          if (!cancelled) setEnrollments(mockEnrollments);
          return;
        }

        const data = await parentsApi.getChildEnrollments(branch);
        if (!cancelled) setEnrollments(data.enrollments);
      } catch (err) {
        if (!cancelled) {
          // Missing branch or no sales orders — show empty state, not an error screen.
          if (axios.isAxiosError(err) && err.response?.status === 404) {
            setEnrollments([]);
            setError('');
          } else {
            setError(
              getApiErrorMessage(err, 'Could not load enrolled classes from SQL Account.')
            );
            setEnrollments([]);
          }
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
  }, [branchName, enabled, refreshKey]);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  return {
    enrollments,
    loading: enabled && Boolean(branchName?.trim()) && (loading || !hasFetched),
    error,
    reload,
  };
}
