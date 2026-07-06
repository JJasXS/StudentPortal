import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Plus, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { SqlAccountChildEnrollmentsList } from '@/components/parent/SqlAccountChildEnrollmentsList';
import { useToast } from '@/context/ToastContext';
import { sqlAccountApi, teachersApi } from '@/api/resources';
import type {
  SqlAccountCalendarTeacher,
  SqlAccountChildEnrollment,
  SqlAccountCourseOption,
  SqlAccountParent,
} from '@/types/sqlAccount';
import type { TeacherProfile } from '@/types';
import { getApiErrorMessage } from '@/utils/apiError';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';

const mockParents: SqlAccountParent[] = [
  {
    customerCode: '300-P0001',
    parentName: 'Demo Parent',
    parentEmail: 'parent@gmail.com',
    children: [
      { branchName: 'dawg', attention: 'Dawg', email: null, phone: null },
      { branchName: 'son', attention: 'Son', email: null, phone: null },
      { branchName: 'wacc', attention: 'Wacc', email: null, phone: null },
    ],
  },
];

type Tab = 'children' | 'assign' | 'enrollments';

type AssignTeacherOption = {
  userId: string;
  fullName: string;
};

function addWeeksStr(weeks: number): string {
  return new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function mapCalendarTeachers(teachers: SqlAccountCalendarTeacher[]): AssignTeacherOption[] {
  return teachers
    .filter((t) => t.portalUserId)
    .map((t) => ({ userId: t.portalUserId!, fullName: t.fullName }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

function mapPortalTeachers(teachers: TeacherProfile[]): AssignTeacherOption[] {
  return teachers
    .filter((t) => t.isActive !== false)
    .map((t) => ({ userId: t.userId, fullName: t.fullName }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}

export default function AdminParentDetailPage() {
  const { customerCode = '' } = useParams<{ customerCode: string }>();
  const decodedCode = decodeURIComponent(customerCode);
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';
  const { success: showSuccess, error: showError } = useToast();

  const [parent, setParent] = useState<SqlAccountParent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('children');
  const [courses, setCourses] = useState<SqlAccountCourseOption[]>([]);
  const [teachers, setTeachers] = useState<AssignTeacherOption[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedTeacherUserId, setSelectedTeacherUserId] = useState('');
  const [selectedItemCode, setSelectedItemCode] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(addWeeksStr(8));
  const [assigning, setAssigning] = useState(false);
  const [enrollments, setEnrollments] = useState<SqlAccountChildEnrollment[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentBranch, setEnrollmentBranch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const parents = isMock ? mockParents : await sqlAccountApi.getParentChildren();
      const match = parents.find(
        (p) => p.customerCode.toLowerCase() === decodedCode.toLowerCase()
      );
      if (!match) {
        setParent(null);
        setError('Parent not found.');
        return;
      }
      setParent(match);
      if (!selectedBranch && match.children.length > 0) {
        setSelectedBranch(match.children[0].branchName);
        setEnrollmentBranch(match.children[0].branchName);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load parent.'));
      setParent(null);
    } finally {
      setLoading(false);
    }
  }, [decodedCode, isMock, selectedBranch]);

  const loadAssignOptions = useCallback(async () => {
    if (isMock) return;
    try {
      const [courseData, calendarTeachers] = await Promise.all([
        sqlAccountApi.getCourseOptions(),
        teachersApi.getCalendarFilter().catch(() => [] as SqlAccountCalendarTeacher[]),
      ]);

      setCourses(courseData);
      if (courseData.length > 0 && !selectedItemCode) {
        setSelectedItemCode(courseData[0].itemCode);
      }

      let teacherOptions = mapCalendarTeachers(calendarTeachers);
      if (teacherOptions.length === 0) {
        const portalTeachers = await teachersApi.getAll();
        teacherOptions = mapPortalTeachers(portalTeachers);
      }
      setTeachers(teacherOptions);
      if (teacherOptions.length > 0 && !selectedTeacherUserId) {
        setSelectedTeacherUserId(teacherOptions[0].userId);
      }
    } catch {
      setCourses([]);
      setTeachers([]);
    }
  }, [isMock, selectedItemCode, selectedTeacherUserId]);

  const loadEnrollments = useCallback(async (branch: string) => {
    if (!branch || isMock) return;
    setEnrollmentsLoading(true);
    try {
      const data = await sqlAccountApi.getChildEnrollments(decodedCode, branch);
      setEnrollments(data.enrollments);
    } catch {
      setEnrollments([]);
    } finally {
      setEnrollmentsLoading(false);
    }
  }, [decodedCode, isMock]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tab === 'assign' || tab === 'enrollments') void loadAssignOptions();
  }, [tab, loadAssignOptions]);

  useEffect(() => {
    if (tab === 'enrollments' && enrollmentBranch) void loadEnrollments(enrollmentBranch);
  }, [tab, enrollmentBranch, loadEnrollments]);

  const breadcrumbs = useMemo(
    () => [
      { label: 'Parents', to: '/admin/parents' },
      { label: parent?.parentName ?? decodedCode },
    ],
    [parent, decodedCode]
  );

  const selectedItemMeta = courses.find((c) => c.itemCode === selectedItemCode);

  const handleAssign = async () => {
    if (!parent || !selectedBranch || !selectedItemCode || !selectedTeacherUserId) return;
    setAssigning(true);
    try {
      await sqlAccountApi.assignChildEnrollment({
        customerCode: parent.customerCode,
        branchName: selectedBranch,
        itemCode: selectedItemCode,
        startDate,
        endDate,
        teacherUserId: selectedTeacherUserId,
      });
      showSuccess('Course assigned — calendar sessions will sync from the date range.');
      setTab('enrollments');
      setEnrollmentBranch(selectedBranch);
      await loadEnrollments(selectedBranch);
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not assign course.'));
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading parent…</p>;
  }

  if (!parent) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{error || 'Parent not found.'}</p>
        <Link to="/admin/parents" className="text-primary-600 hover:underline">
          Back to parents
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbs} />

      <PageHeader
        title={parent.parentName}
        description={`Customer ${parent.customerCode}${parent.parentEmail ? ` · ${parent.parentEmail}` : ''}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/admin/parents">
              <Button type="button" variant="outline" size="sm">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                All parents
              </Button>
            </Link>
            <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      />

      <Card>
        <SlidingTabs
          tabs={['children', 'assign', 'enrollments'] as const}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          labels={{
            children: 'Children',
            assign: 'Assign course',
            enrollments: 'Enrollments',
          }}
        />

        <CardContent className="p-6">
          {tab === 'children' && (
            <>
              <p className="mb-4 text-sm text-slate-500">
                {parent.children.length} {parent.children.length === 1 ? 'child' : 'children'} linked
                in SQL Account (BRANCHNAME)
              </p>
              {parent.children.length === 0 ? (
                <p className="text-sm text-slate-500">No branch names found.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-medium">Branch name</th>
                        <th className="px-4 py-3 font-medium">Attention</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Phone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parent.children.map((child, index) => (
                        <tr key={`${child.branchName}-${index}`} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">{child.branchName}</td>
                          <td className="px-4 py-3 text-slate-600">{child.attention || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{child.email || '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{child.phone || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {tab === 'assign' && (
            <div className="mx-auto max-w-lg space-y-4">
              <p className="text-sm text-slate-600">
                Creates a SQL Account sales order (<code className="text-xs">POST /salesorder</code>) with class
                UDF fields. Pick child, ERP teacher, and ST_ITEM class; schedule comes from the item-code link.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="assignBranch">Child (branch)</Label>
                <Select
                  id="assignBranch"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                >
                  {parent.children.map((c) => (
                    <option key={c.branchName} value={c.branchName}>
                      {c.branchName}
                      {c.attention ? ` (${c.attention})` : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assignTeacher">Teacher</Label>
                <Select
                  id="assignTeacher"
                  value={selectedTeacherUserId}
                  onChange={(e) => setSelectedTeacherUserId(e.target.value)}
                >
                  {teachers.length === 0 ? (
                    <option value="">No teachers available</option>
                  ) : (
                    teachers.map((t) => (
                      <option key={t.userId} value={t.userId}>
                        {t.fullName}
                      </option>
                    ))
                  )}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assignItemCode">Class</Label>
                <Select
                  id="assignItemCode"
                  value={selectedItemCode}
                  onChange={(e) => setSelectedItemCode(e.target.value)}
                >
                  {courses.length === 0 ? (
                    <option value="">No items in ST_ITEM</option>
                  ) : (
                    courses.map((c) => (
                      <option key={c.itemCode} value={c.itemCode}>
                        {c.description}
                      </option>
                    ))
                  )}
                </Select>
                {selectedItemMeta && (
                  <p className="text-xs text-slate-500">
                    Schedule: {selectedItemMeta.dayOfWeek} {selectedItemMeta.startTime}–
                    {selectedItemMeta.endTime}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">From date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endDate">To date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="button"
                disabled={
                  assigning ||
                  !selectedBranch ||
                  !selectedTeacherUserId ||
                  !selectedItemCode ||
                  isMock
                }
                onClick={() => void handleAssign()}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {assigning ? 'Assigning…' : 'Assign course'}
              </Button>
              {isMock && (
                <p className="text-xs text-amber-700">Course assignment requires live API (not mock mode).</p>
              )}
            </div>
          )}

          {tab === 'enrollments' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="enrollBranch">Child</Label>
                  <Select
                    id="enrollBranch"
                    value={enrollmentBranch}
                    onChange={(e) => setEnrollmentBranch(e.target.value)}
                    className="w-48"
                  >
                    {parent.children.map((c) => (
                      <option key={c.branchName} value={c.branchName}>
                        {c.branchName}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => void loadEnrollments(enrollmentBranch)}
                >
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                  Refresh
                </Button>
              </div>
              <SqlAccountChildEnrollmentsList
                branchName={enrollmentBranch}
                enrollments={enrollments}
                loading={enrollmentsLoading}
              />
              {enrollments.length > 0 && (
                <Card className="border-slate-100 bg-slate-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <BookOpen className="h-4 w-4" />
                      ERP line keys (for leave/homework APIs)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-slate-600">
                    {enrollments.map((e) => (
                      <div key={`${e.docKey}-${e.seq}`}>
                        {e.className}: docKey {e.docKey}, seq {e.seq}
                        {e.classDate && ` · from ${formatDateDDMMYYYY(e.classDate.slice(0, 10))}`}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
