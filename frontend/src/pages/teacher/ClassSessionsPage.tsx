import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { TeacherSessionCard } from '@/components/TeacherSessionCard';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { classSessionsApi, classesApi } from '@/api/resources';
import { mockClassSessions, mockClasses } from '@/utils/mockData';
import { SESSION_STATUSES } from '@/utils/constants';
import { filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import type { ClassSession } from '@/types';

const STATUS_TABS = ['All', ...SESSION_STATUSES] as const;

function sessionSortKey(s: ClassSession) {
  return `${s.sessionDate.slice(0, 10)}T${s.startTime}`;
}

export default function ClassSessionsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [statusTab, setStatusTab] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    Promise.all([
      classSessionsApi.getAll().catch(() => mockClassSessions),
      classesApi.getAll().catch(() => mockClasses),
    ])
      .then(([sess, classes]) => {
        const myClassIds = classes.filter((c) => c.teacherUserId === user.id).map((c) => c.id);
        setSessions(
          sess
            .filter((s) => myClassIds.includes(s.classId))
            .sort((a, b) => sessionSortKey(b).localeCompare(sessionSortKey(a)))
        );
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const filteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        (s.className?.toLowerCase().includes(q) ?? false) ||
        (s.topic?.toLowerCase().includes(q) ?? false) ||
        s.sessionDate.slice(0, 10).includes(q) ||
        s.status.toLowerCase().includes(q)
    );
  }, [sessions, search]);

  const statusCounts = useMemo(() => {
    const perStatus = getStatusCounts(filteredBySearch, (s) => s.status, SESSION_STATUSES);
    const total = SESSION_STATUSES.reduce((sum, st) => sum + (perStatus[st] ?? 0), 0);
    return { All: total, ...perStatus };
  }, [filteredBySearch]);

  const filtered = useMemo(
    () => filterByStatus(filteredBySearch, statusTab, (s) => s.status),
    [filteredBySearch, statusTab]
  );

  const hasActiveFilters = Boolean(search.trim() || statusTab !== 'All');

  return (
    <div>
      <PageHeader
        title="Class Sessions"
        description="Lesson sessions for your classes — newest first"
      />

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search by class, topic, or date..."
              className="max-w-none flex-1"
            />
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setStatusTab('All');
                }}
                className="shrink-0 text-slate-600"
              >
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>

          <SlidingTabs
            tabs={STATUS_TABS}
            value={statusTab}
            onChange={setStatusTab}
            counts={statusCounts}
            trailing={`${filtered.length} session${filtered.length === 1 ? '' : 's'}`}
          />

          <div className="p-4 sm:p-6">
            {loading ? (
              <p className="py-12 text-center text-sm text-slate-500">Loading sessions…</p>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
                <p className="font-medium text-slate-700">No sessions found</p>
                <p className="mt-1 text-sm text-slate-500">
                  {hasActiveFilters
                    ? 'Try adjusting your search or status filter.'
                    : 'No lesson sessions are scheduled for your classes yet.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((session) => (
                  <TeacherSessionCard key={session.id} session={session} />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
