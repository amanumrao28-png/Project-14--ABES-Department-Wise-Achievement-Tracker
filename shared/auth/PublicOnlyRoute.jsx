import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { getHomeRouteForRole } from '../constants/roles.js';

/**
 * Prevents authenticated users from remaining on login/forgot-password pages
 * by redirecting them directly to their role-appropriate dashboard.
 */
export function PublicOnlyRoute({ redirectTo = '/dashboard', children }) {
  const { user, initializing, isAuthenticated } = useAuth();

  if (initializing) {
    return (
      <div className="fullscreen-loader" role="status" aria-live="polite">
        <div className="spinner" />
        <span>Loading session...</span>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={redirectTo} replace />;
  }

  return children || <Outlet />;
}
