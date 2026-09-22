import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { ClassPickerField } from '@/components/ClassPickerField';
import { Input, Label, Select } from '@/components/ui/Input';
import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { useToast } from '@/context/ToastContext';
import { sqlAccountApi, teachersApi } from '@/api/resources';
import type {
  SqlAccountChildEnrollment,
  SqlAccountCourseOption,
  SqlAccountParent,
} from '@/types/sqlAccount';
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

type Tab = 'assign' | 'enrollments';

type CalendarTeacher = {
  erpUserId: string;
  fullName: string;
  email: string;
  portalUserId?: string | null;
};

function addWeeksStr(weeks: number): string {
  return new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const WEEKDAYS = [
  { value: 'Monday', label: 'Mon' },
  { value: 'Tuesday', label: 'Tue' },
  { value: 'Wednesday', label: 'Wed' },
  { value: 'Thursday', label: 'Thu' },
  { value: 'Friday', label: 'Fri' },
  { value: 'Saturday', label: 'Sat' },
  { value: 'Sunday', label: 'Sun' },
] as const;

type AssignLineRow = {
  id: string;
  itemCode: string;
  teacherUserId: string;
  startDate: string;
  endDate: string;
  classDays: string[];
};

function newAssignLineRow(): AssignLineRow {
  const today = new Date().toISOString().slice(0, 10);
  return {
    id: crypto.randomUUID(),
    itemCode: '',
    teacherUserId: '',
    startDate: today,
    endDate: addWeeksStr(8),
    classDays: [],
  };
}

function resolveInitialTab(initialTab: string | undefined): Tab {
  if (initialTab === 'enrollments') return 'enrollments';
  // assign | schedule | children (legacy) | missing → assign
  return 'assign';
}

export default function AdminParentDetailPage() {
  const { customerCode = '' } = useParams<{ customerCode: string }>();
  const [searchParams] = useSearchParams();
  const initialBranch = searchParams.get('branch')?.trim() ?? '';
  const initialTab = searchParams.get('tab')?.trim();
  const decodedCode = decodeURIComponent(customerCode);
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';
  const { success: showSuccess, error: showError } = useToast();

  const [parent, setParent] = useState<SqlAccountParent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>(() => resolveInitialTab(initialTab));

  // Keep tab in sync when navigating with ?tab=… (e.g. Manage student → assign)
  useEffect(() => {
    setTab(resolveInitialTab(searchParams.get('tab')?.trim() ?? undefined));
  }, [searchParams]);

  const [assignBranch, setAssignBranch] = useState('');
  const [assignLines, setAssignLines] = useState<AssignLineRow[]>([newAssignLineRow()]);
  const [assignSaving, setAssignSaving] = useState(false);
  const [courseOptions, setCourseOptions] = useState<SqlAccountCourseOption[]>([]);
  const [courseOptionsLoading, setCourseOptionsLoading] = useState(false);
  const [erpTeachers, setErpTeachers] = useState<CalendarTeacher[]>([]);
  const [erpTeachersLoading, setErpTeachersLoading] = useState(false);

  const [enrollments, setEnrollments] = useState<SqlAccountChildEnrollment[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentBranch, setEnrollmentBranch] = useState('');

  const validAssignLines = useMemo(
    () =>
      assignLines.filter(
        (line) =>
          line.itemCode &&
          line.teacherUserId &&
          line.startDate &&
          line.endDate &&
          line.classDays.length > 0
      ),
    [assignLines]
  );

  const updateAssignLine = (id: string, patch: Partial<AssignLineRow>) => {
    setAssignLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const toggleClassDay = (id: string, day: string) => {
    setAssignLines((prev) =>
      prev.map((line) => {
        if (line.id !== id) return line;
        const has = line.classDays.includes(day);
        return {
          ...line,
          classDays: has ? line.classDays.filter((d) => d !== day) : [...line.classDays, day],
        };
      })
    );
  };

  const addAssignLine = () => setAssignLines((prev) => [...prev, newAssignLineRow()]);
  const removeAssignLine = (id: string) => {
    setAssignLines((prev) => (prev.length <= 1 ? prev : prev.filter((line) => line.id !== id)));
  };

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
        setError('Student not found.');
        return;
      }
      setParent(match);
      if (!assignBranch && match.children.length > 0) {
        const first = match.children[0].branchName;
        setAssignBranch(first);
        setEnrollmentBranch(first);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load parent.'));
      setParent(null);
    } finally {
      setLoading(false);
    }
  }, [decodedCode, isMock, assignBranch]);

  const loadAssignOptions = useCallback(async () => {
    if (isMock) return;
    setCourseOptionsLoading(true);
    setErpTeachersLoading(true);
    try {
      const [courses, teachers] = await Promise.all([
        sqlAccountApi.getCourseOptions(),
        teachersApi.getCalendarFilter(),
      ]);
      setCourseOptions(courses);
      setErpTeachers(teachers);
    } catch {
      setCourseOptions([]);
      setErpTeachers([]);
    } finally {
      setCourseOptionsLoading(false);
      setErpTeachersLoading(false);
    }
  }, [isMock]);

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
    if (!parent || !initialBranch) return;
    const match = parent.children.find(
      (c) => c.branchName.toLowerCase() === initialBranch.toLowerCase()
    );
    if (!match) return;
    setAssignBranch(match.branchName);
    setEnrollmentBranch(match.branchName);
  }, [parent, initialBranch]);

  useEffect(() => {
    if (tab === 'assign') void loadAssignOptions();
  }, [tab, loadAssignOptions]);

  useEffect(() => {
    if (tab === 'enrollments' && enrollmentBranch) void loadEnrollments(enrollmentBranch);
  }, [tab, enrollmentBranch, loadEnrollments]);

  const breadcrumbs = useMemo(
    () => [
      { label: 'Students', to: '/admin/students' },
      { label: parent?.parentName ?? decodedCode },
    ],
    [parent, decodedCode]
  );

  const handleAssignCourse = async () => {
    if (!parent || !assignBranch || validAssignLines.length === 0) return;
    setAssignSaving(true);
    try {
      await sqlAccountApi.assignChildEnrollment({
        customerCode: parent.customerCode,
        branchName: assignBranch,
        lines: validAssignLines.map((line) => ({
          itemCode: line.itemCode,
          teacherUserId: line.teacherUserId,
          startDate: line.startDate,
          endDate: line.endDate,
          classDays: line.classDays,
        })),
      });
      showSuccess('Course created successfully.');
      setEnrollmentBranch(assignBranch);
      await loadEnrollments(assignBranch);
      setAssignLines([newAssignLineRow()]);
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not assign course.'));
    } finally {
      setAssignSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Loading student…</p>;
  }

  if (!parent) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-red-600">{error || 'Student not found.'}</p>
        <Link to="/admin/students" className="text-primary-600 hover:underline">
          Back to students
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Breadcrumbs items={breadcrumbs} />

      <PageHeader
        title={parent.parentName}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/admin/students">
              <Button type="button" variant="outline" size="sm">
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                All students
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
          tabs={['assign', 'enrollments'] as const}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          labels={{
            assign: 'Assign course',
            enrollments: 'Enrollments',
          }}
        />

        <CardContent className="p-4 pt-4 sm:p-6 sm:pt-6">
          {tab === 'assign' && (
            <div className="space-y-3">
              {parent.children.length > 1 && (
                <div className="space-y-1">
                  <Label htmlFor="assignBranch">Branch</Label>
                  <Select
                    id="assignBranch"
                    value={assignBranch}
                    onChange={(e) => setAssignBranch(e.target.value)}
                    className="max-w-xs"
                  >
                    {parent.children.map((c) => (
                      <option key={c.branchName} value={c.branchName}>
                        {c.branchName}
                        {c.attention ? ` (${c.attention})` : ''}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="min-w-[18rem] px-3 py-3 font-medium">Class</th>
                      <th className="px-3 py-3 font-medium">Teacher</th>
                      <th className="px-3 py-3 font-medium">From</th>
                      <th className="px-3 py-3 font-medium">To</th>
                      <th className="px-3 py-3 pl-6 text-right font-medium">Days</th>
                      <th className="w-10 px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assignLines.map((line) => (
                      <tr key={line.id} className="align-top">
                        <td className="min-w-[18rem] px-3 py-3">
                          <ClassPickerField
                            options={courseOptions}
                            value={line.itemCode}
                            onChange={(itemCode) => updateAssignLine(line.id, { itemCode })}
                            disabled={courseOptionsLoading}
                            placeholder="Search class…"
                            className="w-full min-w-[18rem]"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <Select
                            value={line.teacherUserId}
                            onChange={(e) =>
                              updateAssignLine(line.id, { teacherUserId: e.target.value })
                            }
                            disabled={erpTeachersLoading}
                            className="min-w-[7rem] text-sm"
                          >
                            <option value="">Teacher…</option>
                            {erpTeachers.map((t) => (
                              <option
                                key={t.erpUserId}
                                value={t.portalUserId ?? ''}
                                disabled={!t.portalUserId}
                              >
                                {t.fullName}
                              </option>
                            ))}
                          </Select>
                        </td>
                        <td className="px-3 py-3">
                          <Input
                            type="date"
                            value={line.startDate}
                            onChange={(e) => updateAssignLine(line.id, { startDate: e.target.value })}
                            className="min-w-[8.5rem] text-sm"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <Input
                            type="date"
                            value={line.endDate}
                            onChange={(e) => updateAssignLine(line.id, { endDate: e.target.value })}
                            className="min-w-[8.5rem] text-sm"
                          />
                        </td>
                        <td className="px-3 py-3 pl-6">
                          <div className="ml-auto grid w-max grid-cols-4 gap-0.5">
                            {WEEKDAYS.map((day) => {
                              const active = line.classDays.includes(day.value);
                              return (
                                <button
                                  key={day.value}
                                  type="button"
                                  onClick={() => toggleClassDay(line.id, day.value)}
                                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                                    active
                                      ? 'bg-primary-600 text-white'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {day.label}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button
                            type="button"
                            className="rounded p-1 text-slate-400 hover:text-red-600 disabled:opacity-30"
                            disabled={assignLines.length <= 1}
                            onClick={() => removeAssignLine(line.id)}
                            aria-label="Remove line"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={addAssignLine}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add line
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={
                    assignSaving ||
                    !assignBranch ||
                    validAssignLines.length === 0 ||
                    isMock ||
                    courseOptionsLoading ||
                    erpTeachersLoading
                  }
                  onClick={() => void handleAssignCourse()}
                >
                  {assignSaving ? 'Creating…' : 'Create record'}
                </Button>
              </div>
              {isMock && (
                <p className="text-xs text-amber-700">Assign requires live API (not mock mode).</p>
              )}
            </div>
          )}

          {tab === 'enrollments' && (
            <div className="space-y-3">
              {parent.children.length > 1 && (
                <div className="flex flex-wrap items-end gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="enrollBranch">Branch</Label>
                    <Select
                      id="enrollBranch"
                      value={enrollmentBranch}
                      onChange={(e) => setEnrollmentBranch(e.target.value)}
                      className="w-40"
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
                    <RefreshCw className="mr-1 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              )}
              {parent.children.length <= 1 && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadEnrollments(enrollmentBranch)}
                  >
                    <RefreshCw className="mr-1 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              )}
              {enrollmentsLoading ? (
                <p className="text-sm text-slate-500">Loading enrollments…</p>
              ) : (
                <DataTable
                  embedded
                  data={enrollments}
                  emptyMessage={`No enrollments for ${enrollmentBranch}.`}
                  columns={[
                    {
                      key: 'className',
                      header: 'Class',
                      sortable: true,
                      sortType: 'text',
                      getSortValue: (e) => e.className ?? '',
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
                      key: 'classDate',
                      header: 'From',
                      render: (e) =>
                        e.classDate ? formatDateDDMMYYYY(e.classDate.slice(0, 10)) : '—',
                    },
                    {
                      key: 'deliveryDate',
                      header: 'To',
                      render: (e) =>
                        e.deliveryDate ? formatDateDDMMYYYY(e.deliveryDate.slice(0, 10)) : '—',
                    },
                    {
                      key: 'docNo',
                      header: 'SO',
                      render: (e) => e.docNo ?? '—',
                    },
                  ]}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
