import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { SearchBox } from '@/components/SearchBox';
import { TeacherSessionCard } from '@/components/TeacherSessionCard';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { classSessionsApi, classesApi } from '@/api/resources';
import { mockClassSessions, mockClasses } from '@/utils/mockData';
import { SESSION_STATUSES } from '@/utils/constants';
import { filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import type { ClassItem, ClassSession } from '@/types';

const STATUS_TABS = ['All', ...SESSION_STATUSES] as const;

function sessionSortKey(s: ClassSession) {
  return `${s.sessionDate.slice(0, 10)}T${s.startTime}`;
}

export default function ClassSessionsPage() {
  const { user } = useAuth();
  const { classId } = useParams<{ classId: string }>();
  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [statusTab, setStatusTab] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !classId) return;
    setLoading(true);

    Promise.all([
      classSessionsApi.getAll().catch(() => mockClassSessions),
      classesApi.getAll().catch(() => mockClasses),
    ])
      .then(([sess, classes]) => {
        const cls =
          classes.find((c) => c.id === classId && c.teacherUserId === user.id) ??
          mockClasses.find((c) => c.id === classId && c.teacherUserId === user.id) ??
          null;

        setClassItem(cls);

        if (!cls) {
          setSessions([]);
          return;
        }

        setSessions(
          sess
            .filter((s) => s.classId === classId)
            .sort((a, b) => sessionSortKey(b).localeCompare(sessionSortKey(a)))
        );
      })
      .finally(() => setLoading(false));
  }, [user?.id, classId]);

  const filteredBySearch = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
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

  if (!classId) {
    return (
      <p className="text-center text-sm text-slate-500">
        Invalid link.{' '}
        <Link to="/teacher/classes" className="text-primary-600 hover:underline">
          Back to my classes
        </Link>
      </p>
    );
  }

  if (!loading && !classItem) {
    return (
      <div>
        <Breadcrumbs
          items={[
            { label: 'My Classes', to: '/teacher/classes' },
            { label: 'Class not found' },
          ]}
        />
        <p className="text-center text-sm text-slate-500">
          This class is not assigned to you.{' '}
          <Link to="/teacher/classes" className="text-primary-600 hover:underline">
            Back to my classes
          </Link>
        </p>
      </div>
    );
  }

  const breadcrumbs = [
    { label: 'My Classes', to: '/teacher/classes' },
    { label: classItem?.className ?? 'Sessions' },
  ];

  return (
    <div>
      <Breadcrumbs items={breadcrumbs} />

      <PageHeader
        title={classItem?.className ?? 'Class sessions'}
        description={
          classItem
            ? `${classItem.courseName ?? 'Class'} · ${classItem.dayOfWeek}, ${classItem.startTime} – ${classItem.endTime}`
            : 'Lesson sessions for this class'
        }
      />

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
            <SearchBox
              value={search}
              onChange={setSearch}
              placeholder="Search by topic or date..."
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
                    : 'No lesson sessions are scheduled for this class yet.'}
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
