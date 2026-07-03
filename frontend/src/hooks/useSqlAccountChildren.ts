import { useCallback, useEffect, useState } from 'react';
import { parentsApi } from '@/api/resources';
import type { SqlAccountChild } from '@/types/sqlAccount';

const useApi = import.meta.env.VITE_USE_MOCK !== 'true';

const mockChildren: SqlAccountChild[] = [
  { branchName: 'dawg', attention: null, email: null, phone: null },
  { branchName: 'son', attention: null, email: null, phone: null },
];

export function useSqlAccountChildren(enabled: boolean) {
  const [children, setChildren] = useState<SqlAccountChild[]>([]);
  const [parentName, setParentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setChildren([]);
      setParentName('');
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      try {
        if (!useApi) {
          if (!cancelled) {
            setParentName('Parent');
            setChildren(mockChildren);
          }
          return;
        }

        const data = await parentsApi.getMySqlAccountChildren();
        if (!cancelled) {
          setParentName(data.parentName);
          setChildren(data.children);
        }
      } catch {
        if (!cancelled) {
          setError('Could not load children from SQL Account.');
          setChildren([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, refreshKey]);

  const reload = useCallback(() => setRefreshKey((key) => key + 1), []);

  return { children, parentName, loading, error, reload };
}
