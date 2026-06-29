import { Navigate } from 'react-router-dom';

/** Lesson notes live under My Courses (Course → Class → notes) */
export default function LearnerLessonNotesPage() {
  return <Navigate to="/student/courses" replace />;
}
