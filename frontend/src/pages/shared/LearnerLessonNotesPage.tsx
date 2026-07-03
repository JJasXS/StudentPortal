import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { learnerCoursesPath } from '@/utils/learnerPortal';

/** Lesson notes live under courses (Course → Class → notes). */
export default function LearnerLessonNotesPage() {
  const { user } = useAuth();
  return <Navigate to={learnerCoursesPath(user?.role)} replace />;
}
