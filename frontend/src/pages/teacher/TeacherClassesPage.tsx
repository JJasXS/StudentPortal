import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { TeacherClassCard } from '@/components/TeacherClassCard';
import { Card, CardContent } from '@/components/ui/Card';
import { classesApi } from '@/api/resources';
import { mockClasses } from '@/utils/mockData';
import type { ClassItem } from '@/types';

export default function TeacherClassesPage() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClassItem[]>([]);
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

  const countLabel = `${classes.length} class${classes.length === 1 ? '' : 'es'}`;

  return (
    <div>
      <PageHeader
        title="My Classes"
        description={`Your teaching groups — open a class for sessions and attendance · ${countLabel}`}
      />

      <Card>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <p className="py-12 text-center text-sm text-slate-500">Loading your classes…</p>
          ) : classes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
              <p className="font-medium text-slate-700">No classes here</p>
              <p className="mt-1 text-sm text-slate-500">No classes are assigned to you yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {classes.map((classItem) => (
                <TeacherClassCard key={classItem.id} classItem={classItem} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
