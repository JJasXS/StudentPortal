import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, RefreshCw, Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { sqlAccountApi } from '@/api/resources';
import type { SqlAccountParent } from '@/types/sqlAccount';
import { cn } from '@/utils/cn';
import { getApiErrorMessage } from '@/utils/apiError';

const mockParents: SqlAccountParent[] = [
  {
    customerCode: '300-P0001',
    parentName: 'Demo Parent',
    parentEmail: 'parent@gmail.com',
    children: [
      { branchName: 'dawg', attention: 'Dawg', email: null, phone: null },
      { branchName: 'son', attention: 'Son', email: null, phone: null },
      { branchName: 'wacc', attention: 'Wacc', email: null, phone: null },
    ],
  },
];

export default function AdminParentsPage() {
  const [parents, setParents] = useState<SqlAccountParent[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isMock) {
        setParents(mockParents);
        return;
      }

      const status = await sqlAccountApi.getStatus();
      if (!status.configured) {
        setParents([]);
        setError('SQL Account is not configured. Set SqlAccount__DatabasePath in .env.');
        return;
      }

      setParents(await sqlAccountApi.getParentChildren());
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load parents from SQL Account.'));
      setParents(isMock ? mockParents : []);
    } finally {
      setLoading(false);
    }
  }, [isMock]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return parents;

    return parents.filter((parent) => {
      const parentMatch =
        parent.parentName.toLowerCase().includes(term) ||
        parent.customerCode.toLowerCase().includes(term) ||
        (parent.parentEmail?.toLowerCase().includes(term) ?? false);
      const childMatch = parent.children.some((child) =>
        child.branchName.toLowerCase().includes(term)
      );
      return parentMatch || childMatch;
    });
  }, [parents, search]);

  const totalChildren = useMemo(
    () => filtered.reduce((sum, parent) => sum + parent.children.length, 0),
    [filtered]
  );

  return (
    <div>
      <PageHeader
        title="Parents"
        description="View-only list from SQL Account (AR_CUSTOMER). Click a parent to see their children (BRANCHNAME)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              View only
            </span>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={cn('mr-1.5 h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {error}
        </p>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search parent, code, email, or child branch..."
          className="max-w-md"
        />
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users className="h-4 w-4" />
          {loading ? 'Loading…' : `${filtered.length} parents · ${totalChildren} children`}
        </div>
      </div>

      <Card>
        <CardContent className="divide-y divide-slate-100 p-0">
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">Loading parents…</div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              {search ? 'No parents match your search.' : 'No parents found in SQL Account.'}
            </div>
          ) : (
            filtered.map((parent) => (
              <Link
                key={parent.customerCode || parent.parentName}
                to={`/admin/parents/${encodeURIComponent(parent.customerCode)}`}
                className="flex items-center gap-3 px-4 py-4 transition hover:bg-slate-50 sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900">{parent.parentName}</p>
                  <p className="text-sm text-slate-500">
                    {parent.customerCode}
                    {parent.parentEmail ? ` · ${parent.parentEmail}` : ''}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {parent.children.length} {parent.children.length === 1 ? 'child' : 'children'}
                    {parent.children.length > 0 &&
                      ` · ${parent.children.map((c) => c.branchName).join(', ')}`}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" />
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
