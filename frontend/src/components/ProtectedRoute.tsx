import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { dashboardPathForRole, isStudentPortalRole } from '@/utils/learnerPortal';
import type { UserRole } from '@/types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (isStudentPortalRole(user.role) && allowedRoles.includes('Student')) {
      return <Outlet />;
    }
    if (user.role === 'Admin' || user.role === 'Teacher' || user.role === 'Student') {
      return <Navigate to={dashboardPathForRole(user.role)} replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
