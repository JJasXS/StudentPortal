import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { learnerPortalPath } from '@/utils/learnerPortal';

/** Legacy route — homework wizard lives on the list page. */
export default function StudentHomeworkClassPage() {
  const { user } = useAuth();
  return <Navigate to={learnerPortalPath('/student/homework', user?.role)} replace />;
}
