import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoreVertical, RefreshCw, Users } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { UserManagementSwitcher } from '@/components/admin/UserManagementSwitcher';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { sqlAccountApi } from '@/api/resources';
import type { SqlAccountChild, SqlAccountParent } from '@/types/sqlAccount';
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

type StudentListRow = {
  id: string;
  studentName: string;
  branchName: string;
  customerCode: string;
  parentName: string;
  parentEmail?: string | null;
};

function studentDisplayName(child: SqlAccountChild): string {
  const attention = child.attention?.trim();
  return attention || child.branchName;
}

function flattenStudents(parents: SqlAccountParent[]): StudentListRow[] {
  const rows: StudentListRow[] = [];
  for (const parent of parents) {
    // One customer = one student: prefer company/parentName as display name
    const sole = parent.children[0];
    if (!sole) continue;
    rows.push({
      id: parent.customerCode,
      studentName: parent.parentName?.trim() || studentDisplayName(sole),
      branchName: sole.branchName,
      customerCode: parent.customerCode,
      parentName: parent.parentName,
      parentEmail: parent.parentEmail,
    });
  }
  return rows.sort((a, b) => a.studentName.localeCompare(b.studentName, undefined, { sensitivity: 'base' }));
}

function StudentActionsMenu({
  customerCode,
  branchName,
}: {
  customerCode: string;
  branchName: string;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const manageHref = `/admin/parents/${encodeURIComponent(customerCode)}?branch=${encodeURIComponent(branchName)}&tab=assign`;

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label="Student actions"
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setOpen(false);
              void navigate(manageHref);
            }}
          >
            Manage student
          </button>
        </div>
      )}
    </div>
  );
}

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
      setError(getApiErrorMessage(err, 'Could not load students from SQL Account.'));
      setParents(isMock ? mockParents : []);
    } finally {
      setLoading(false);
    }
  }, [isMock]);

  useEffect(() => {
    void load();
  }, [load]);

  const students = useMemo(() => flattenStudents(parents), [parents]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;

    return students.filter((row) =>
      [
        row.studentName,
        row.branchName,
        row.customerCode,
        row.parentName,
        row.parentEmail ?? '',
      ].some((value) => value.toLowerCase().includes(term))
    );
  }, [students, search]);

  return (
    <div>
      <PageHeader
        title="User Management"
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
          placeholder="Search student, branch, parent, or code..."
          className="max-w-md"
        />
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users className="h-4 w-4" />
          {loading ? 'Loading…' : `${filtered.length} students`}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">Loading students…</div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              {search ? 'No students match your search.' : 'No students found in SQL Account.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium sm:px-6">Name</th>
                    <th className="px-4 py-3 font-medium">Branch</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium sm:px-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-medium text-slate-900 sm:px-6">{row.studentName}</td>
                      <td className="px-4 py-3 text-slate-700">{row.branchName}</td>
                      <td className="px-4 py-3 font-mono text-slate-600">{row.customerCode}</td>
                      <td className="px-4 py-3 text-slate-600">{row.parentEmail || '—'}</td>
                      <td className="px-4 py-3 text-right sm:px-6">
                        <StudentActionsMenu
                          customerCode={row.customerCode}
                          branchName={row.branchName}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
