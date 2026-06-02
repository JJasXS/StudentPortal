import { useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams, ITooltipParams } from 'ag-grid-community';
import { ensureAgGridModules } from '@/lib/agGridSetup';
import { cn } from '@/utils/cn';
import type { StudentProgressRow } from '@/types/progress';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

ensureAgGridModules();

const trendLabels = {
  up: 'Improving — attendance or skill trending upward',
  down: 'Needs focus — consider extra practice or check-ins',
  stable: 'Steady — maintaining current level',
};

function AttendanceBarCell({ data }: ICellRendererParams<StudentProgressRow>) {
  if (!data) return null;
  const color =
    data.attendanceRate >= 85
      ? 'bg-emerald-500'
      : data.attendanceRate >= 70
        ? 'bg-amber-400'
        : 'bg-red-400';

  return (
    <div className="flex h-full items-center gap-2">
      <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${data.attendanceRate}%` }} />
      </div>
      <span className="font-medium text-slate-700">{data.attendanceRate}%</span>
    </div>
  );
}

function TrendCell({ data }: ICellRendererParams<StudentProgressRow>) {
  if (!data) return null;
  const label =
    data.trend === 'up' ? 'Improving' : data.trend === 'down' ? 'Needs focus' : 'Steady';
  const styles =
    data.trend === 'up'
      ? 'text-emerald-700 bg-emerald-50'
      : data.trend === 'down'
        ? 'text-red-700 bg-red-50'
        : 'text-slate-700 bg-slate-100';

  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', styles)}>
      {label}
    </span>
  );
}

interface StudentProgressGridProps {
  students: StudentProgressRow[];
}

export function StudentProgressGrid({ students }: StudentProgressGridProps) {
  const columnDefs = useMemo<ColDef<StudentProgressRow>[]>(
    () => [
      {
        field: 'studentName',
        headerName: 'Student',
        flex: 1.2,
        minWidth: 120,
        tooltipValueGetter: (p: ITooltipParams<StudentProgressRow>) =>
          p.data ? `${p.data.studentName}\nLearner in ${p.data.className}` : '',
      },
      {
        field: 'className',
        headerName: 'Class',
        flex: 1,
        minWidth: 110,
        tooltipValueGetter: (p) =>
          p.data ? `Class group: ${p.data.className}` : '',
      },
      {
        field: 'attendanceRate',
        headerName: 'Attendance',
        flex: 1.1,
        minWidth: 140,
        cellRenderer: AttendanceBarCell,
        tooltipValueGetter: (p) => {
          if (!p.data) return '';
          const { studentName, attendanceRate, sessionsAttended, sessionsTotal } = p.data;
          const missed = sessionsTotal - sessionsAttended;
          return [
            `${studentName}: ${attendanceRate}% attendance`,
            `${sessionsAttended} of ${sessionsTotal} sessions attended`,
            missed > 0 ? `${missed} session${missed === 1 ? '' : 's'} missed` : 'Perfect attendance record',
          ].join('\n');
        },
      },
      {
        headerName: 'Sessions',
        flex: 0.8,
        minWidth: 100,
        valueGetter: (p) =>
          p.data ? `${p.data.sessionsAttended}/${p.data.sessionsTotal}` : '',
        tooltipValueGetter: (p) =>
          p.data
            ? `${p.data.sessionsAttended} attended · ${p.data.sessionsTotal - p.data.sessionsAttended} missed · ${p.data.sessionsTotal} scheduled`
            : '',
      },
      {
        field: 'skillScore',
        headerName: 'Skill',
        flex: 0.7,
        minWidth: 80,
        valueFormatter: (p) => (p.value != null ? `${p.value}/100` : ''),
        tooltipValueGetter: (p) =>
          p.data
            ? `Skill assessment: ${p.data.skillScore}/100 for ${p.data.studentName}`
            : '',
      },
      {
        field: 'trend',
        headerName: 'Trend',
        flex: 0.9,
        minWidth: 110,
        cellRenderer: TrendCell,
        tooltipValueGetter: (p) =>
          p.data ? trendLabels[p.data.trend] : '',
      },
      {
        field: 'lastNote',
        headerName: 'Latest note',
        flex: 1.4,
        minWidth: 160,
        valueFormatter: (p) => (p.value ? String(p.value) : '—'),
        tooltipValueGetter: (p) =>
          p.data?.lastNote
            ? `Lesson note:\n${p.data.lastNote}`
            : 'No lesson note recorded yet',
      },
    ],
    []
  );

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      resizable: true,
      suppressMovable: true,
    }),
    []
  );

  const gridHeight = Math.min(Math.max(students.length * 42 + 52, 200), 420);

  return (
    <div
      className="ag-theme-quartz rounded-xl overflow-hidden border border-slate-200 [&_.ag-root-wrapper]:rounded-xl"
      style={{ height: gridHeight, width: '100%' }}
    >
      <AgGridReact<StudentProgressRow>
        rowData={students}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        domLayout="normal"
        headerHeight={40}
        rowHeight={42}
        suppressCellFocus
        tooltipShowDelay={200}
        tooltipHideDelay={4000}
        enableBrowserTooltips={false}
        animateRows
        getRowId={(p) => p.data.studentUserId}
      />
    </div>
  );
}
