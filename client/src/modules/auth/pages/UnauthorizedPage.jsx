import { Link, useLocation } from 'react-router-dom';
import { LockKeyhole, LogIn } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext.jsx';
import { getHomeRouteForRole } from '../../../core/constants/roles.js';

export function UnauthorizedPage() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const attemptedFrom = location.state?.from || null;

  return (
    <div className="status-page">
      <div className="status-card">
        <div className="status-icon-wrap is-401">
          <LockKeyhole size={28} />
        </div>
        <div className="status-code-pill">HTTP 401 • UNAUTHORIZED</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Authentication Required</h1>
        <p style={{ margin: 0, color: 'var(--color-text-secondary)' }}>
          Your session has expired or you are not currently signed in. Please authenticate with
          your institutional account to access this workspace.
        </p>

        <div className="status-actions">
          <Link
            to="/login"
            state={attemptedFrom ? { from: attemptedFrom } : undefined}
            className="btn btn-primary"
          >
            <LogIn size={16} />
            <span>Sign In</span>
          </Link>

          {isAuthenticated && user && (
            <Link to={getHomeRouteForRole(user.role)} className="btn btn-secondary">
              Return to My Dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
