import React, { useEffect, useState } from 'react';
import { Lightbulb, TrendingUp, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext.jsx';
import { ROLES } from '../../../core/constants/roles.js';
import { insightsApi } from '../../../core/api/insightsApi.js';

export default function InsightsPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        let res;
        if (user?.role === ROLES.SUPER_ADMIN) res = await insightsApi.getCollegeInsights();
        else if (user?.role === ROLES.HOD) res = await insightsApi.getDepartmentInsights();
        else if (user?.role === ROLES.FACULTY) res = await insightsApi.getFacultyInsights();
        else res = await insightsApi.getStudentInsights();
        if (active) setData(res);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load AI insights.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [user]);

  function renderInsightList(heading, insights = []) {
    return (
      <div style={{ marginBottom: '1.5rem' }}>
        {heading && <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>{heading}</h2>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
          {insights.map((insight) => (
            <div key={insight.id} className="card" style={{ padding: '1.15rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--color-accent)', fontSize: '0.78rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                <TrendingUp size={15} />
                {insight.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </div>
              <h3 style={{ margin: '0 0 0.45rem', fontSize: '1rem', fontWeight: 600 }}>{insight.title}</h3>
              <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
                {insight.summary}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {Object.entries(insight.metrics || {}).map(([k, v]) => (
                  <span
                    key={k}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      backgroundColor: 'var(--color-background)',
                      border: '1px solid var(--color-border)'
                    }}
                  >
                    {k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}: <strong>{String(v)}</strong>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lightbulb size={24} style={{ color: 'var(--color-accent)' }} />
            AI Historical Insights
          </h1>
          <p className="page-subtitle">
            Every insight is computed directly from verified historical analytics in your authorized scope.
          </p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.78rem',
            padding: '0.35rem 0.7rem',
            borderRadius: '999px',
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            fontWeight: 600
          }}
        >
          <ShieldCheck size={14} />
          100% Data-Grounded
        </span>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {loading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
          Analyzing verified historical records...
        </div>
      ) : data?.groups ? (
        <div>
          {renderInsightList('Department Tracker Insights', data.groups.department)}
          {renderInsightList('Faculty Tracker Insights', data.groups.faculty)}
          {renderInsightList('Student Tracker Insights', data.groups.student)}
        </div>
      ) : data ? (
        renderInsightList(null, data.insights)
      ) : null}
    </div>
  );
}
