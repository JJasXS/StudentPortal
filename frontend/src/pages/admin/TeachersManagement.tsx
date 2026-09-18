import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, UserCircle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { UserManagementSwitcher } from '@/components/admin/UserManagementSwitcher';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { teachersApi } from '@/api/resources';
import type { SqlAccountCalendarTeacher } from '@/types/sqlAccount';
import { cn } from '@/utils/cn';
import { getApiErrorMessage } from '@/utils/apiError';

const mockStaff: SqlAccountCalendarTeacher[] = [
  { erpUserId: 'SALES', fullName: 'SALES', email: 'test1@gmail.com' },
  { erpUserId: 'PURCHASING', fullName: 'PURCHASING', email: 'test2@gmail.com' },
  { erpUserId: 'API', fullName: 'API', email: 'test3@gmail.com' },
];

export default function TeachersManagement() {
  const [staff, setStaff] = useState<SqlAccountCalendarTeacher[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isMock) {
        setStaff(mockStaff);
        return;
      }

      setStaff(await teachersApi.getCalendarFilter());
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load staff from SQL Account (SY_USER).'));
      setStaff(isMock ? mockStaff : []);
    } finally {
      setLoading(false);
    }
  }, [isMock]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return staff;

    return staff.filter(
      (member) =>
        member.fullName.toLowerCase().includes(term) ||
        member.erpUserId.toLowerCase().includes(term) ||
        member.email.toLowerCase().includes(term)
    );
  }, [staff, search]);

  return (
    <div>
      <PageHeader
        title="User Management"
        description="View-only list from SQL Account SY_USER (non-admin users)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={cn('mr-1.5 h-4 w-4', loading && 'animate-spin')} />
              Refresh
            </Button>
            <UserManagementSwitcher />
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
          placeholder="Search name, user code, or email..."
          className="max-w-md"
        />
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <UserCircle className="h-4 w-4" />
          {loading ? 'Loading…' : `${filtered.length} staff`}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">Loading staff…</div>
          ) : (
            <DataTable
              embedded
              data={filtered}
              columns={[
                {
                  key: 'erpUserId',
                  header: 'User code',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (m) => m.erpUserId,
                },
                {
                  key: 'fullName',
                  header: 'Name',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (m) => m.fullName,
                },
                {
                  key: 'email',
                  header: 'Email',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (m) => m.email,
                  render: (m) => m.email || '—',
                },
              ]}
              emptyMessage={search ? 'No staff match your search.' : 'No non-admin SY_USER records found.'}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
