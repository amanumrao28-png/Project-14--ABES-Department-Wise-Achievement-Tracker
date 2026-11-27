import { ExternalLink, ShieldCheck, Server } from 'lucide-react';
import { useAuth } from '@shared/auth/AuthContext.jsx';

export function SettingsPage() {
  const { user } = useAuth();

  const portals = [
    {
      name: 'Student Portal',
      role: 'student (+ super_admin)',
      url: import.meta.env.VITE_STUDENT_PORTAL_URL || 'http://localhost:5173',
    },
    {
      name: 'Faculty Portal',
      role: 'faculty (+ super_admin)',
      url: import.meta.env.VITE_FACULTY_PORTAL_URL || 'http://localhost:5174',
    },
    {
      name: 'HOD Portal',
      role: 'hod (+ super_admin)',
      url: import.meta.env.VITE_HOD_PORTAL_URL || 'http://localhost:5175',
    },
    {
      name: 'Super Admin Portal',
      role: 'super_admin only',
      url: import.meta.env.VITE_ADMIN_PORTAL_URL || 'http://localhost:5176',
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Portal Governance &amp; Settings</h1>
          <p className="page-subtitle">
            Multi-portal architecture configuration connected to the shared Express API &amp; PostgreSQL database.
          </p>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18} />
            <h2 className="panel-title">Active Super Admin Session</h2>
          </div>
        </div>
        <div style={{ padding: '0 20px 20px', display: 'grid', gap: 8, fontSize: 14 }}>
          <div><strong>Signed in as:</strong> {user?.full_name} ({user?.email})</div>
          <div><strong>Role:</strong> {user?.role}</div>
          <div><strong>API Endpoint:</strong> <code>{import.meta.env.VITE_API_BASE_URL || '/api/v1 (proxied to :5000)'}</code></div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server size={18} />
            <h2 className="panel-title">Independent Portal Endpoints</h2>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Portal</th>
                <th>Allowed Roles</th>
                <th>URL</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {portals.map((p) => (
                <tr key={p.name}>
                  <td><strong>{p.name}</strong></td>
                  <td><code>{p.role}</code></td>
                  <td><code>{p.url}</code></td>
                  <td>
                    <a href={p.url} target="_blank" rel="noreferrer" className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}>
                      <span>Open</span>
                      <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
