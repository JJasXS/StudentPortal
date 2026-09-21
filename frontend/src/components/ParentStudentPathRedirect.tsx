import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { learnerPortalPath } from '@/utils/learnerPortal';

/** Redirect legacy /parent/... bookmarks to /student/..., and Parent JWT to student paths. */
export function ParentStudentPathRedirect() {
  const { user } = useAuth();
  const location = useLocation();

  if (location.pathname.startsWith('/parent/')) {
    const target = learnerPortalPath(`${location.pathname}${location.search}`, user?.role);
    return <Navigate to={target} replace />;
  }

  if (user?.role === 'Parent' && location.pathname.startsWith('/student/')) {
    return <Outlet />;
  }

  return <Outlet />;
}
