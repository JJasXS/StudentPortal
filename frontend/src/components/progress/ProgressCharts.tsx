import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/utils/cn';
import type { SkillTrendPoint, WeeklyAttendancePoint } from '@/types/progress';
import {
  SkillTrendTooltip,
  StudentSkillTooltip,
  WeeklyAttendanceTooltip,
} from './chartTooltips';

const ATTENDANCE_COLORS = {
  present: '#10b981',
  absent: '#f87171',
  late: '#fbbf24',
  excused: '#94a3b8',
} as const;

const chartMargin = { top: 8, right: 8, left: 0, bottom: 0 };

interface WeeklyAttendanceChartProps {
  data: WeeklyAttendancePoint[];
  className?: string;
}

export function WeeklyAttendanceChart({ data, className }: WeeklyAttendanceChartProps) {
  return (
    <div className={cn('h-56 w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={chartMargin}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="weekLabel"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={28}
          />
          <Tooltip content={<WeeklyAttendanceTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => (
              <span className="capitalize text-slate-600">{value}</span>
            )}
          />
          <Bar
            dataKey="present"
            name="present"
            stackId="attendance"
            fill={ATTENDANCE_COLORS.present}
            radius={[0, 0, 0, 0]}
          />
          <Bar dataKey="late" name="late" stackId="attendance" fill={ATTENDANCE_COLORS.late} />
          <Bar dataKey="excused" name="excused" stackId="attendance" fill={ATTENDANCE_COLORS.excused} />
          <Bar
            dataKey="absent"
            name="absent"
            stackId="attendance"
            fill={ATTENDANCE_COLORS.absent}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface SkillTrendChartProps {
  data: SkillTrendPoint[];
  className?: string;
}

export function SkillTrendChart({ data, className }: SkillTrendChartProps) {
  return (
    <div className={cn('h-56 w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ ...chartMargin, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#64748b' }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip content={<SkillTrendTooltip />} />
          <Line
            type="monotone"
            dataKey="avgScore"
            name="Avg score"
            stroke="#4f46e5"
            strokeWidth={2}
            dot={{ r: 4, fill: '#4f46e5', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-1 text-center text-xs text-slate-500">Hover points for monthly averages</p>
    </div>
  );
}

interface StudentSkillBarChartProps {
  students: { name: string; score: number }[];
  className?: string;
}

export function StudentSkillBarChart({ students, className }: StudentSkillBarChartProps) {
  return (
    <div className={cn('h-64 w-full', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={students}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
            tick={{ fontSize: 11, fill: '#475569' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<StudentSkillTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }} />
          <Bar
            dataKey="score"
            name="Skill"
            fill="#6366f1"
            radius={[0, 6, 6, 0]}
            maxBarSize={18}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
