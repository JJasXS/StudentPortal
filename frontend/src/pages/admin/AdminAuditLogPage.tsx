import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { History, X } from 'lucide-react';
import { SearchBox } from '@/components/SearchBox';
import { DataTable } from '@/components/ui/DataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { formatDateDDMMYYYY, formatTimeHHmm } from '@/utils/dateFormat';
import { formatAuditAction, loadAuditLogs, AUDIT_ACTION_LABELS } from '@/utils/auditLog';
import { AUDIT_ENTITY_TYPES, type AuditLogEntry } from '@/types/auditLog';

const ACTION_OPTIONS = [...new Set(Object.keys(AUDIT_ACTION_LABELS))].sort();

export default function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const refresh = useCallback(() => {
    setLoading(true);
    loadAuditLogs({
      search,
      action: actionFilter || undefined,
      entityType: entityTypeFilter || undefined,
      from: fromDate || undefined,
      to: toDate || undefined,
    })
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [search, actionFilter, entityTypeFilter, fromDate, toDate]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasFilters = Boolean(
    search.trim() || actionFilter || entityTypeFilter || fromDate || toDate
  );
  const records = useMemo(() => entries, [entries]);

  return (
    <div>
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:flex-wrap lg:items-end lg:gap-5">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search actor, event, entity, details…"
              className="max-w-none flex-1 lg:min-w-[260px]"
            />
            <div className="grid gap-4 sm:grid-cols-2 lg:flex lg:items-end lg:gap-4">
              <div className="sm:min-w-[160px]">
                <Label htmlFor="audit-entity">Entity</Label>
                <Select
                  id="audit-entity"
                  value={entityTypeFilter}
                  onChange={(e) => setEntityTypeFilter(e.target.value)}
                >
                  <option value="">All entities</option>
                  {AUDIT_ENTITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>
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
              <div className="min-w-0 sm:min-w-[10rem]">
                <Label htmlFor="audit-from">From</Label>
                <Input
                  id="audit-from"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </div>
              <div className="min-w-0 sm:min-w-[10rem]">
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
                  setEntityTypeFilter('');
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
            data={records}
            emptyMessage={
              loading
                ? 'Loading audit records…'
                : hasFilters
                  ? 'No audit records match your filters.'
                  : 'No audit records yet.'
            }
            columns={[
              {
                key: 'createdAt',
                header: 'When',
                sortable: true,
                sortType: 'date',
                colWidth: '11rem',
                getSortValue: (e) => e.createdAt,
                render: (e) => (
                  <span className="whitespace-nowrap font-mono text-xs tabular-nums text-slate-700">
                    {formatDateDDMMYYYY(e.createdAt)} {formatTimeHHmm(e.createdAt)}
                  </span>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                sortable: true,
                sortType: 'text',
                colWidth: '14rem',
                getSortValue: (e) => e.action,
                render: (e) => (
                  <span
                    className="block truncate text-sm font-medium text-slate-800"
                    title={e.action}
                  >
                    {formatAuditAction(e.action)}
                  </span>
                ),
              },
              {
                key: 'actor',
                header: 'Actor',
                colWidth: '12rem',
                render: (e) => (
                  <span className="block truncate text-sm text-slate-800" title={e.actorName}>
                    {e.actorName || '—'}
                    {e.actorRole ? (
                      <span className="text-slate-500"> · {e.actorRole}</span>
                    ) : null}
                  </span>
                ),
              },
              {
                key: 'entityType',
                header: 'Type',
                sortable: true,
                sortType: 'text',
                colWidth: '7.5rem',
                getSortValue: (e) => e.entityType,
                render: (e) => (
                  <span className="block truncate text-sm text-slate-700">
                    {e.entityType || '—'}
                  </span>
                ),
              },
              {
                key: 'entityLabel',
                header: 'Target',
                colWidth: '14rem',
                render: (e) => (
                  <span
                    className="block truncate text-sm font-medium text-slate-800"
                    title={e.entityLabel || e.entityId}
                  >
                    {e.entityLabel?.trim() || e.entityId || '—'}
                  </span>
                ),
              },
              {
                key: 'details',
                header: 'Details',
                render: (e) => (
                  <span
                    className="block truncate text-sm text-slate-600"
                    title={e.details?.trim() || undefined}
                  >
                    {e.details?.trim() || '—'}
                  </span>
                ),
              },
            ]}
          />

          {!loading && (
            <div className="flex items-center gap-2 border-t border-slate-200 px-5 py-3 text-sm text-slate-500">
              <History className="h-4 w-4 shrink-0" />
              {records.length} record{records.length === 1 ? '' : 's'}
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && records.length === 0 && !hasFilters && (
        <p className="mt-4 text-center text-sm text-slate-600">
          Actions like creating{' '}
          <Link to="/admin/announcements" className="font-medium text-primary-600 hover:underline">
            announcements
          </Link>{' '}
          or editing students appear here as one row each.
        </p>
      )}
    </div>
  );
}
