import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { learnerPortalPath } from '@/utils/learnerPortal';

/** Parents use /parent/... URLs — redirect legacy /student/... bookmarks. */
export function ParentStudentPathRedirect() {
  const { user } = useAuth();
  const location = useLocation();

  if (user?.role === 'Parent' && location.pathname.startsWith('/student/')) {
    const target = learnerPortalPath(`${location.pathname}${location.search}`, 'Parent');
    return <Navigate to={target} replace />;
  }

  return <Outlet />;
}
