import { useCallback, useEffect, useState } from 'react';
import {
  attendanceApi,
  classesApi,
  enrollmentsApi,
  parentsApi,
  studentsApi,
} from '@/api/resources';
import { loadPendingRegistrations } from '@/utils/parentChildRegistrations';
import { mockAttendance, mockClasses, mockEnrollments, mockParents, mockStudents } from '@/utils/mockData';
import type { PendingChildRegistration } from '@/types/childRegistration';
import type { Attendance, ClassItem, Enrollment, StudentProfile } from '@/types';

export interface ChildClassSummary {
  className: string;
  courseName?: string;
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  status: string;
}

export interface ChildRecord {
  child: StudentProfile;
  classes: ChildClassSummary[];
  attendance: {
    present: number;
    total: number;
  };
}

export function useParentChildren(parentUserId: string | undefined) {
  const [children, setChildren] = useState<StudentProfile[]>([]);
  const [records, setRecords] = useState<ChildRecord[]>([]);
  const [pending, setPending] = useState<PendingChildRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!parentUserId) return;
    setLoading(true);
    try {
      const [parents, students, enrollments, classes, attendance] = await Promise.all([
        parentsApi.getAll().catch(() => mockParents),
        studentsApi.getAll().catch(() => mockStudents),
        enrollmentsApi.getAll().catch(() => mockEnrollments),
        classesApi.getAll().catch(() => mockClasses),
        attendanceApi.getAll().catch(() => mockAttendance),
      ]);

      const parent = parents.find((p) => p.userId === parentUserId);
      const childIds = new Set(parent?.children ?? []);
      const myChildren = students.filter((s) => childIds.has(s.userId));
      setChildren(myChildren);
      setPending(loadPendingRegistrations(parentUserId));

      setRecords(
        myChildren.map((child) => buildChildRecord(child, enrollments, classes, attendance))
      );
    } finally {
      setLoading(false);
    }
  }, [parentUserId]);

  useEffect(() => {
    load();
  }, [load]);

  return { children, records, pending, loading, reload: load };
}

function buildChildRecord(
  child: StudentProfile,
  enrollments: Enrollment[],
  classes: ClassItem[],
  attendance: Attendance[]
): ChildRecord {
  const childEnrollments = enrollments.filter(
    (e) => e.studentUserId === child.userId && e.status === 'Active'
  );

  const classSummaries: ChildClassSummary[] = childEnrollments.map((e) => {
    const cls = classes.find((c) => c.id === e.classId);
    return {
      className: e.className ?? cls?.className ?? 'Class',
      courseName: cls?.courseName,
      dayOfWeek: cls?.dayOfWeek,
      startTime: cls?.startTime,
      endTime: cls?.endTime,
      status: e.status,
    };
  });

  const childAttendance = attendance.filter((a) => a.studentUserId === child.userId);
  const present = childAttendance.filter((a) => a.status === 'Present').length;

  return {
    child,
    classes: classSummaries,
    attendance: { present, total: childAttendance.length },
  };
}
