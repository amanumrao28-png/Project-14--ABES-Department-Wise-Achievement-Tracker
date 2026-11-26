import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Download, GraduationCap, Printer } from 'lucide-react';
import { studentTrackerApi } from '../../../core/api/studentTrackerApi.js';
import {
  ACADEMIC_YEAR_OPTIONS,
  AchievementStatusBadge
} from '../../../shared/components/tracker/AchievementStatusBadge.jsx';
import { PassportControls } from '../../../shared/components/tracker/PassportControls.jsx';

export function StudentPortfolioPage() {
  const [academicYear, setAcademicYear] = useState('');
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadPortfolio = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await studentTrackerApi.getPortfolio({
        ...(academicYear ? { academic_year: academicYear } : {})
      });
      setPortfolio(data);
    } catch (err) {
      setError(err.message || 'Unable to load student achievement portfolio.');
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
      'Student Score'
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
    a.download = `student-portfolio-${portfolio.owner?.employee_or_roll_no || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="card card-body">Loading personal student portfolio...</div>;
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
          <h1 className="page-title">Personal Student Achievement Portfolio</h1>
          <p className="page-subtitle">
            {owner?.full_name} • Roll No: {owner?.employee_or_roll_no} • {owner?.department_code} —{' '}
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
            <span>Personal Student Score</span>
            <GraduationCap size={16} color="var(--color-warning)" />
          </div>
          <div className="kpi-value">{summary?.total_student_score ?? 0}</div>
          <div className="kpi-note">Sum of approved Student achievements only</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label"><span>Competitions &amp; Hackathons</span></div>
          <div className="kpi-value">{summary?.competitions_count ?? 0}</div>
          <div className="kpi-note">{summary?.approved ?? 0} total approved records</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label"><span>Internships &amp; Placements</span></div>
          <div className="kpi-value">
            {(summary?.internships_count ?? 0) + (summary?.placements_count ?? 0)}
          </div>
          <div className="kpi-note">
            {summary?.internships_count ?? 0} Internships • {summary?.placements_count ?? 0} Placements
          </div>
        </div>
      </div>

      {byCategory.length > 0 && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-header">
            <strong>Category Breakdown (Student Tracker)</strong>
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total Entries</th>
                  <th>Approved</th>
                  <th>Student Score</th>
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
          <strong>Verified Portfolio Entries</strong>
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
                    No student achievements recorded for the selected period.
                  </td>
                </tr>
              ) : (
                records.map((row) => (
                  <tr key={row.id}>
                    <td>{String(row.achieved_on).slice(0, 10)}</td>
                    <td>
                      <Link to={`/student/achievements/${row.id}`} style={{ fontWeight: 600 }}>
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
