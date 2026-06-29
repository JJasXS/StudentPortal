import type { HomeworkSubmission } from '@/types/homework';

const STORAGE_KEY = 'mtp_homework_submissions';

export const mockHomeworkSubmissions: HomeworkSubmission[] = [
  {
    id: 'hw1',
    studentUserId: '4',
    studentName: 'Emily Tan',
    classId: 'cl1',
    className: 'Piano Mon AM',
    courseId: 'c1',
    courseName: 'Piano Beginner',
    fileName: 'c-major-scale-practice.pdf',
    uploadedAt: '2026-05-28T18:30:00',
    note: 'Week 4 — hands separate',
  },
  {
    id: 'hw2',
    studentUserId: '4',
    studentName: 'Emily Tan',
    classId: 'cl1',
    className: 'Piano Mon AM',
    courseId: 'c1',
    courseName: 'Piano Beginner',
    fileName: 'minuet-in-g-recording.mp3',
    uploadedAt: '2026-06-01T09:15:00',
    note: 'Practice recording for teacher review',
  },
  {
    id: 'hw3',
    studentUserId: '4',
    studentName: 'Emily Tan',
    classId: 'cl3',
    className: 'Piano Sat AM',
    courseId: 'c1',
    courseName: 'Piano Beginner',
    fileName: 'rhythm-exercises-week2.jpg',
    uploadedAt: '2026-05-25T14:00:00',
  },
  {
    id: 'hw4',
    studentUserId: '5',
    studentName: 'James Lim',
    classId: 'cl2',
    className: 'Guitar Wed PM',
    courseId: 'c2',
    courseName: 'Guitar Beginner',
    fileName: 'open-chords-progression.pdf',
    uploadedAt: '2026-05-27T16:45:00',
    note: 'G, C, D chord changes',
  },
  {
    id: 'hw5',
    studentUserId: '8',
    studentName: 'Sophia Lee',
    classId: 'cl1',
    className: 'Piano Mon AM',
    courseId: 'c1',
    courseName: 'Piano Beginner',
    fileName: 'sight-reading-week3.pdf',
    uploadedAt: '2026-05-20T11:00:00',
  },
  {
    id: 'hw6',
    studentUserId: '8',
    studentName: 'Sophia Lee',
    classId: 'cl3',
    className: 'Piano Sat AM',
    courseId: 'c1',
    courseName: 'Piano Beginner',
    fileName: 'd-minor-scale.mp3',
    uploadedAt: '2026-05-24T10:30:00',
  },
  {
    id: 'hw7',
    studentUserId: '9',
    studentName: 'Ahmad Razak',
    classId: 'cl3',
    className: 'Piano Sat AM',
    courseId: 'c1',
    courseName: 'Piano Beginner',
    fileName: 'ensemble-piece-draft.pdf',
    uploadedAt: '2026-05-22T17:20:00',
  },
  {
    id: 'hw8',
    studentUserId: '10',
    studentName: 'Chloe Ng',
    classId: 'cl1',
    className: 'Piano Mon AM',
    courseId: 'c1',
    courseName: 'Piano Beginner',
    fileName: 'finger-strength-log.pdf',
    uploadedAt: '2026-05-19T08:50:00',
  },
  {
    id: 'hw9',
    studentUserId: '11',
    studentName: 'Daniel Koh',
    classId: 'cl2',
    className: 'Guitar Wed PM',
    courseId: 'c2',
    courseName: 'Guitar Beginner',
    fileName: 'strumming-pattern-4-4.mp3',
    uploadedAt: '2026-05-26T19:00:00',
    note: 'Slow tempo first, then full speed',
  },
  {
    id: 'hw10',
    studentUserId: '30',
    studentName: 'Lucas Tan',
    classId: 'cl1',
    className: 'Piano Mon AM',
    courseId: 'c1',
    courseName: 'Piano Beginner',
    fileName: 'bach-prelude-excerpt.pdf',
    uploadedAt: '2026-05-30T12:10:00',
  },
  {
    id: 'hw11',
    studentUserId: '5',
    studentName: 'James Lim',
    classId: 'cl2',
    className: 'Guitar Wed PM',
    courseId: 'c2',
    courseName: 'Guitar Beginner',
    fileName: 'fingerpicking-pattern-a.wav',
    uploadedAt: '2026-06-01T20:00:00',
  },
  {
    id: 'hw12',
    studentUserId: '31',
    studentName: 'Mia Wong',
    classId: 'cl1',
    className: 'Piano Mon AM',
    courseId: 'c1',
    courseName: 'Piano Beginner',
    fileName: 'hanon-exercise-5.jpg',
    uploadedAt: '2026-05-29T15:30:00',
  },
];

function loadRaw(): HomeworkSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HomeworkSubmission[]) : [];
  } catch {
    return [];
  }
}

function saveRaw(entries: HomeworkSubmission[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function ensureHomeworkSeeded() {
  const existing = loadRaw();
  const byId = new Map(existing.map((e) => [e.id, e]));
  for (const seed of mockHomeworkSubmissions) {
    if (!byId.has(seed.id)) byId.set(seed.id, seed);
  }
  saveRaw([...byId.values()]);
}

export function loadAllHomework(): HomeworkSubmission[] {
  ensureHomeworkSeeded();
  return loadRaw().sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
}

export function loadHomeworkForStudentClass(
  studentUserId: string,
  classId: string
): HomeworkSubmission[] {
  return loadAllHomework().filter(
    (h) => h.studentUserId === studentUserId && h.classId === classId
  );
}

export function countHomeworkForStudentClass(studentUserId: string, classId: string): number {
  return loadHomeworkForStudentClass(studentUserId, classId).length;
}

export function addHomeworkSubmission(
  entry: Omit<HomeworkSubmission, 'id' | 'uploadedAt'> & { uploadedAt?: string }
): HomeworkSubmission {
  const all = loadAllHomework();
  const submission: HomeworkSubmission = {
    ...entry,
    id: crypto.randomUUID(),
    uploadedAt: entry.uploadedAt ?? new Date().toISOString(),
  };
  saveRaw([submission, ...all.filter((h) => h.id !== submission.id)]);
  return submission;
}

export function loadHomeworkForCourse(courseId: string): HomeworkSubmission[] {
  return loadAllHomework().filter((h) => h.courseId === courseId);
}

export function loadHomeworkForCourseStudent(
  courseId: string,
  studentUserId: string
): HomeworkSubmission[] {
  return loadAllHomework().filter(
    (h) => h.courseId === courseId && h.studentUserId === studentUserId
  );
}
