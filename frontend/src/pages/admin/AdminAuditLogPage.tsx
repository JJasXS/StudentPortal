import { useCallback, useEffect, useMemo, useState } from 'react';
import { History, X } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { DataTable } from '@/components/ui/DataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { formatAuditAction, loadAuditLogs, AUDIT_ACTION_LABELS } from '@/utils/auditLog';
import { AUDIT_ENTITY_TYPES, type AuditLogEntry } from '@/types/auditLog';

const ACTION_OPTIONS = [...new Set(Object.keys(AUDIT_ACTION_LABELS))].sort();

export default function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const refresh = useCallback(() => {
    setLoading(true);
    loadAuditLogs({
      search,
      action: actionFilter || undefined,
      entityType: entityFilter || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    })
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [search, actionFilter, entityFilter, fromDate, toDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasFilters = Boolean(search.trim() || actionFilter || entityFilter || fromDate || toDate);
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
              placeholder="Search actor, action, entity…"
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
              <div className="sm:min-w-[140px]">
                <Label htmlFor="audit-entity">Entity</Label>
                <Select
                  id="audit-entity"
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                >
                  <option value="">All types</option>
                  {AUDIT_ENTITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
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
                  setEntityFilter('');
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
            emptyMessage={loading ? 'Loading audit log…' : 'No audit entries match your filters.'}
            columns={[
              {
                key: 'createdAt',
                header: 'When',
                sortable: true,
                sortType: 'date',
                getSortValue: (e) => e.createdAt,
                render: (e) => (
                  <span className="whitespace-nowrap text-slate-700">
                    {formatDateDDMMYYYY(e.createdAt)}{' '}
                    <span className="text-slate-400">
                      {new Date(e.createdAt).toLocaleTimeString('en-MY', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                ),
              },
              {
                key: 'actor',
                header: 'Who',
                render: (e) => (
                  <div>
                    <p className="font-medium text-slate-900">{e.actorName ?? '—'}</p>
                    {e.actorRole && <p className="text-xs text-slate-500">{e.actorRole}</p>}
                  </div>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                sortable: true,
                sortType: 'text',
                getSortValue: (e) => e.action,
                render: (e) => (
                  <span className="font-medium text-slate-800">{formatAuditAction(e.action)}</span>
                ),
              },
              {
                key: 'entity',
                header: 'Entity',
                render: (e) => (
                  <div>
                    <p className="text-slate-700">{e.entityLabel ?? e.entityType}</p>
                    <p className="text-xs text-slate-500">{e.entityType}</p>
                  </div>
                ),
              },
              {
                key: 'details',
                header: 'Details',
                className: 'max-w-xs whitespace-normal',
                render: (e) => e.details ?? '—',
              },
            ]}
          />
        </CardContent>
      </Card>

      <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
        <History className="h-4 w-4" />
        {filtered.length} entr{filtered.length === 1 ? 'y' : 'ies'}
        {import.meta.env.VITE_USE_MOCK === 'true' ? ' (stored locally in demo mode)' : ''}
      </p>
    </div>
  );
}
