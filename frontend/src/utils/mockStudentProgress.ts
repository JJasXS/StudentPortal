import type { TeacherProgressData } from '@/types/progress';

/** Mock progress analytics keyed by teacher user id */
export const mockTeacherProgress: Record<string, TeacherProgressData> = {
  '2': {
    teacherUserId: '2',
    students: [
      {
        studentUserId: '4',
        studentName: 'Emily Tan',
        className: 'Piano Mon AM',
        attendanceRate: 92,
        sessionsAttended: 11,
        sessionsTotal: 12,
        skillScore: 88,
        trend: 'up',
        lastNote: 'Strong C major scale — ready for hands together',
      },
      {
        studentUserId: '6',
        studentName: 'Sophia Lee',
        className: 'Piano Mon AM',
        attendanceRate: 85,
        sessionsAttended: 10,
        sessionsTotal: 12,
        skillScore: 76,
        trend: 'up',
        lastNote: 'Improving rhythm on simple pieces',
      },
      {
        studentUserId: '7',
        studentName: 'Noah Wong',
        className: 'Piano Sat AM',
        attendanceRate: 78,
        sessionsAttended: 9,
        sessionsTotal: 12,
        skillScore: 72,
        trend: 'stable',
        lastNote: 'Focus on sight-reading basics',
      },
      {
        studentUserId: '8',
        studentName: 'Aisha Rahman',
        className: 'Piano Sat AM',
        attendanceRate: 67,
        sessionsAttended: 8,
        sessionsTotal: 12,
        skillScore: 65,
        trend: 'down',
        lastNote: 'Missed practice — review posture exercises',
      },
      {
        studentUserId: '9',
        studentName: 'Ethan Koh',
        className: 'Piano Sat AM',
        attendanceRate: 95,
        sessionsAttended: 11,
        sessionsTotal: 12,
        skillScore: 91,
        trend: 'up',
        lastNote: 'Excellent progress on Grade 2 piece',
      },
    ],
    weeklyAttendance: [
      { weekLabel: 'Apr 7', present: 8, absent: 1, late: 1, excused: 0 },
      { weekLabel: 'Apr 14', present: 9, absent: 0, late: 1, excused: 0 },
      { weekLabel: 'Apr 21', present: 7, absent: 2, late: 0, excused: 1 },
      { weekLabel: 'Apr 28', present: 10, absent: 0, late: 0, excused: 0 },
      { weekLabel: 'May 5', present: 9, absent: 1, late: 0, excused: 0 },
      { weekLabel: 'May 12', present: 11, absent: 0, late: 1, excused: 0 },
    ],
    skillTrend: [
      { month: 'Jan', avgScore: 62 },
      { month: 'Feb', avgScore: 68 },
      { month: 'Mar', avgScore: 71 },
      { month: 'Apr', avgScore: 76 },
      { month: 'May', avgScore: 79 },
      { month: 'Jun', avgScore: 82 },
    ],
  },
  '3': {
    teacherUserId: '3',
    students: [
      {
        studentUserId: '5',
        studentName: 'James Lim',
        className: 'Guitar Wed PM',
        attendanceRate: 80,
        sessionsAttended: 8,
        sessionsTotal: 10,
        skillScore: 74,
        trend: 'stable',
        lastNote: 'Chord transitions improving slowly',
      },
      {
        studentUserId: '10',
        studentName: 'Mia Chen',
        className: 'Guitar Wed PM',
        attendanceRate: 90,
        sessionsAttended: 9,
        sessionsTotal: 10,
        skillScore: 82,
        trend: 'up',
        lastNote: 'Ready for barre chord introduction',
      },
      {
        studentUserId: '11',
        studentName: 'Ryan Teo',
        className: 'Guitar Wed PM',
        attendanceRate: 70,
        sessionsAttended: 7,
        sessionsTotal: 10,
        skillScore: 68,
        trend: 'down',
        lastNote: 'Strumming consistency needs work',
      },
    ],
    weeklyAttendance: [
      { weekLabel: 'Apr 7', present: 5, absent: 1, late: 0, excused: 0 },
      { weekLabel: 'Apr 14', present: 6, absent: 0, late: 1, excused: 0 },
      { weekLabel: 'Apr 21', present: 5, absent: 1, late: 0, excused: 1 },
      { weekLabel: 'Apr 28', present: 6, absent: 0, late: 0, excused: 0 },
      { weekLabel: 'May 5', present: 6, absent: 0, late: 1, excused: 0 },
      { weekLabel: 'May 12', present: 7, absent: 0, late: 0, excused: 0 },
    ],
    skillTrend: [
      { month: 'Jan', avgScore: 58 },
      { month: 'Feb', avgScore: 63 },
      { month: 'Mar', avgScore: 67 },
      { month: 'Apr', avgScore: 70 },
      { month: 'May', avgScore: 73 },
      { month: 'Jun', avgScore: 75 },
    ],
  },
};

export const defaultTeacherProgress = mockTeacherProgress['2'];

export function getMockProgressForTeacher(teacherUserId?: string): TeacherProgressData {
  if (teacherUserId && mockTeacherProgress[teacherUserId]) {
    return mockTeacherProgress[teacherUserId];
  }
  return defaultTeacherProgress;
}
