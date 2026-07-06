import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { DataTable } from '@/components/ui/DataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { formatAuditAction, loadAuditLogs, AUDIT_ACTION_LABELS } from '@/utils/auditLog';
import type { AuditLogEntry } from '@/types/auditLog';

const ACTION_OPTIONS = [...new Set(Object.keys(AUDIT_ACTION_LABELS))].sort();

function ActorCell({ entry }: { entry: AuditLogEntry }) {
  if (!entry.actorName && !entry.actorRole) {
    return <span className="text-slate-400">—</span>;
  }
  return (
    <div className="min-w-0">
      {entry.actorName && (
        <div className="font-medium text-slate-800">{entry.actorName}</div>
      )}
      {entry.actorRole && (
        <div className="text-xs text-slate-500">{entry.actorRole}</div>
      )}
    </div>
  );
}

export default function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const refresh = useCallback(() => {
    setLoading(true);
    loadAuditLogs({
      search,
      action: actionFilter || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    })
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [search, actionFilter, fromDate, toDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasFilters = Boolean(search.trim() || actionFilter || fromDate || toDate);
  const filtered = useMemo(() => entries, [entries]);

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Track admin changes to students, billing, settings, and more"
      />

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:flex-wrap lg:items-end">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search actor, action, details…"
              className="max-w-none flex-1 lg:min-w-[220px]"
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:flex lg:items-end lg:gap-3">
              <div className="sm:min-w-[180px]">
                <Label htmlFor="audit-action">Action</Label>
                <Select
                  id="audit-action"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                >
                  <option value="">All actions</option>
                  {ACTION_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {formatAuditAction(a)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="audit-from">From</Label>
                <Input
                  id="audit-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="audit-to">To</Label>
                <Input
                  id="audit-to"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>
            </div>
            {hasFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setActionFilter('');
                  setFromDate('');
                  setToDate('');
                }}
              >
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          <DataTable
            embedded
            data={filtered}
            emptyMessage={
              loading
                ? 'Loading audit log…'
                : hasFilters
                  ? 'No audit entries match your filters.'
                  : 'No audit entries yet.'
            }
            columns={[
              {
                key: 'createdAt',
                header: 'Date',
                sortable: true,
                sortType: 'date',
                colWidth: '7rem',
                getSortValue: (e) => e.createdAt,
                render: (e) => (
                  <span className="tabular-nums text-slate-700">
                    {formatDateDDMMYYYY(e.createdAt)}
                  </span>
                ),
              },
              {
                key: 'actor',
                header: 'Who',
                colWidth: '11rem',
                wrap: true,
                render: (e) => <ActorCell entry={e} />,
              },
              {
                key: 'action',
                header: 'Action',
                sortable: true,
                sortType: 'text',
                colWidth: '16rem',
                wrap: true,
                getSortValue: (e) => e.action,
                render: (e) => (
                  <span className="font-medium text-slate-800">{formatAuditAction(e.action)}</span>
                ),
              },
              {
                key: 'details',
                header: 'Details',
                wrap: true,
                className: 'text-slate-600',
                render: (e) => (
                  <span className="text-xs leading-relaxed">{e.details?.trim() || '—'}</span>
                ),
              },
            ]}
          />

          {!loading && (
            <div className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
              <History className="h-4 w-4 shrink-0" />
              {filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'}
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && filtered.length === 0 && !hasFilters && (
        <p className="mt-4 text-center text-sm text-slate-600">
          Actions like creating{' '}
          <Link to="/admin/announcements" className="font-medium text-primary-600 hover:underline">
            announcements
          </Link>{' '}
          or editing students will appear here.
        </p>
      )}
    </div>
  );
}
