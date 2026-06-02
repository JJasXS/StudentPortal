import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTabs } from '@/components/ui/StatusTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { parentsApi, attendanceApi } from '@/api/resources';
import { mockParents, mockAttendance } from '@/utils/mockData';
import { ATTENDANCE_STATUSES } from '@/utils/constants';
import { filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import type { Attendance } from '@/types';

export default function ChildAttendancePage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [statusTab, setStatusTab] = useState('All');

  useEffect(() => {
    Promise.all([
      parentsApi.getAll().catch(() => mockParents),
      attendanceApi.getAll().catch(() => mockAttendance),
    ]).then(([parents, records]) => {
      const parent = parents.find((p) => p.userId === user?.id);
      const childIds = parent?.children || [];
      setAttendance(records.filter((a) => childIds.includes(a.studentUserId)));
    });
  }, [user?.id]);

  const statusCounts = useMemo(
    () => getStatusCounts(attendance, (a) => a.status, ATTENDANCE_STATUSES),
    [attendance]
  );

  const filtered = useMemo(
    () => filterByStatus(attendance, statusTab, (a) => a.status),
    [attendance, statusTab]
  );

  return (
    <div>
      <PageHeader title="Child Attendance" description="Attendance records for your children" />
      <Card>
        <CardContent className="space-y-4 p-4">
          <StatusTabs
            statuses={ATTENDANCE_STATUSES}
            value={statusTab}
            onChange={setStatusTab}
            counts={statusCounts}
          />
          <DataTable
            data={filtered}
            columns={[
              { key: 'studentName', header: 'Child' },
              { key: 'sessionDate', header: 'Date' },
              { key: 'className', header: 'Class' },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
