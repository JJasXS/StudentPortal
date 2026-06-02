import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { SearchBox } from '@/components/SearchBox';
import { DataTable } from '@/components/ui/DataTable';
import { StatusTabs } from '@/components/ui/StatusTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { classesApi } from '@/api/resources';
import { mockClasses } from '@/utils/mockData';
import { ACTIVE_STATUSES } from '@/utils/constants';
import { activeRecordStatus, filterByStatus, getStatusCounts } from '@/utils/statusFilter';
import type { ClassItem } from '@/types';

export default function ClassesManagement() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('All');

  useEffect(() => {
    classesApi.getAll().then(setClasses).catch(() => setClasses(mockClasses));
  }, []);

  const statusCounts = useMemo(
    () => getStatusCounts(classes, (c) => activeRecordStatus(c.isActive), ACTIVE_STATUSES),
    [classes]
  );

  const filtered = useMemo(() => {
    const byStatus = filterByStatus(classes, statusTab, (c) => activeRecordStatus(c.isActive));
    return byStatus.filter(
      (c) =>
        !search ||
        c.className.toLowerCase().includes(search.toLowerCase()) ||
        c.courseName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [classes, search, statusTab]);

  return (
    <div>
      <PageHeader title="Classes Management" description="Manage class schedules and assignments" />
      <Card>
        <CardContent className="space-y-4 p-4">
          <StatusTabs
            statuses={ACTIVE_STATUSES}
            value={statusTab}
            onChange={setStatusTab}
            counts={statusCounts}
          />
          <SearchBox value={search} onChange={setSearch} placeholder="Search classes..." />
          <DataTable
            data={filtered}
            columns={[
              { key: 'className', header: 'Class' },
              { key: 'courseName', header: 'Course' },
              { key: 'teacherName', header: 'Teacher' },
              { key: 'dayOfWeek', header: 'Day' },
              { key: 'startTime', header: 'Time', render: (c) => `${c.startTime} - ${c.endTime}` },
              { key: 'location', header: 'Location' },
              {
                key: 'enrolledCount',
                header: 'Enrolled',
                render: (c) => `${c.enrolledCount ?? 0}/${c.maxStudents}`,
              },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
