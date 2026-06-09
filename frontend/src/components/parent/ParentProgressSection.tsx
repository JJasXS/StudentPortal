import { useMemo } from 'react';
import { TrendingUp, ClipboardCheck, BookOpen } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { StudentProgressGrid } from '@/components/StudentProgressGrid';
import {
  SkillTrendChart,
  StudentSkillBarChart,
  WeeklyAttendanceChart,
} from '@/components/progress/ProgressCharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { aggregateParentProgress } from '@/utils/mockParentProgress';

interface ParentProgressSectionProps {
  studentUserIds: string[];
  embedded?: boolean;
}

export function ParentProgressSection({ studentUserIds, embedded = false }: ParentProgressSectionProps) {
  const progress = useMemo(() => aggregateParentProgress(studentUserIds), [studentUserIds]);

  if (progress.rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm text-slate-500">
        Progress charts will appear once your children have attendance and lesson history.
      </p>
    );
  }

  const skillBars = [...progress.rows]
    .sort((a, b) => b.skillScore - a.skillScore)
    .map((s) => ({ name: s.studentName, score: s.skillScore }));

  const content = (
    <>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Children tracked"
          value={String(progress.rows.length)}
          icon={BookOpen}
          description="Active enrolments with progress data"
        />
        <StatCard
          title="Avg attendance"
          value={`${progress.avgAttendance}%`}
          icon={ClipboardCheck}
          description="Across all children this term"
        />
        <StatCard
          title="Avg skill score"
          value={`${progress.avgSkill}`}
          icon={TrendingUp}
          description="Teacher assessment average"
        />
        <StatCard
          title="Improving"
          value={String(progress.improving)}
          icon={TrendingUp}
          description="Children with upward trend"
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weekly attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyAttendanceChart data={progress.weeklyAttendance} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Skill growth</CardTitle>
          </CardHeader>
          <CardContent>
            <SkillTrendChart data={progress.skillTrend} />
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Skill scores by child</CardTitle>
        </CardHeader>
        <CardContent>
          <StudentSkillBarChart students={skillBars} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Per-child overview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <StudentProgressGrid students={progress.rows} />
        </CardContent>
      </Card>
    </>
  );

  if (embedded) return content;

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Learning progress</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Attendance trends, skill growth, and teacher notes summary
        </p>
      </div>
      {content}
    </div>
  );
}
