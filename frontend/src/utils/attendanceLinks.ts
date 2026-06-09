export function teacherClassesUrl() {
  return '/teacher/classes';
}

export function teacherClassSessionsUrl(classId: string) {
  return `/teacher/classes/${classId}/sessions`;
}

export function teacherClassAttendanceUrl(classId: string) {
  return `/teacher/classes/${classId}/attendance`;
}

/** Take attendance for a specific lesson session (check-in code + roster). */
export function teacherSessionAttendanceUrl(classId: string, sessionId: string) {
  return `/teacher/classes/${classId}/sessions/${sessionId}/attendance`;
}

/** @deprecated Use teacherClassesUrl() */
export function teacherAttendanceHubUrl() {
  return teacherClassesUrl();
}

/** @deprecated Use teacherClassAttendanceUrl(classId) */
export function teacherAttendanceUrl(classId: string) {
  return teacherClassAttendanceUrl(classId);
}
