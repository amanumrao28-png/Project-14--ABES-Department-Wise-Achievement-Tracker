import React, { useEffect, useState } from 'react';
import { FileBarChart, Printer, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext.jsx';
import { ROLES } from '../../../core/constants/roles.js';
import { reportsApi } from '../../../core/api/reportsApi.js';

export default function ReportsPage() {
  const { user } = useAuth();

  const availableTabs = [];
  if (user?.role === ROLES.SUPER_ADMIN) {
    availableTabs.push(
      { key: 'consolidated', label: 'College Consolidated Report' },
      { key: 'department', label: 'Department Annual Report' },
      { key: 'faculty', label: 'Faculty Annual Report' },
      { key: 'student', label: 'Student Annual Report' }
    );
  } else if (user?.role === ROLES.HOD) {
    availableTabs.push(
      { key: 'department', label: 'Department Annual Report' },
      { key: 'faculty', label: 'Faculty Annual Report' },
      { key: 'student', label: 'Student Annual Report' }
    );
  } else if (user?.role === ROLES.FACULTY) {
    availableTabs.push(
      { key: 'faculty', label: 'My Faculty Annual Report' },
      { key: 'student', label: 'Dept Student Annual Report' }
    );
  } else {
    availableTabs.push({ key: 'student', label: 'My Student Annual Report' });
  }

  const [activeTab, setActiveTab] = useState(availableTabs[0]?.key || 'student');
  const [academicYear, setAcademicYear] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = { academic_year: academicYear || undefined };
        let res;
        if (activeTab === 'consolidated') res = await reportsApi.getCollegeConsolidatedReport(params);
        else if (activeTab === 'department') res = await reportsApi.getDepartmentReport(params);
        else if (activeTab === 'faculty') res = await reportsApi.getFacultyReport(params);
        else res = await reportsApi.getStudentReport(params);
        if (active) setReport(res);
      } catch (err) {
        if (active) setError(err.message || 'Failed to generate report.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [activeTab, academicYear]);

  function renderSummaryCard(title, summary) {
    return (
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '0.75rem', fontSize: '1.05rem' }}>{title}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--color-background)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Verified Records</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{summary?.verified_count ?? 0}</div>
          </div>
          <div style={{ padding: '0.75rem', borderRadius: '8px', backgroundColor: 'var(--color-background)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Total Verified Score</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-accent)' }}>
              {summary?.total_verified_score ?? 0}
            </div>
          </div>
        </div>
        {summary?.category_breakdown?.length > 0 && (
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' }}>Category Breakdown</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {summary.category_breakdown.map((c) => (
                <span
                  key={c.category}
                  style={{
                    fontSize: '0.8rem',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)'
                  }}
                >
                  {c.category}: <strong>{c.count}</strong> ({c.score} pts)
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileBarChart size={24} style={{ color: 'var(--color-accent)' }} />
            Automated Annual Reports
          </h1>
          <p className="page-subtitle">
            Authorized, verified-only annual reports. Department, faculty, and student sections remain strictly separated.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => window.print()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <Printer size={16} />
          Print / Save PDF
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {availableTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`btn ${activeTab === t.key ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Filter Academic Year (e.g. 2024-25)"
          value={academicYear}
          onChange={(e) => setAcademicYear(e.target.value)}
          className="form-input"
          style={{ width: '210px' }}
        />
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      {loading ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
          Generating authorized report...
        </div>
      ) : report?.sections ? (
        <div>
          <div style={{ marginBottom: '0.75rem', fontSize: '0.82rem', color: '#065F46', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <ShieldCheck size={15} />
            Consolidated report presents isolated tracker sections — scores are never combined.
          </div>
          {renderSummaryCard('Department Achievements Section', report.sections.department)}
          {renderSummaryCard('Faculty Achievements Section', report.sections.faculty)}
          {renderSummaryCard('Student Achievements Section', report.sections.student)}
        </div>
      ) : report ? (
        <div>
          {renderSummaryCard(`${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Annual Summary`, report.summary)}
          <div className="card">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Organization</th>
                    <th>Date</th>
                    <th>Academic Year</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {(report.records || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                        No verified records in this report period.
                      </td>
                    </tr>
                  ) : (
                    report.records.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.title}</td>
                        <td>{r.category_name}</td>
                        <td>{r.organization}</td>
                        <td>{String(r.achieved_on || '').slice(0, 10)}</td>
                        <td>{r.academic_year}</td>
                        <td style={{ fontWeight: 600 }}>{r.computed_score ?? 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
