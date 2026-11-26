import { Link } from 'react-router-dom';
import { ArrowLeft, Layers, Lock, ShieldCheck } from 'lucide-react';

export function AuthBrandLayout({ children }) {
  return (
    <div className="auth-shell">
      <section className="auth-brand-panel" aria-label="Institutional platform overview">
        <div className="auth-brand-header">
          <div className="auth-brand-mark">AB</div>
          <div>
            <h2 className="auth-brand-title">ABES Engineering College</h2>
            <p className="auth-brand-subtitle">Department-Wise Achievement Tracker</p>
          </div>
        </div>

        <div className="auth-hero">
          <h1>Verified Academic, Faculty &amp; Student Outcomes</h1>
          <p>
            Role-governed institutional platform with strict isolation across Department,
            Faculty, and Student achievement registries.
          </p>

          <div className="auth-pillars">
            <div className="auth-pillar-item">
              <Layers size={18} color="#60A5FA" />
              <span>Independent Department, Faculty &amp; Student achievement workflows</span>
            </div>
            <div className="auth-pillar-item">
              <ShieldCheck size={18} color="#60A5FA" />
              <span>Department-isolated RBAC across Super Admin, HOD, Faculty &amp; Student</span>
            </div>
            <div className="auth-pillar-item">
              <Lock size={18} color="#60A5FA" />
              <span>Rotating token sessions, rate limiting &amp; immutable audit trails</span>
            </div>
          </div>
        </div>

        <div className="auth-brand-footer">
          <span>ABES Institutional Governance Portal</span>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <ArrowLeft size={13} />
            <span>Public Showcase</span>
          </Link>
        </div>
      </section>

      <main className="auth-form-panel">
        <div className="auth-card">{children}</div>
      </main>
    </div>
  );
}
