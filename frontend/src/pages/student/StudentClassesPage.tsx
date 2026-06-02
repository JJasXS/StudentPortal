import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTabs } from '@/components/ui/StatusTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { enrollmentsApi, classesApi } from '@/api/resources';
import { mockEnrollments, mockClasses } from '@/utils/mockData';
import { ENROLLMENT_STATUSES } from '@/utils/constants';
import { filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import type { Enrollment } from '@/types';

type EnrolledClassRow = Enrollment & { dayOfWeek?: string; time?: string; location?: string };

export default function StudentClassesPage() {
  const { user } = useAuth();
  const [data, setData] = useState<EnrolledClassRow[]>([]);
  const [statusTab, setStatusTab] = useState('All');

  useEffect(() => {
    Promise.all([
      enrollmentsApi.getAll().catch(() => mockEnrollments),
      classesApi.getAll().catch(() => mockClasses),
    ]).then(([enrollments, classes]) => {
      const mine = enrollments
        .filter((e) => e.studentUserId === user?.id)
        .map((e) => {
          const cls = classes.find((c) => c.id === e.classId);
          return {
            ...e,
            dayOfWeek: cls?.dayOfWeek,
            time: cls ? `${cls.startTime}-${cls.endTime}` : '',
            location: cls?.location,
          };
        });
      setData(mine);
    });
  }, [user?.id]);

  const statusCounts = useMemo(
    () => getStatusCounts(data, (e) => e.status, ENROLLMENT_STATUSES),
    [data]
  );

  const filtered = useMemo(
    () => filterByStatus(data, statusTab, (e) => e.status),
    [data, statusTab]
  );

  return (
    <div>
      <PageHeader title="My Classes" description="Your enrolled classes" />
      <Card>
        <CardContent className="space-y-4 p-4">
          <StatusTabs
            statuses={ENROLLMENT_STATUSES}
            value={statusTab}
            onChange={setStatusTab}
            counts={statusCounts}
          />
          <DataTable
            data={filtered}
            columns={[
              { key: 'className', header: 'Class' },
              { key: 'dayOfWeek', header: 'Day' },
              { key: 'time', header: 'Time' },
              { key: 'location', header: 'Location' },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
