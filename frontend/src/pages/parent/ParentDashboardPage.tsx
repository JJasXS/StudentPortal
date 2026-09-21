import { Navigate } from 'react-router-dom';

/** Legacy parent dashboard — learners are students now. */
export default function ParentDashboardPage() {
  return <Navigate to="/student/dashboard" replace />;
}
