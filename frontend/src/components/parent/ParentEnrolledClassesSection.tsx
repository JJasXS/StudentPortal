import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Label, Select } from '@/components/ui/Input';
import { useSqlAccountChildEnrollments } from '@/hooks/useSqlAccountChildEnrollments';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import type { SqlAccountChild } from '@/types/sqlAccount';

interface ParentEnrolledClassesSectionProps {
  students: SqlAccountChild[];
}

function displayStudentName(child: SqlAccountChild) {
  return child.branchName?.trim() || child.attention?.trim() || 'Student';
}

export function ParentEnrolledClassesSection({ students }: ParentEnrolledClassesSectionProps) {
  const [selectedBranch, setSelectedBranch] = useState('');

  useEffect(() => {
    if (students.length === 0) {
      setSelectedBranch('');
      return;
    }
    setSelectedBranch((current) => {
      if (current && students.some((c) => c.branchName === current)) return current;
      return students[0]?.branchName ?? '';
    });
  }, [students]);

  const { enrollments, loading, error } = useSqlAccountChildEnrollments(
    selectedBranch || null,
    Boolean(selectedBranch)
  );

  const studentLabel = useMemo(() => {
    const match = students.find((c) => c.branchName === selectedBranch);
    return match ? displayStudentName(match) : selectedBranch;
  }, [students, selectedBranch]);

  if (students.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Classes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0">
        <div className="max-w-xs space-y-1">
          {students.length > 1 && (
            <>
              <Label htmlFor="dashboardStudentFilter">Student</Label>
              <Select
                id="dashboardStudentFilter"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                {students.map((child) => (
                  <option key={child.branchName} value={child.branchName}>
                    {displayStudentName(child)}
                  </option>
                ))}
              </Select>
            </>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading classes…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <DataTable
            embedded
            data={enrollments}
            emptyMessage={`No classes enrolled for ${studentLabel}.`}
            columns={[
              {
                key: 'className',
                header: 'Class',
                render: (e) => e.className ?? '—',
              },
              {
                key: 'conductedBy',
                header: 'Teacher',
                render: (e) => e.conductedBy ?? '—',
              },
              {
                key: 'schedule',
                header: 'Day / time',
                render: (e) =>
                  e.classDay && e.classTime
                    ? `${e.classDay} ${e.classTime}`
                    : e.classDay ?? '—',
              },
              {
                key: 'from',
                header: 'From',
                render: (e) =>
                  e.classDate ? formatDateDDMMYYYY(e.classDate.slice(0, 10)) : '—',
              },
            ]}
          />
        )}
      </CardContent>
    </Card>
  );
}
