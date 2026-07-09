import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { classesApi } from '@/api/resources';
import { mergeTeacherClasses, mockClassesForTeacher } from '@/utils/teacherClasses';
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
      .then((data) => setClasses(mergeTeacherClasses(data, user)))
      .catch(() => setClasses(mockClassesForTeacher(user)))
      .finally(() => setLoading(false));
  }, [user?.id]);

  return (
    <div>
      <PageHeader title="My Classes" description="Your teaching groups" />

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-4 py-12 text-center text-sm text-slate-500">Loading your classes…</p>
          ) : classes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
              <p className="font-medium text-slate-700">No classes here</p>
              <p className="mt-1 text-sm text-slate-500">No classes are assigned to you yet.</p>
            </div>
          ) : (
            <DataTable
              embedded
              data={classes}
              columns={[
                { key: 'className', header: 'Class', sortable: true, sortType: 'text' },
                {
                  key: 'courseName',
                  header: 'Course',
                  render: (c) => c.courseName ?? '—',
                },
                { key: 'dayOfWeek', header: 'Day' },
                {
                  key: 'time',
                  header: 'Time',
                  render: (c) => `${c.startTime} – ${c.endTime}`,
                },
                {
                  key: 'enrolled',
                  header: 'Enrolled',
                  render: (c) => `${c.enrolledCount ?? 0}/${c.maxStudents ?? '—'}`,
                },
                {
                  key: 'open',
                  header: '',
                  align: 'right',
                  render: (c) => (
                    <Link
                      to={`/teacher/classes/${c.id}`}
                      className="text-sm font-medium text-primary-600 hover:underline"
                    >
                      Open
                    </Link>
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
