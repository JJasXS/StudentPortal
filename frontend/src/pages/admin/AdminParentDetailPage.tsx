import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Plus, RefreshCw, Save, Trash2 } from 'lucide-react';
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

type Tab = 'children' | 'assign' | 'schedule' | 'enrollments';

type CalendarTeacher = {
  erpUserId: string;
  fullName: string;
  email: string;
  portalUserId?: string | null;
};

function addWeeksStr(weeks: number): string {
  return new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function enrollmentKey(e: SqlAccountChildEnrollment): string {
  return `${e.docKey}-${e.seq}`;
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
  const [tab, setTab] = useState<Tab>(() => {
    if (initialTab === 'assign' || initialTab === 'schedule' || initialTab === 'enrollments' || initialTab === 'children') {
      return initialTab;
    }
    return initialBranch ? 'assign' : 'children';
  });

  const [assignBranch, setAssignBranch] = useState('');
  const [assignLines, setAssignLines] = useState<AssignLineRow[]>([newAssignLineRow()]);
  const [classFilter, setClassFilter] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);
  const [courseOptions, setCourseOptions] = useState<SqlAccountCourseOption[]>([]);
  const [courseOptionsLoading, setCourseOptionsLoading] = useState(false);
  const [erpTeachers, setErpTeachers] = useState<CalendarTeacher[]>([]);
  const [erpTeachersLoading, setErpTeachersLoading] = useState(false);

  const [scheduleBranch, setScheduleBranch] = useState('');
  const [selectedEnrollmentKey, setSelectedEnrollmentKey] = useState('');
  const [scheduleStartDate, setScheduleStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [scheduleEndDate, setScheduleEndDate] = useState(addWeeksStr(8));
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleEnrollments, setScheduleEnrollments] = useState<SqlAccountChildEnrollment[]>([]);
  const [scheduleEnrollmentsLoading, setScheduleEnrollmentsLoading] = useState(false);

  const [enrollments, setEnrollments] = useState<SqlAccountChildEnrollment[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [enrollmentBranch, setEnrollmentBranch] = useState('');

  const filteredCourseOptions = useMemo(() => {
    const q = classFilter.trim().toLowerCase();
    if (!q) return courseOptions;
    return courseOptions.filter(
      (c) =>
        c.itemCode.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [courseOptions, classFilter]);

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

  const addAssignLine = () => {
    setAssignLines((prev) => [...prev, newAssignLineRow()]);
  };

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
        setError('Parent not found.');
        return;
      }
      setParent(match);
      if (!assignBranch && match.children.length > 0) {
        const first = match.children[0].branchName;
        setAssignBranch(first);
        setScheduleBranch(first);
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

  const loadScheduleEnrollments = useCallback(async (branch: string) => {
    if (!branch || isMock) return;
    setScheduleEnrollmentsLoading(true);
    try {
      const data = await sqlAccountApi.getChildEnrollments(decodedCode, branch);
      setScheduleEnrollments(data.enrollments);
    } catch {
      setScheduleEnrollments([]);
    } finally {
      setScheduleEnrollmentsLoading(false);
    }
  }, [decodedCode, isMock]);

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
    setScheduleBranch(match.branchName);
    setEnrollmentBranch(match.branchName);
  }, [parent, initialBranch]);

  useEffect(() => {
    if (tab === 'assign') void loadAssignOptions();
  }, [tab, loadAssignOptions]);

  useEffect(() => {
    if (tab === 'schedule' && scheduleBranch) void loadScheduleEnrollments(scheduleBranch);
  }, [tab, scheduleBranch, loadScheduleEnrollments]);

  useEffect(() => {
    if (tab === 'enrollments' && enrollmentBranch) void loadEnrollments(enrollmentBranch);
  }, [tab, enrollmentBranch, loadEnrollments]);

  useEffect(() => {
    if (scheduleEnrollments.length === 0) {
      setSelectedEnrollmentKey('');
      return;
    }
    const stillValid = scheduleEnrollments.some((e) => enrollmentKey(e) === selectedEnrollmentKey);
    if (!stillValid) setSelectedEnrollmentKey(enrollmentKey(scheduleEnrollments[0]));
  }, [scheduleEnrollments, selectedEnrollmentKey]);

  const selectedEnrollment = scheduleEnrollments.find(
    (e) => enrollmentKey(e) === selectedEnrollmentKey
  );

  useEffect(() => {
    if (!selectedEnrollment) return;
    if (selectedEnrollment.classDate) {
      setScheduleStartDate(selectedEnrollment.classDate.slice(0, 10));
    }
    if (selectedEnrollment.deliveryDate) {
      setScheduleEndDate(selectedEnrollment.deliveryDate.slice(0, 10));
    }
  }, [selectedEnrollment]);

  const breadcrumbs = useMemo(
    () => [
      { label: 'Students', to: '/admin/parents' },
      { label: parent?.parentName ?? decodedCode },
    ],
    [parent, decodedCode]
  );

  const handleAssignCourse = async () => {
    if (!parent || !assignBranch || validAssignLines.length === 0) return;
    setAssignSaving(true);
    try {
      const result = await sqlAccountApi.assignChildEnrollment({
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
      const lineCount = result.lineCount ?? validAssignLines.length;
      showSuccess(
        `Sales order ${result.docNo} created with ${lineCount} line${lineCount === 1 ? '' : 's'} — calendar will sync.`
      );
      setEnrollmentBranch(assignBranch);
      await loadEnrollments(assignBranch);
      if (scheduleBranch === assignBranch) {
        await loadScheduleEnrollments(assignBranch);
      }
      setAssignLines([newAssignLineRow()]);
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not assign course.'));
    } finally {
      setAssignSaving(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!parent || !scheduleBranch || !selectedEnrollment) return;
    setScheduleSaving(true);
    try {
      await sqlAccountApi.updateEnrollmentSchedule(selectedEnrollment.docKey, selectedEnrollment.seq, {
        customerCode: parent.customerCode,
        branchName: scheduleBranch,
        startDate: scheduleStartDate,
        endDate: scheduleEndDate,
      });
      showSuccess('Schedule dates saved — calendar sessions will sync.');
      await loadScheduleEnrollments(scheduleBranch);
      if (enrollmentBranch === scheduleBranch) {
        await loadEnrollments(scheduleBranch);
      }
    } catch (err) {
      showError(getApiErrorMessage(err, 'Could not save schedule dates.'));
    } finally {
      setScheduleSaving(false);
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
          tabs={['children', 'assign', 'schedule', 'enrollments'] as const}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          labels={{
            children: 'Children',
            assign: 'Assign course',
            schedule: 'Schedule dates',
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
            <div className="mx-auto max-w-5xl space-y-4">
              <p className="text-sm text-slate-600">
                One sales order per child. Each row is a class + teacher with its own date range and
                weekdays — sessions repeat on those days from start to end.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="assignBranch">Child (branch)</Label>
                <Select
                  id="assignBranch"
                  value={assignBranch}
                  onChange={(e) => setAssignBranch(e.target.value)}
                >
                  {parent.children.map((c) => (
                    <option key={c.branchName} value={c.branchName}>
                      {c.branchName}
                      {c.attention ? ` (${c.attention})` : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <Label htmlFor="classFilter">Course lines</Label>
                  <Input
                    id="classFilter"
                    type="search"
                    placeholder="Filter classes…"
                    value={classFilter}
                    onChange={(e) => setClassFilter(e.target.value)}
                    disabled={courseOptionsLoading}
                    className="max-w-xs"
                  />
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5 font-medium">Class</th>
                        <th className="px-3 py-2.5 font-medium">Teacher</th>
                        <th className="px-3 py-2.5 font-medium">From</th>
                        <th className="px-3 py-2.5 font-medium">To</th>
                        <th className="px-3 py-2.5 font-medium">Days</th>
                        <th className="w-12 px-2 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assignLines.map((line) => (
                        <tr key={line.id} className="align-top">
                          <td className="px-3 py-2">
                            <Select
                              value={line.itemCode}
                              onChange={(e) => updateAssignLine(line.id, { itemCode: e.target.value })}
                              disabled={courseOptionsLoading}
                              className="min-w-[12rem]"
                            >
                              <option value="">Select class…</option>
                              {filteredCourseOptions.map((c) => (
                                <option key={c.itemCode} value={c.itemCode}>
                                  {c.description} ({c.itemCode})
                                </option>
                              ))}
                            </Select>
                          </td>
                          <td className="px-3 py-2">
                            <Select
                              value={line.teacherUserId}
                              onChange={(e) =>
                                updateAssignLine(line.id, { teacherUserId: e.target.value })
                              }
                              disabled={erpTeachersLoading}
                              className="min-w-[8rem]"
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
                          <td className="px-3 py-2">
                            <Input
                              type="date"
                              value={line.startDate}
                              onChange={(e) => updateAssignLine(line.id, { startDate: e.target.value })}
                              className="min-w-[9rem]"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="date"
                              value={line.endDate}
                              onChange={(e) => updateAssignLine(line.id, { endDate: e.target.value })}
                              className="min-w-[9rem]"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {WEEKDAYS.map((day) => {
                                const active = line.classDays.includes(day.value);
                                return (
                                  <button
                                    key={day.value}
                                    type="button"
                                    onClick={() => toggleClassDay(line.id, day.value)}
                                    className={`rounded px-2 py-1 text-xs font-medium ${
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
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 disabled:opacity-30"
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
                <Button type="button" variant="outline" size="sm" onClick={addAssignLine}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add line
                </Button>
              </div>
              <Button
                type="button"
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
                <Plus className="mr-1.5 h-4 w-4" />
                {assignSaving
                  ? 'Creating…'
                  : validAssignLines.length > 1
                    ? `Create SO with ${validAssignLines.length} lines`
                    : 'Create sales order'}
              </Button>
              {isMock && (
                <p className="text-xs text-amber-700">Assign course requires live API (not mock mode).</p>
              )}
            </div>
          )}

          {tab === 'schedule' && (
            <div className="mx-auto max-w-lg space-y-4">
              <p className="text-sm text-slate-600">
                Update from/to dates on an existing sales order. Writes directly to the portal
                database (no SQL Account API).
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="scheduleBranch">Child (branch)</Label>
                <Select
                  id="scheduleBranch"
                  value={scheduleBranch}
                  onChange={(e) => setScheduleBranch(e.target.value)}
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
                <Label htmlFor="scheduleEnrollment">Enrollment</Label>
                <Select
                  id="scheduleEnrollment"
                  value={selectedEnrollmentKey}
                  onChange={(e) => setSelectedEnrollmentKey(e.target.value)}
                  disabled={scheduleEnrollmentsLoading}
                >
                  {scheduleEnrollmentsLoading ? (
                    <option value="">Loading enrollments…</option>
                  ) : scheduleEnrollments.length === 0 ? (
                    <option value="">No sales orders for this child</option>
                  ) : (
                    scheduleEnrollments.map((e) => (
                      <option key={enrollmentKey(e)} value={enrollmentKey(e)}>
                        {e.docNo} — {e.className}
                        {e.conductedBy ? ` (${e.conductedBy})` : ''}
                      </option>
                    ))
                  )}
                </Select>
                {selectedEnrollment && (
                  <p className="text-xs text-slate-500">
                    {selectedEnrollment.classDay && selectedEnrollment.classTime
                      ? `${selectedEnrollment.classDay} ${selectedEnrollment.classTime}`
                      : 'Day/time from ERP line'}
                    {selectedEnrollment.classDate &&
                      ` · current from ${formatDateDDMMYYYY(selectedEnrollment.classDate.slice(0, 10))}`}
                  </p>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="scheduleStartDate">From date</Label>
                  <Input
                    id="scheduleStartDate"
                    type="date"
                    value={scheduleStartDate}
                    onChange={(e) => setScheduleStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="scheduleEndDate">To date</Label>
                  <Input
                    id="scheduleEndDate"
                    type="date"
                    value={scheduleEndDate}
                    onChange={(e) => setScheduleEndDate(e.target.value)}
                  />
                </div>
              </div>
              <Button
                type="button"
                disabled={
                  scheduleSaving ||
                  !scheduleBranch ||
                  !selectedEnrollment ||
                  isMock ||
                  scheduleEnrollmentsLoading
                }
                onClick={() => void handleSaveSchedule()}
              >
                <Save className="mr-1.5 h-4 w-4" />
                {scheduleSaving ? 'Saving…' : 'Save dates'}
              </Button>
              {isMock && (
                <p className="text-xs text-amber-700">Schedule updates require live API (not mock mode).</p>
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
