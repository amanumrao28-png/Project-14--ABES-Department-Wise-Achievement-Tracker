import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Award, Download, Printer } from 'lucide-react';
import { facultyTrackerApi } from '@shared/api/facultyTrackerApi.js';
import {
  ACADEMIC_YEAR_OPTIONS,
  AchievementStatusBadge
} from '@shared/components/tracker/AchievementStatusBadge.jsx';
import { PassportControls } from '@shared/components/tracker/PassportControls.jsx';

export function FacultyPortfolioPage() {
  const [academicYear, setAcademicYear] = useState('');
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPortfolio = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await facultyTrackerApi.getPortfolio({
        ...(academicYear ? { academic_year: academicYear } : {})
      });
      setPortfolio(data);
    } catch (err) {
      setError(err.message || 'Unable to load faculty achievement portfolio.');
    } finally {
      setLoading(false);
    }
  }, [academicYear]);

  useEffect(() => {
    loadPortfolio();
  }, [loadPortfolio]);

  const handleExportCsv = () => {
    if (!portfolio?.records?.length) return;
    const headers = [
      'Title',
      'Category',
      'Organization',
      'Level',
      'Academic Year',
      'Date',
      'Status',
      'Faculty Score'
    ];
    const rows = portfolio.records.map((r) => [
      `"${String(r.title).replaceAll('"', '""')}"`,
      `"${r.category_name}"`,
      `"${String(r.organization).replaceAll('"', '""')}"`,
      r.achievement_level,
      r.academic_year,
      String(r.achieved_on).slice(0, 10),
      r.workflow_status,
      r.computed_score ?? ''
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `faculty-portfolio-${portfolio.owner?.employee_or_roll_no || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="card card-body">Loading personal faculty portfolio...</div>;
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <AlertCircle size={18} />
        <span>{error}</span>
      </div>
    );
  }

  const { owner, summary, by_category: byCategory = [], records = [] } = portfolio || {};

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Personal Faculty Achievement Portfolio</h1>
          <p className="page-subtitle">
            {owner?.full_name} • {owner?.employee_or_roll_no} • {owner?.department_code} —{' '}
            {owner?.department_name}
          </p>
        </div>

        <div className="table-actions no-print">
          <select
            className="form-select"
            style={{ width: 170 }}
            aria-label="Filter portfolio by academic year"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
          >
            <option value="">All Academic Years</option>
            {ACADEMIC_YEAR_OPTIONS.map((ay) => (
              <option key={ay} value={ay}>
                {ay}
              </option>
            ))}
          </select>

          <button type="button" className="btn btn-secondary" onClick={handleExportCsv}>
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={15} />
            <span>Download PDF / Print</span>
          </button>
        </div>
      </div>

      <PassportControls userId={owner?.id} />

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Personal Faculty Score</span>
            <Award size={16} color="var(--color-success)" />
          </div>
          <div className="kpi-value">{summary?.total_faculty_score ?? 0}</div>
          <div className="kpi-note">Sum of verified personal Faculty achievements</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label"><span>Verified Submissions</span></div>
          <div className="kpi-value">{summary?.approved ?? 0}</div>
          <div className="kpi-note">Out of {summary?.total ?? 0} total entries</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label"><span>Pending / Changes Requested</span></div>
          <div className="kpi-value">
            {(summary?.submitted ?? 0) + (summary?.changes_requested ?? 0)}
          </div>
          <div className="kpi-note">{summary?.draft ?? 0} drafts in progress</div>
        </div>
      </div>

      {byCategory.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-header">
            <strong>Category Breakdown (Faculty Tracker)</strong>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total Entries</th>
                  <th>Verified</th>
                  <th>Faculty Score</th>
                </tr>
              </thead>
              <tbody>
                {byCategory.map((cat) => (
                  <tr key={cat.category_code}>
                    <td style={{ fontWeight: 600 }}>{cat.category_name}</td>
                    <td>{cat.total_count}</td>
                    <td>{cat.approved_count}</td>
                    <td style={{ fontWeight: 700 }}>{Number(cat.approved_score).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <strong>Chronological Achievement Record</strong>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Title &amp; Organization</th>
                <th>Category</th>
                <th>Academic Year</th>
                <th>Status</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 28 }}>
                    No faculty achievements recorded for the selected period.
                  </td>
                </tr>
              ) : (
                records.map((row) => (
                  <tr key={row.id}>
                    <td>{String(row.achieved_on).slice(0, 10)}</td>
                    <td>
                      <Link to={`/faculty/${row.id}`} style={{ fontWeight: 600 }}>
                        {row.title}
                      </Link>
                      <div className="form-hint">
                        {row.organization} • {row.achievement_level}
                      </div>
                    </td>
                    <td>{row.category_name}</td>
                    <td>{row.academic_year}</td>
                    <td>
                      <AchievementStatusBadge status={row.workflow_status} />
                    </td>
                    <td style={{ fontWeight: 700 }}>
                      {row.computed_score != null ? Number(row.computed_score).toFixed(1) : '—'}
                    </td>
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
