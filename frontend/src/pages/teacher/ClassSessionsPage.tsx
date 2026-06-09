import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { SearchBox } from '@/components/SearchBox';
import { DataTable } from '@/components/ui/DataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { classSessionsApi, classesApi } from '@/api/resources';
import { mockClassSessions } from '@/utils/mockData';
import { SessionRowActions } from '@/components/teacher/SessionRowActions';
import { findTeacherClass, mergeClassSessions } from '@/utils/teacherClasses';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import type { ClassItem, ClassSession } from '@/types';

function sessionSortKey(s: ClassSession) {
  return `${s.sessionDate.slice(0, 10)}T${s.startTime}`;
}

export default function ClassSessionsPage() {
  const { user } = useAuth();
  const { classId } = useParams<{ classId: string }>();
  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id || !classId) return;
    setLoading(true);

    Promise.all([
      classSessionsApi.getAll().catch(() => mockClassSessions),
      classesApi.getAll().catch(() => []),
    ])
      .then(([sess, classes]) => {
        const cls = findTeacherClass(classes, classId, user);
        setClassItem(cls);

        if (!cls) {
          setSessions([]);
          return;
        }

        setSessions(
          mergeClassSessions(sess, classId).sort((a, b) =>
            sessionSortKey(b).localeCompare(sessionSortKey(a))
          )
        );
      })
      .finally(() => setLoading(false));
  }, [user?.id, classId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        (s.topic?.toLowerCase().includes(q) ?? false) ||
        s.sessionDate.slice(0, 10).includes(q)
    );
  }, [sessions, search]);

  const hasSearch = Boolean(search.trim());

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
            ? `${classItem.dayOfWeek}, ${classItem.startTime} – ${classItem.endTime} · Click the key icon to generate a check-in code`
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
            {hasSearch && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSearch('')}
                className="shrink-0 text-slate-600"
              >
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
            {!loading && sessions.length > 0 && (
              <span className="shrink-0 text-sm text-slate-500">
                {filtered.length} session{filtered.length === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {loading ? (
            <p className="py-12 text-center text-sm text-slate-500">Loading sessions…</p>
          ) : (
            <DataTable
              embedded
              data={filtered}
              emptyMessage={
                hasSearch
                  ? 'No sessions match your search.'
                  : 'No lesson sessions are scheduled for this class yet.'
              }
              columns={[
                {
                  key: 'sessionDate',
                  header: 'Date',
                  sortable: true,
                  sortType: 'date',
                  getSortValue: (s) => s.sessionDate,
                  render: (s) => (
                    <span className="tabular-nums text-slate-700">
                      {formatDateDDMMYYYY(s.sessionDate)}
                    </span>
                  ),
                },
                {
                  key: 'time',
                  header: 'Time',
                  render: (s) => (
                    <span className="tabular-nums text-slate-600">
                      {s.startTime} – {s.endTime}
                    </span>
                  ),
                },
                {
                  key: 'topic',
                  header: 'Topic',
                  sortable: true,
                  sortType: 'text',
                  getSortValue: (s) => s.topic ?? '',
                  className: 'max-w-md whitespace-normal',
                  render: (s) => (
                    <span className="font-medium text-slate-900" title={s.notes}>
                      {s.topic ?? '—'}
                    </span>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  className: 'w-36',
                  render: (s) => (
                    <SessionRowActions
                      session={s}
                      classDisplayName={classItem?.className}
                    />
                  ),
                },
              ]}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
