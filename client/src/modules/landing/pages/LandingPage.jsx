import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  GraduationCap,
  Layers,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext.jsx';
import { getHomeRouteForRole } from '../../../core/constants/roles.js';
import { publicApi } from '../../../core/api/publicApi.js';

function useScrollReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, visible];
}

function RevealSection({ id, className = '', children }) {
  const [ref, visible] = useScrollReveal();
  return (
    <section
      id={id}
      ref={ref}
      className={`reveal-section ${visible ? 'is-visible' : ''} ${className}`}
    >
      {children}
    </section>
  );
}

export function LandingPage() {
  const { isAuthenticated, user } = useAuth();
  const [showcase, setShowcase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    publicApi
      .getShowcase()
      .then((data) => {
        if (active) setShowcase(data);
      })
      .catch(() => {
        if (active) setShowcase(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const counts = showcase?.counts || {
    active_departments: 0,
    verified_department_achievements: 0,
    verified_faculty_achievements: 0,
    verified_student_achievements: 0
  };
  const departments = showcase?.departments || [];
  const highlights = showcase?.highlights || [];
  const featuredItem = highlights[0] || null;

  return (
    <div className="landing-root">
      {/* Sticky Navigation */}
      <div className="landing-nav-wrap">
        <header className="landing-nav">
          <Link to="/" className="landing-brand">
            <div className="landing-brand-mark">AB</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, fontFamily: 'var(--font-display)' }}>
                ABES Achievement Tracker
              </div>
              <div style={{ fontSize: 11.5, color: '#94A3B8' }}>
                Institutional Governance &amp; Outcomes Platform
              </div>
            </div>
          </Link>

          <nav className="landing-nav-links" aria-label="Landing navigation">
            <a href="#architecture">Trackers</a>
            <a href="#departments">Departments</a>
            <a href="#showcase">Verified Showcase</a>
          </nav>

          <div className="table-actions">
            {isAuthenticated && user ? (
              <Link to={getHomeRouteForRole(user.role)} className="btn btn-primary btn-sm">
                <span>Open My Dashboard</span>
                <ArrowRight size={14} />
              </Link>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm">
                <span>Sign In to Portal</span>
                <ArrowRight size={14} />
              </Link>
            )}
          </div>
        </header>
      </div>

      {/* Deep Navy Editorial Hero */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div>
            <div className="landing-eyebrow">
              <ShieldCheck size={14} />
              <span>Multi-Stage Verified Institutional Outcomes</span>
            </div>

            <h1 className="landing-headline">
              Department-Wise Academic &amp; Research Achievement Governance
            </h1>

            <p className="landing-lead">
              A unified institutional portal maintaining three strictly isolated achievement
              registries for Departments, Faculty, and Students — complete with evidence
              verification, maker-checker approvals, and real-time analytics.
            </p>

            <div className="landing-cta-row">
              {isAuthenticated && user ? (
                <Link to={getHomeRouteForRole(user.role)} className="btn btn-primary">
                  <span>Go to My Dashboard</span>
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <Link to="/login" className="btn btn-primary">
                  <span>Sign In to Institutional Portal</span>
                  <ArrowRight size={16} />
                </Link>
              )}

              <a href="#showcase" className="btn landing-btn-outline">
                <span>Explore Verified Showcase</span>
              </a>
            </div>
          </div>

          <div className="hero-visual-stage">
            <div className="hero-arch-frame">
              {/* Clean geometric architectural academic vector illustration */}
              <svg
                viewBox="0 0 640 420"
                className="hero-arch-svg"
                role="img"
                aria-label="Architectural schematic representing academic governance pillars"
              >
                <defs>
                  <linearGradient id="archSky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0F172A" />
                    <stop offset="100%" stopColor="#1E293B" />
                  </linearGradient>
                </defs>
                <rect width="640" height="420" fill="url(#archSky)" />
                <g stroke="rgba(148,163,184,0.16)" strokeWidth="1">
                  <line x1="0" y1="90" x2="640" y2="90" />
                  <line x1="0" y1="180" x2="640" y2="180" />
                  <line x1="0" y1="270" x2="640" y2="270" />
                  <line x1="160" y1="0" x2="160" y2="420" />
                  <line x1="320" y1="0" x2="320" y2="420" />
                  <line x1="480" y1="0" x2="480" y2="420" />
                </g>
                {/* Modern Campus Silhouette & Pillars */}
                <rect x="70" y="160" width="500" height="210" rx="6" fill="#111827" stroke="#334155" />
                <rect x="90" y="130" width="460" height="30" rx="4" fill="#1E293B" stroke="#475569" />
                <polygon points="320,66 560,130 80,130" fill="#1E293B" stroke="#3B82F6" strokeOpacity="0.45" />
                <rect x="115" y="185" width="48" height="155" rx="3" fill="#1E293B" />
                <rect x="200" y="185" width="48" height="155" rx="3" fill="#1E293B" />
                <rect x="296" y="185" width="48" height="155" rx="3" fill="#2563EB" fillOpacity="0.28" stroke="#60A5FA" strokeOpacity="0.5" />
                <rect x="392" y="185" width="48" height="155" rx="3" fill="#1E293B" />
                <rect x="477" y="185" width="48" height="155" rx="3" fill="#1E293B" />
                <rect x="52" y="368" width="536" height="14" rx="3" fill="#334155" />
              </svg>
            </div>

            {/* Selective Glass Floating Preview */}
            <div className="hero-floating-preview glass-panel">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span className="badge badge-active">
                  <CheckCircle2 size={12} />
                  Public Verified Registry
                </span>
                <span className="form-hint">
                  {loading ? 'Loading...' : `${counts.active_departments} Active Departments`}
                </span>
              </div>
              <div style={{ marginTop: 8, fontWeight: 700, fontSize: 15 }}>
                {featuredItem
                  ? featuredItem.title
                  : 'Verified achievements publish here after college approval'}
              </div>
              <div className="form-hint" style={{ marginTop: 2 }}>
                {featuredItem
                  ? `${featuredItem.tracker_domain} • ${featuredItem.department_code} • ${featuredItem.organization} (${featuredItem.academic_year})`
                  : 'Every submission undergoes documented review before entering public metrics.'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Approved Institutional Metrics */}
      <RevealSection className="landing-section">
        <div className="section-header">
          <div className="section-kicker">Verified Public Data</div>
          <h2 className="section-title">Independent Institutional Ledger</h2>
          <p className="section-subtitle">
            Live counts below reflect strictly college-approved records from each independent
            tracker. Faculty and student counts are never merged into department totals.
          </p>
        </div>

        <div className="metrics-grid">
          <div className="metric-tile">
            <div className="kpi-label">
              <span>Active Departments</span>
              <Building2 size={16} color="var(--color-accent)" />
            </div>
            <div className="metric-tile-num">
              {loading ? '—' : counts.active_departments}
            </div>
            <div className="kpi-note">Tenant-isolated academic units</div>
          </div>

          <div className="metric-tile">
            <div className="kpi-label">
              <span>Verified Dept Records</span>
              <ShieldCheck size={16} color="var(--color-accent)" />
            </div>
            <div className="metric-tile-num">
              {loading ? '—' : counts.verified_department_achievements}
            </div>
            <div className="kpi-note">Accreditations, grants, rankings &amp; MoUs</div>
          </div>

          <div className="metric-tile">
            <div className="kpi-label">
              <span>Verified Faculty Records</span>
              <Award size={16} color="var(--color-success)" />
            </div>
            <div className="metric-tile-num">
              {loading ? '—' : counts.verified_faculty_achievements}
            </div>
            <div className="kpi-note">Publications, patents, FDPs &amp; awards</div>
          </div>

          <div className="metric-tile">
            <div className="kpi-label">
              <span>Verified Student Records</span>
              <GraduationCap size={16} color="var(--color-warning)" />
            </div>
            <div className="metric-tile-num">
              {loading ? '—' : counts.verified_student_achievements}
            </div>
            <div className="kpi-note">Hackathons, internships &amp; placements</div>
          </div>
        </div>
      </RevealSection>

      {/* Three Independent Tracker Architecture */}
      <div className="landing-section-alt">
        <RevealSection id="architecture" className="landing-section">
          <div className="section-header">
            <div className="section-kicker">Architecture Principles</div>
            <h2 className="section-title">Three Separate Trackers, Zero Score Contamination</h2>
            <p className="section-subtitle">
              Each vertical maintains dedicated database schemas, category taxonomies, scoring
              rules, and multi-stage approval workflows.
            </p>
          </div>

          <div className="tracker-cards-grid">
            <div className="tracker-card">
              <div className="tracker-card-header">
                <h3>Department Tracker</h3>
                <Building2 size={18} color="var(--color-accent)" />
              </div>
              <p>
                Captures NBA/NAAC accreditations, NIRF rankings, institutional recognitions,
                MoUs, funded labs, and department-organized conferences reviewed by College
                Management.
              </p>
              <span className="badge badge-hod">
                <Lock size={12} />
                HOD &amp; Super Admin Scope
              </span>
            </div>

            <div className="tracker-card">
              <div className="tracker-card-header">
                <h3>Faculty Tracker</h3>
                <Award size={18} color="var(--color-success)" />
              </div>
              <p>
                Tracks SCI/Scopus publications, patents, book chapters, FDPs, guest lectures, and
                grants through two-stage HOD and College Management verification.
              </p>
              <span className="badge badge-faculty">
                <Layers size={12} />
                Two-Stage HOD → College Review
              </span>
            </div>

            <div className="tracker-card">
              <div className="tracker-card-header">
                <h3>Student Tracker</h3>
                <GraduationCap size={18} color="var(--color-warning)" />
              </div>
              <p>
                Manages hackathons, internships, placements, sports medals, certifications, and
                innovation awards reviewed by authorized Faculty Coordinators and HODs.
              </p>
              <span className="badge badge-student">
                <CheckCircle2 size={12} />
                Coordinator &amp; HOD Verification
              </span>
            </div>
          </div>
        </RevealSection>
      </div>

      {/* Department Highlights */}
      <RevealSection id="departments" className="landing-section">
        <div className="section-header">
          <div className="section-kicker">Academic Units</div>
          <h2 className="section-title">Participating Departments</h2>
          <p className="section-subtitle">
            Active institutional departments configured in the platform directory.
          </p>
        </div>

        {departments.length === 0 ? (
          <div className="chart-empty">
            {loading
              ? 'Loading active department directory...'
              : 'Department directory becomes visible once database migrations and seeds are initialized.'}
          </div>
        ) : (
          <div className="dept-highlights-grid">
            {departments.map((dept) => (
              <div key={dept.id} className="dept-highlight-card">
                <span className="badge badge-super_admin" style={{ alignSelf: 'flex-start' }}>
                  {dept.code}
                </span>
                <strong style={{ fontSize: 15.5, fontFamily: 'var(--font-display)' }}>
                  {dept.name}
                </strong>
                <span className="form-hint">
                  Isolated department workspace &amp; verification queue
                </span>
              </div>
            ))}
          </div>
        )}
      </RevealSection>

      {/* Approved Public Achievement Showcase */}
      <div className="landing-section-alt">
        <RevealSection id="showcase" className="landing-section">
          <div className="section-header">
            <div className="section-kicker">Approved Outcomes</div>
            <h2 className="section-title">Verified Achievement Showcase</h2>
            <p className="section-subtitle">
              Recent college-approved submissions surfaced directly from the verified registry.
            </p>
          </div>

          {highlights.length === 0 ? (
            <div className="chart-empty">
              {loading
                ? 'Loading verified achievements...'
                : 'No college-approved public showcase entries published yet. Sign in to submit and verify records.'}
            </div>
          ) : (
            <div className="showcase-grid">
              {highlights.map((item) => (
                <article key={`${item.tracker_domain}-${item.id}`} className="showcase-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span className="badge badge-hod">{item.tracker_domain}</span>
                    <span className="form-hint">{item.academic_year}</span>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 16.5, lineHeight: 1.35 }}>{item.title}</h3>
                  <div className="form-hint">
                    {item.category_name} • {item.organization}
                  </div>
                  <div
                    style={{
                      marginTop: 'auto',
                      paddingTop: 10,
                      borderTop: '1px solid var(--color-border)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 12.5,
                      color: 'var(--color-muted)'
                    }}
                  >
                    <span>
                      {item.department_code} — {item.department_name}
                    </span>
                    <span style={{ textTransform: 'capitalize' }}>{item.achievement_level}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </RevealSection>
      </div>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div>
            <strong style={{ color: '#FFFFFF' }}>ABES Achievement Tracker</strong> • Enterprise
            Institutional Outcomes Platform
          </div>
          <div>
            <Link to="/login" style={{ color: '#93C5FD' }}>
              Portal Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
