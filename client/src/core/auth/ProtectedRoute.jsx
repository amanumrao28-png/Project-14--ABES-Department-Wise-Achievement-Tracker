import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

/**
 * Enforces authentication (401 -> /unauthorized) and role/permission authorization (403 -> /access-denied).
 * Prevents unauthorized dashboard components from ever mounting.
 */
export function ProtectedRoute({ allowedRoles = [], requirePermission = null, children }) {
  const { user, initializing, isAuthenticated } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <div className="fullscreen-loader" role="status" aria-live="polite">
        <div className="spinner" />
        <span>Verifying institutional session...</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  const hasAllowedRole = allowedRoles.length === 0 || allowedRoles.includes(user.role);
  const hasPermission = typeof requirePermission === 'function' ? requirePermission(user) : true;

  if (!hasAllowedRole || !hasPermission) {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{ attemptedPath: location.pathname }}
      />
    );
  }

  return children || <Outlet />;
}
