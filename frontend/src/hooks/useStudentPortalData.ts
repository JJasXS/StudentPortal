import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  classesApi,
  classSessionsApi,
  enrollmentsApi,
  lessonNotesApi,
} from '@/api/resources';
import {
  mockClasses,
  mockEnrollments,
  mockLessonNotes,
  mockClassSessions,
} from '@/utils/mockData';
import type { ClassItem, ClassSession, Enrollment, LessonNote } from '@/types';

export function useStudentPortalData(enabled = true) {
  const { user } = useAuth();
  const studentUserId = user?.role === 'Student' ? user.id : undefined;
  const isMock = import.meta.env.VITE_USE_MOCK === 'true';

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [lessonNotes, setLessonNotes] = useState<LessonNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!enabled || !studentUserId) {
      setEnrollments([]);
      setClasses([]);
      setSessions([]);
      setLessonNotes([]);
      setLoading(false);
      return;
    }

    if (isMock) {
      const active = mockEnrollments.filter(
        (e) => e.studentUserId === studentUserId && e.status === 'Active'
      );
      const classIds = new Set(active.map((e) => e.classId));
      setEnrollments(active);
      setClasses(mockClasses.filter((c) => classIds.has(c.id)));
      setSessions(mockClassSessions.filter((s) => classIds.has(s.classId)));
      setLessonNotes(mockLessonNotes.filter((n) => n.studentUserId === studentUserId));
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    Promise.all([
      enrollmentsApi.getAll().catch(() => [] as Enrollment[]),
      classesApi.getAll().catch(() => [] as ClassItem[]),
      lessonNotesApi.getByStudent(studentUserId).catch(() => [] as LessonNote[]),
      classSessionsApi.getAll().catch(() => [] as ClassSession[]),
    ])
      .then(([allEnrollments, allClasses, notes, allSessions]) => {
        const active = allEnrollments.filter(
          (e) => e.studentUserId === studentUserId && e.status === 'Active'
        );
        const classIds = new Set(active.map((e) => e.classId));
        setEnrollments(active);
        setClasses(allClasses.filter((c) => classIds.has(c.id)));
        setLessonNotes(notes);
        setSessions(allSessions.filter((s) => classIds.has(s.classId)));
      })
      .catch(() => {
        setError('Could not load your classes.');
        setEnrollments([]);
        setClasses([]);
        setSessions([]);
        setLessonNotes([]);
      })
      .finally(() => setLoading(false));
  }, [enabled, isMock, studentUserId]);

  useEffect(() => {
    load();
  }, [load]);

  const classIds = useMemo(() => new Set(enrollments.map((e) => e.classId)), [enrollments]);

  return {
    studentUserId,
    enrollments,
    classes,
    sessions,
    lessonNotes,
    classIds,
    loading,
    error,
    isMock,
    reload: load,
  };
}
