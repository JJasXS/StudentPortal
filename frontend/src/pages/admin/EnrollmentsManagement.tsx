import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTabs } from '@/components/ui/StatusTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { enrollmentsApi } from '@/api/resources';
import { mockEnrollments } from '@/utils/mockData';
import { ENROLLMENT_STATUSES } from '@/utils/constants';
import { filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import type { Enrollment } from '@/types';

export default function EnrollmentsManagement() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('All');

  useEffect(() => {
    enrollmentsApi.getAll().then(setEnrollments).catch(() => setEnrollments(mockEnrollments));
  }, []);

  const statusCounts = useMemo(
    () => getStatusCounts(enrollments, (e) => e.status, ENROLLMENT_STATUSES),
    [enrollments]
  );

  const filtered = useMemo(() => {
    const byStatus = filterByStatus(enrollments, statusTab, (e) => e.status);
    return byStatus.filter(
      (e) =>
        !search ||
        e.studentName?.toLowerCase().includes(search.toLowerCase()) ||
        e.className?.toLowerCase().includes(search.toLowerCase())
    );
  }, [enrollments, search, statusTab]);

  return (
    <div>
      <PageHeader title="Enrollments Management" description="Manage student class enrollments" />
      <Card>
        <CardContent className="space-y-4 p-4">
          <StatusTabs
            statuses={ENROLLMENT_STATUSES}
            value={statusTab}
            onChange={setStatusTab}
            counts={statusCounts}
          />
          <SearchBox value={search} onChange={setSearch} placeholder="Search enrollments..." />
          <DataTable
            data={filtered}
            columns={[
              { key: 'studentName', header: 'Student' },
              { key: 'className', header: 'Class' },
              { key: 'enrollmentDate', header: 'Enrolled' },
            ]}
            emptyMessage={`No ${statusTab === 'All' ? '' : statusTab.toLowerCase() + ' '}enrollments found.`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
