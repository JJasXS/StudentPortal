import { useCallback, useEffect, useState } from 'react';
import { parentsApi } from '@/api/resources';
import type { SqlAccountChildEnrollment } from '@/types/sqlAccount';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!enabled || !branchName?.trim()) {
      setEnrollments([]);
      setError('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const branch = branchName.trim();

    (async () => {
      setLoading(true);
      setError('');
      try {
        if (!useApi) {
          if (!cancelled) setEnrollments(mockEnrollments);
          return;
        }

        const data = await parentsApi.getChildEnrollments(branch);
        if (!cancelled) setEnrollments(data.enrollments);
      } catch {
        if (!cancelled) {
          setError('Could not load enrolled classes from SQL Account.');
          setEnrollments([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [branchName, enabled, refreshKey]);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  return { enrollments, loading, error, reload };
}
