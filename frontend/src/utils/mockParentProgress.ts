import { mockTeacherProgress } from '@/utils/mockStudentProgress';
import type { StudentProgressRow, SkillTrendPoint, WeeklyAttendancePoint } from '@/types/progress';

export function getMockProgressForStudent(studentUserId: string): StudentProgressRow | undefined {
  for (const data of Object.values(mockTeacherProgress)) {
    const row = data.students.find((s) => s.studentUserId === studentUserId);
    if (row) return row;
  }
  return undefined;
}

export function getMockProgressForChildren(studentUserIds: string[]) {
  return studentUserIds
    .map((id) => getMockProgressForStudent(id))
    .filter((row): row is StudentProgressRow => Boolean(row));
}

export function aggregateParentProgress(studentUserIds: string[]) {
  const rows = getMockProgressForChildren(studentUserIds);
  const avgAttendance =
    rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.attendanceRate, 0) / rows.length)
      : 0;
  const avgSkill =
    rows.length > 0
      ? Math.round(rows.reduce((sum, r) => sum + r.skillScore, 0) / rows.length)
      : 0;
  const improving = rows.filter((r) => r.trend === 'up').length;

  const weeklyMap = new Map<string, WeeklyAttendancePoint>();
  for (const data of Object.values(mockTeacherProgress)) {
    for (const point of data.weeklyAttendance) {
      const existing = weeklyMap.get(point.weekLabel);
      if (!existing) {
        weeklyMap.set(point.weekLabel, { ...point });
      } else {
        weeklyMap.set(point.weekLabel, {
          weekLabel: point.weekLabel,
          present: existing.present + point.present,
          absent: existing.absent + point.absent,
          late: existing.late + point.late,
          excused: existing.excused + point.excused,
        });
      }
    }
  }

  const skillTrend: SkillTrendPoint[] = [];
  const monthScores = new Map<string, number[]>();
  for (const data of Object.values(mockTeacherProgress)) {
    for (const point of data.skillTrend) {
      const list = monthScores.get(point.month) ?? [];
      list.push(point.avgScore);
      monthScores.set(point.month, list);
    }
  }
  for (const [month, scores] of monthScores) {
    skillTrend.push({
      month,
      avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    });
  }

  return {
    rows,
    avgAttendance,
    avgSkill,
    improving,
    weeklyAttendance: [...weeklyMap.values()],
    skillTrend,
  };
}
