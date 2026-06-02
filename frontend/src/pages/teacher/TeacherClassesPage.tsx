import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { TeacherClassCard } from '@/components/TeacherClassCard';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { classesApi } from '@/api/resources';
import { mockClasses } from '@/utils/mockData';
import { ACTIVE_STATUSES } from '@/utils/constants';
import { activeRecordStatus, filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import type { ClassItem } from '@/types';

const STATUS_TABS = ['All', ...ACTIVE_STATUSES] as const;

export default function TeacherClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [statusTab, setStatusTab] = useState('All');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    classesApi
      .getAll()
      .then((data) => setClasses(data.filter((c) => c.teacherUserId === user.id)))
      .catch(() => setClasses(mockClasses.filter((c) => c.teacherUserId === user.id)))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const statusCounts = useMemo(() => {
    const perStatus = getStatusCounts(
      classes,
      (c) => activeRecordStatus(c.isActive),
      ACTIVE_STATUSES
    );
    const total = ACTIVE_STATUSES.reduce((sum, st) => sum + (perStatus[st] ?? 0), 0);
    return { All: total, ...perStatus };
  }, [classes]);

  const filtered = useMemo(
    () => filterByStatus(classes, statusTab, (c) => activeRecordStatus(c.isActive)),
    [classes, statusTab]
  );

  return (
    <div>
      <PageHeader
        title="My Classes"
        description="Your teaching groups — open a class for sessions and attendance"
      />

      <Card>
        <CardContent className="p-0">
          <SlidingTabs
            tabs={STATUS_TABS}
            value={statusTab}
            onChange={setStatusTab}
            counts={statusCounts}
            trailing={`${filtered.length} class${filtered.length === 1 ? '' : 'es'}`}
          />

          <div className="p-4 sm:p-6">
            {loading ? (
              <p className="py-12 text-center text-sm text-slate-500">Loading your classes…</p>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
                <p className="font-medium text-slate-700">No classes here</p>
                <p className="mt-1 text-sm text-slate-500">
                  {statusTab === 'All'
                    ? 'No classes are assigned to you yet.'
                    : `No ${statusTab.toLowerCase()} classes.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((classItem) => (
                  <TeacherClassCard key={classItem.id} classItem={classItem} />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
