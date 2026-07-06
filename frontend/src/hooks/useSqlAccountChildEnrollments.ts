import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { parentsApi } from '@/api/resources';
import type { SqlAccountChildEnrollment } from '@/types/sqlAccount';
import { getApiErrorMessage } from '@/utils/apiError';

const useApi = import.meta.env.VITE_USE_MOCK !== 'true';

const mockEnrollments: SqlAccountChildEnrollment[] = [
  {
    docKey: 10,
    seq: 1,
    docNo: 'SO-00010',
    docDate: '2024-01-15',
    className: 'Piano Beginner — Monday AM',
    itemCode: 'PIANO-MON-AM',
    qty: '1',
    amount: '350.00',
    classDay: 'Monday',
    classTime: '10:00',
    linkedClassName: 'Piano Mon AM',
    linkedClassDayOfWeek: 'Monday',
    linkedClassStartTime: '10:00',
    linkedClassEndTime: '11:00',
    linkedClassTeacherName: 'Sarah Chen',
    nextSessionDate: '2026-06-09',
  },
  {
    docKey: 11,
    seq: 1,
    docNo: 'SO-00011',
    docDate: '2024-02-01',
    className: 'Guitar Beginner — Wednesday PM',
    itemCode: 'GUITAR-WED-PM',
    qty: '1',
    amount: '280.00',
    classDay: 'Wednesday',
    classTime: '15:00',
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
