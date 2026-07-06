import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ChevronDown, ChevronRight, Database, Link2, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { classesApi, sqlAccountApi } from '@/api/resources';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import type { ClassItem } from '@/types';
import type { ItemCodeClassLink, SqlAccountParent, SqlAccountStatus } from '@/types/sqlAccount';
import { cn } from '@/utils/cn';
import { getApiErrorMessage } from '@/utils/apiError';

export default function SqlAccountCustomersPage() {
  const [parents, setParents] = useState<SqlAccountParent[]>([]);
  const [status, setStatus] = useState<SqlAccountStatus | null>(null);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [itemCodeLinks, setItemCodeLinks] = useState<ItemCodeClassLink[]>([]);
  const [portalClasses, setPortalClasses] = useState<ClassItem[]>([]);
  const [linksLoading, setLinksLoading] = useState(true);
  const [linksError, setLinksError] = useState('');
  const [newItemCode, setNewItemCode] = useState('');
  const [newPortalClassId, setNewPortalClassId] = useState('');
  const [addingLink, setAddingLink] = useState(false);

  const loadLinks = useCallback(async () => {
    setLinksLoading(true);
    setLinksError('');
    try {
      const [links, classes] = await Promise.all([
        sqlAccountApi.getItemCodeLinks(),
        classesApi.getAll(),
      ]);
      setItemCodeLinks(links);
      setPortalClasses(classes.filter((c) => c.isActive));
    } catch (err) {
      setLinksError(getApiErrorMessage(err, 'Could not load item code mappings.'));
      setItemCodeLinks([]);
    } finally {
      setLinksLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const statusResult = await sqlAccountApi.getStatus();
      setStatus(statusResult);

      if (!statusResult.configured) {
        setParents([]);
        setExpanded(new Set());
        return;
      }

      const parentResult = await sqlAccountApi.getParentChildren();
      setParents(parentResult);
      setExpanded(new Set(parentResult.map((p) => p.customerCode || p.parentName)));
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        (err instanceof Error
          ? err.message
          : 'Could not load SQL Account customers. Check API keys and restart the backend.');
      setError(message);
      setParents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  const handleAddLink = async () => {
    const itemCode = newItemCode.trim();
    if (!itemCode || !newPortalClassId) return;

    setAddingLink(true);
    setLinksError('');
    try {
      const link = await sqlAccountApi.createItemCodeLink({
        itemCode,
        portalClassId: newPortalClassId,
      });
      setItemCodeLinks((current) =>
        [...current, link].sort((a, b) => a.itemCode.localeCompare(b.itemCode))
      );
      setNewItemCode('');
      setNewPortalClassId('');
    } catch (err) {
      setLinksError(getApiErrorMessage(err, 'Could not create mapping.'));
    } finally {
      setAddingLink(false);
    }
  };

  const handleDeleteLink = async (id: string) => {
    setLinksError('');
    try {
      await sqlAccountApi.deleteItemCodeLink(id);
      setItemCodeLinks((current) => current.filter((link) => link.id !== id));
    } catch (err) {
      setLinksError(getApiErrorMessage(err, 'Could not delete mapping.'));
    }
  };

  const filteredParents = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return parents;

    return parents.filter((parent) => {
      const parentMatch =
        parent.parentName.toLowerCase().includes(term) ||
        parent.customerCode.toLowerCase().includes(term) ||
        (parent.parentEmail?.toLowerCase().includes(term) ?? false);
      const childMatch = parent.children.some(
        (child) =>
          child.branchName.toLowerCase().includes(term) ||
          (child.email?.toLowerCase().includes(term) ?? false) ||
          (child.phone?.toLowerCase().includes(term) ?? false)
      );
      return parentMatch || childMatch;
    });
  }, [parents, search]);

  const totalChildren = useMemo(
    () => filteredParents.reduce((sum, parent) => sum + parent.children.length, 0),
    [filteredParents]
  );

  const toggleExpanded = (key: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const parentKey = (parent: SqlAccountParent) => parent.customerCode || parent.parentName;

  return (
    <div>
      <PageHeader
        title="SQL Account Customers"
        description="Read-only view of AR_CUSTOMER — parent (COMPANYNAME), parent login (udf_email), children (BRANCHNAME)."
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

      {status && (
        <Card className="mb-4">
          <CardContent className="flex flex-wrap items-center gap-4 py-4 text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-slate-400" />
              <span>
                {status.databasePath ? status.databasePath : 'SQL Account database'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex h-2 w-2 rounded-full',
                  status.configured && status.connected ? 'bg-emerald-500' : 'bg-amber-500'
                )}
              />
              {!status.configured
                ? 'Not configured — set SqlAccount__AccessKey and SqlAccount__SecretKey in .env'
                : status.connected
                  ? 'Connected to SQL Account API'
                  : 'Configured but connection failed — check Service and Region in .env'}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="flex items-start gap-3 py-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search parent, udf_email, child, code, email, or phone..."
          className="max-w-md"
        />
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Users className="h-4 w-4" />
          {loading
            ? 'Loading...'
            : `${filteredParents.length} parents · ${totalChildren} children`}
        </div>
      </div>

      <Card>
        <CardContent className="divide-y divide-slate-100 p-0">
          {loading ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">Loading customers...</div>
          ) : filteredParents.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              {search ? 'No parents or children match your search.' : 'No SQL Account customers found.'}
            </div>
          ) : (
            filteredParents.map((parent) => {
              const key = parentKey(parent);
              const isOpen = expanded.has(key);
              return (
                <div key={key}>
                  <button
                    type="button"
                    onClick={() => toggleExpanded(key)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 sm:px-6"
                  >
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900">{parent.parentName}</div>
                      <div className="text-xs text-slate-500">
                        Customer code: {parent.customerCode || '—'}
                        {parent.parentEmail ? ` · Login: ${parent.parentEmail}` : ''}
                        {' · '}
                        {parent.children.length} {parent.children.length === 1 ? 'child' : 'children'}
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="bg-slate-50/80 px-4 pb-3 sm:px-6 sm:pl-14">
                      {parent.children.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
                          No branch names found for this parent.
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                          <table className="min-w-full text-sm">
                            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                              <tr>
                                <th className="px-4 py-2 font-medium">Child (BRANCHNAME)</th>
                                <th className="px-4 py-2 font-medium">Attention</th>
                                <th className="px-4 py-2 font-medium">Email</th>
                                <th className="px-4 py-2 font-medium">Phone</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {parent.children.map((child, index) => (
                                <tr key={`${child.branchName}-${index}`}>
                                  <td className="px-4 py-2 font-medium text-slate-900">
                                    {child.branchName || '—'}
                                  </td>
                                  <td className="px-4 py-2 text-slate-600">{child.attention || '—'}</td>
                                  <td className="px-4 py-2 text-slate-600">{child.email || '—'}</td>
                                  <td className="px-4 py-2 text-slate-600">{child.phone || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="p-0">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <Link2 className="h-4 w-4 text-primary-600" />
                  Item code → portal class mappings
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Link SQL Account ITEMCODE values to portal classes so parents see live schedules.
                  Stored in the portal database only — no ERP writes.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void loadLinks()} disabled={linksLoading}>
                <RefreshCw className={cn('mr-1.5 h-4 w-4', linksLoading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>

          {linksError && (
            <div className="border-b border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 sm:px-6">
              {linksError}
            </div>
          )}

          <div className="grid gap-4 border-b border-slate-100 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-end sm:px-6">
            <div>
              <Label htmlFor="newItemCode">ITEMCODE</Label>
              <Input
                id="newItemCode"
                value={newItemCode}
                onChange={(e) => setNewItemCode(e.target.value)}
                placeholder="e.g. PIANO-MON-AM"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="newPortalClass">Portal class</Label>
              <Select
                id="newPortalClass"
                value={newPortalClassId}
                onChange={(e) => setNewPortalClassId(e.target.value)}
                className="mt-1"
              >
                <option value="">Select a class…</option>
                {portalClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.className}
                    {cls.dayOfWeek ? ` (${cls.dayOfWeek})` : ''}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              onClick={() => void handleAddLink()}
              disabled={addingLink || !newItemCode.trim() || !newPortalClassId}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add mapping
            </Button>
          </div>

          <div className="overflow-x-auto">
            {linksLoading ? (
              <div className="px-6 py-8 text-center text-sm text-slate-500">Loading mappings…</div>
            ) : itemCodeLinks.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-slate-500">
                No item code mappings yet. Add one above to connect ERP sales order lines to portal classes.
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium sm:px-6">ITEMCODE</th>
                    <th className="px-4 py-2 font-medium">Portal class</th>
                    <th className="px-4 py-2 font-medium">Created</th>
                    <th className="px-4 py-2 font-medium sm:px-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itemCodeLinks.map((link) => (
                    <tr key={link.id}>
                      <td className="px-4 py-2 font-mono text-sm font-medium text-slate-900 sm:px-6">
                        {link.itemCode}
                      </td>
                      <td className="px-4 py-2 text-slate-700">{link.portalClassName ?? link.portalClassId}</td>
                      <td className="px-4 py-2 text-slate-600">
                        {link.createdAt ? new Date(link.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-2 text-right sm:px-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => void handleDeleteLink(link.id)}
                          aria-label={`Delete mapping for ${link.itemCode}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
