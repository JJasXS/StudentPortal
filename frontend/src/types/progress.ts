export interface StudentProgressRow {
  studentUserId: string;
  studentName: string;
  className: string;
  attendanceRate: number;
  sessionsAttended: number;
  sessionsTotal: number;
  skillScore: number;
  trend: 'up' | 'down' | 'stable';
  lastNote?: string;
}

export interface WeeklyAttendancePoint {
  weekLabel: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

export interface SkillTrendPoint {
  month: string;
  avgScore: number;
}

export interface TeacherProgressData {
  teacherUserId: string;
  students: StudentProgressRow[];
  weeklyAttendance: WeeklyAttendancePoint[];
  skillTrend: SkillTrendPoint[];
}
