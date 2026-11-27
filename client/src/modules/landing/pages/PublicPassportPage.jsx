import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, Lock, Printer, ShieldCheck } from 'lucide-react';
import { apiRequest } from '../../../core/api/httpClient.js';

export function PublicPassportPage() {
  const { userId } = useParams();
  const [passport, setPassport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest(`/public/passport/${userId}`)
      .then((res) => setPassport(res.data))
      .catch((err) => setError(err.message || 'This achievement passport is private or unavailable.'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="page-content" style={{ maxWidth: 960, margin: '2rem auto' }}>
        <div className="card card-body">Loading Achievement Passport...</div>
      </div>
    );
  }

  if (error || !passport) {
    return (
      <div className="page-content" style={{ maxWidth: 640, margin: '3rem auto', textAlign: 'center' }}>
        <div className="card card-body" style={{ padding: '2.5rem' }}>
          <Lock size={36} style={{ color: 'var(--color-muted)', margin: '0 auto 1rem' }} />
          <h1 style={{ fontSize: '1.35rem', marginBottom: '0.5rem' }}>Achievement Passport Unavailable</h1>
          <p style={{ color: 'var(--color-muted)', marginBottom: '1.25rem' }}>{error}</p>
          <Link to="/" className="btn btn-primary">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const { owner, summary, records } = passport;

  return (
    <div className="page-content" style={{ maxWidth: 960, margin: '2rem auto' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600, marginBottom: '0.35rem' }}>
            <ShieldCheck size={15} />
            ABES Verified Achievement Passport
          </div>
          <h1 className="page-title">{owner.full_name}</h1>
          <p className="page-subtitle">
            {owner.role.toUpperCase()} • {owner.identifier} • {owner.department_code} — {owner.department_name}
          </p>
        </div>

        <button type="button" className="btn btn-primary no-print" onClick={() => window.print()}>
          <Printer size={16} />
          <span>Download PDF / Print</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card card-body">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Verified Achievements</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700 }}>{summary.verified_count}</div>
        </div>
        <div className="card card-body">
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>Total Verified Score</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-accent)' }}>
            {summary.total_verified_score}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <Award size={18} />
            Verified Achievement Timeline
          </strong>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Organization</th>
                <th>Level</th>
                <th>Date</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                    No verified achievements yet.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.title}</td>
                    <td>{r.category_name}</td>
                    <td>{r.organization}</td>
                    <td style={{ textTransform: 'capitalize' }}>{r.achievement_level}</td>
                    <td>{String(r.achieved_on || '').slice(0, 10)}</td>
                    <td style={{ fontWeight: 600 }}>{r.computed_score ?? 0}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
