import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactElement;
  requireStaff?: boolean;
}

export default function ProtectedRoute({
  children,
  requireStaff = false,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="text-center py-10 text-gray-600">Checking access...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireStaff && !user?.is_staff) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-8 text-red-800">
        You are logged in but do not have permission to access this page.
      </div>
    );
  }

  return children;
}
