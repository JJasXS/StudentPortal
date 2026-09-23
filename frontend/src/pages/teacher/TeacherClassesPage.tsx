import { useEffect, useMemo, useState } from 'react';
import { Music2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { TeacherClassCard } from '@/components/TeacherClassCard';
import { ClassFilterBar } from '@/components/teacher/ClassFilterBar';
import { calendarApi, classesApi } from '@/api/resources';
import {
  buildTeacherClassList,
  mockClassesForTeacher,
} from '@/utils/teacherClasses';
import {
  EMPTY_CLASS_FILTERS,
  filterTeacherClasses,
  type ClassFilterState,
} from '@/utils/teacherClassFilters';
import type { ClassItem } from '@/types';
import type { ErpCalendarEvent } from '@/types/sqlAccount';

export default function TeacherClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ClassFilterState>(EMPTY_CLASS_FILTERS);
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);

    if (isMock) {
      setClasses(mockClassesForTeacher(user));
      setLoading(false);
      return;
    }

    Promise.all([
      classesApi.getAll().catch(() => [] as ClassItem[]),
      calendarApi.getEvents().catch(() => [] as ErpCalendarEvent[]),
    ])
      .then(([portal, erp]) => setClasses(buildTeacherClassList(portal, erp, user)))
      .catch(() => setClasses(mockClassesForTeacher(user)))
      .finally(() => setLoading(false));
  }, [user, isMock]);

  const filtered = useMemo(
    () => filterTeacherClasses(classes, filters),
    [classes, filters]
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Classes"
        description="Manage and access your assigned classes."
        actions={
          !loading && classes.length > 0 ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
              {filtered.length === classes.length
                ? `${classes.length} class${classes.length === 1 ? '' : 'es'}`
                : `${filtered.length} of ${classes.length}`}
            </span>
          ) : undefined
        }
      />

      {!loading && classes.length > 0 && (
        <ClassFilterBar classes={classes} filters={filters} onChange={setFilters} />
      )}

      {loading ? (
        <p className="py-12 text-center text-sm text-slate-500">Loading your classes…</p>
      ) : classes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
            <Music2 className="h-6 w-6" />
          </span>
          <p className="mt-4 font-medium text-slate-700">No classes assigned yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Classes assigned to you will appear here.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-12 text-center">
          <p className="font-medium text-slate-700">No classes match your filters</p>
          <p className="mt-1 text-sm text-slate-500">Try clearing search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((c) => (
            <TeacherClassCard key={c.id} classItem={c} />
          ))}
        </div>
      )}
    </div>
  );
}
