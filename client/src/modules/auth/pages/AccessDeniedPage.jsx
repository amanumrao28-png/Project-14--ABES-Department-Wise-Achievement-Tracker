import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext.jsx';
import { getHomeRouteForRole } from '../../../core/constants/roles.js';
import { RoleBadge } from '../../../shared/components/StatusBadge.jsx';

export function AccessDeniedPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const attemptedPath = location.state?.attemptedPath;

  const returnPath = isAuthenticated && user ? getHomeRouteForRole(user.role) : '/login';

  return (
    <div className="status-page">
      <div className="status-card">
        <div className="status-icon-wrap is-403">
          <ShieldAlert size={28} />
        </div>
        <div className="status-code-pill">HTTP 403 • ACCESS DENIED</div>
        <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>Insufficient Permissions</h1>
        <p style={{ margin: '0 0 14px', color: 'var(--color-text-secondary)' }}>
          You do not have authorization to view{' '}
          {attemptedPath ? <code>{attemptedPath}</code> : 'this resource'}. Access is strictly
          enforced by role and assigned department.
        </p>

        {isAuthenticated && user && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <RoleBadge role={user.role} />
            {user.department && (
              <span className="dept-pill">
                {user.department.code} — {user.department.name}
              </span>
            )}
          </div>
        )}

        <div className="status-actions">
          <Link to={returnPath} className="btn btn-primary">
            <ArrowLeft size={16} />
            <span>{isAuthenticated ? 'Return to My Dashboard' : 'Go to Sign In'}</span>
          </Link>

          {isAuthenticated && (
            <button type="button" className="btn btn-secondary" onClick={logout}>
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
