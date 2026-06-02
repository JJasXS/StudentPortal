import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTabs } from '@/components/ui/StatusTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { parentsApi, enrollmentsApi } from '@/api/resources';
import { mockParents, mockEnrollments } from '@/utils/mockData';
import { ENROLLMENT_STATUSES } from '@/utils/constants';
import { filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import type { Enrollment } from '@/types';

export default function ChildClassesPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Enrollment[]>([]);
  const [statusTab, setStatusTab] = useState('All');

  useEffect(() => {
    Promise.all([
      parentsApi.getAll().catch(() => mockParents),
      enrollmentsApi.getAll().catch(() => mockEnrollments),
    ]).then(([parents, enrollments]) => {
      const parent = parents.find((p) => p.userId === user?.id);
      const childIds = parent?.children || [];
      setData(enrollments.filter((e) => childIds.includes(e.studentUserId)));
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
      <PageHeader title="Child Classes" description="Classes your children are enrolled in" />
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
              { key: 'studentName', header: 'Child' },
              { key: 'className', header: 'Class' },
              { key: 'enrollmentDate', header: 'Enrolled' },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
