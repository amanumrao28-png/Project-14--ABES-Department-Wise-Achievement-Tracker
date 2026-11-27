import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Building2, Download, GraduationCap, Users } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext.jsx';
import { deptTrackerApi } from '../../../core/api/deptTrackerApi.js';
import { facultyTrackerApi } from '../../../core/api/facultyTrackerApi.js';
import { studentTrackerApi } from '../../../core/api/studentTrackerApi.js';
import { canAccessUserManagement } from '../../../core/rbac/permissions.js';
import { AchievementStatusBadge } from '../../../shared/components/tracker/AchievementStatusBadge.jsx';
import { AnalyticsFilterBar } from '../../../shared/components/charts/AnalyticsFilterBar.jsx';
import { BarChart } from '../../../shared/components/charts/BarChart.jsx';
import { CalendarHeatmap } from '../../../shared/components/charts/CalendarHeatmap.jsx';
import { ChartCard } from '../../../shared/components/charts/ChartCard.jsx';
import { DonutChart } from '../../../shared/components/charts/DonutChart.jsx';
import { LineChart } from '../../../shared/components/charts/LineChart.jsx';

export function DepartmentDashboardPage() {
  const { user } = useAuth();
  const canManageUsers = canAccessUserManagement(user);
  const [activeTab, setActiveTab] = useState('department');
  const [filters, setFilters] = useState({
    academic_year: '',
    category_id: '',
    start_date: '',
    end_date: '',
    departmentId: ''
  });

  const [categories, setCategories] = useState({ department: [], faculty: [], student: [] });
  const [analytics, setAnalytics] = useState({ department: null, faculty: null, student: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      deptTrackerApi.listCategories(),
      facultyTrackerApi.listCategories(),
      studentTrackerApi.listCategories()
    ])
      .then(([dCats, fCats, sCats]) => {
        setCategories({ department: dCats || [], faculty: fCats || [], student: sCats || [] });
      })
      .catch(() => {});
  }, []);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const commonQuery = {
        ...(filters.academic_year ? { academic_year: filters.academic_year } : {}),
        ...(filters.start_date ? { start_date: filters.start_date } : {}),
        ...(filters.end_date ? { end_date: filters.end_date } : {})
      };

      const [deptRes, facultyRes, studentRes] = await Promise.all([
        deptTrackerApi.getAnalytics({
          ...commonQuery,
          ...(activeTab === 'department' && filters.category_id
            ? { category_id: filters.category_id }
            : {})
        }),
        facultyTrackerApi.getAnalytics({
          ...commonQuery,
          ...(activeTab === 'faculty' && filters.category_id
            ? { category_id: filters.category_id }
            : {})
        }),
        studentTrackerApi.getAnalytics({
          ...commonQuery,
          ...(activeTab === 'student' && filters.category_id
            ? { category_id: filters.category_id }
            : {})
        })
      ]);

      setAnalytics({ department: deptRes, faculty: facultyRes, student: studentRes });
    } catch (err) {
      setError(err.message || 'Failed to load department analytics.');
    } finally {
      setLoading(false);
    }
  }, [filters, activeTab]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const exportTrackerReport = async (domain) => {
    const apiMap = {
      department: deptTrackerApi,
      faculty: facultyTrackerApi,
      student: studentTrackerApi
    };
    const res = await apiMap[domain].list({
      limit: 100,
      ...(filters.academic_year ? { academic_year: filters.academic_year } : {})
    });
    const rows = res?.data || [];
    const headers = ['Title', 'Category', 'Organization', 'Academic Year', 'Status', 'Score'];
    const csvRows = rows.map((r) => [
      `"${String(r.title).replaceAll('"', '""')}"`,
      `"${r.category_name || ''}"`,
      `"${String(r.organization || '').replaceAll('"', '""')}"`,
      r.academic_year,
      r.workflow_status,
      r.computed_score ?? ''
    ]);
    const csv = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${user?.department?.code || 'dept'}-${domain}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeData = analytics[activeTab];
  const detailBase =
    activeTab === 'department'
      ? '/department/department-tracker'
      : activeTab === 'faculty'
        ? '/department/faculty-tracker'
        : '/department/student-tracker';
  const accent =
    activeTab === 'department' ? 'var(--chart-6)' : activeTab === 'faculty' ? 'var(--chart-1)' : 'var(--chart-2)';

  const deptSummary = analytics.department?.summary;
  const facultySummary = analytics.faculty?.summary;
  const studentSummary = analytics.student?.summary;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Department Dashboard — {user?.department?.code || 'Assigned Dept'}
          </h1>
          <p className="page-subtitle">
            {user?.department?.name}. Strictly scoped to your assigned department across three
            independent achievement trackers.
          </p>
        </div>

        <div className="table-actions">
          {canManageUsers && (
            <Link to="/department/users" className="btn btn-primary">
              <Users size={16} />
              <span>Manage Department Users</span>
            </Link>
          )}
        </div>
      </div>

      <div className="summary-strip">
        <div className="summary-strip-cell is-highlight">
          <div className="kpi-label">
            <span>Department Achievements</span>
            <Building2 size={15} />
          </div>
          <div className="kpi-value">{deptSummary?.total_count ?? 0}</div>
          <div className="kpi-note">
            {deptSummary?.verified_count ?? 0} verified • Score {deptSummary?.verified_score ?? 0}
          </div>
        </div>

        <div className="summary-strip-cell">
          <div className="kpi-label">
            <span>Dept Faculty Overview</span>
            <Award size={15} color="var(--color-success)" />
          </div>
          <div className="kpi-value">{facultySummary?.total_count ?? 0}</div>
          <div className="kpi-note">
            {facultySummary?.verified_count ?? 0} verified • {facultySummary?.pending_count ?? 0}{' '}
            pending
          </div>
        </div>

        <div className="summary-strip-cell">
          <div className="kpi-label">
            <span>Dept Student Overview</span>
            <GraduationCap size={15} color="var(--color-warning)" />
          </div>
          <div className="kpi-value">{studentSummary?.total_count ?? 0}</div>
          <div className="kpi-note">
            {studentSummary?.verified_count ?? 0} verified • {studentSummary?.pending_count ?? 0}{' '}
            pending
          </div>
        </div>

        <div className="summary-strip-cell">
          <div className="kpi-label">
            <span>Department Reports</span>
            <Download size={15} color="var(--color-accent)" />
          </div>
          <div className="table-actions" style={{ marginTop: 10 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => exportTrackerReport('department')}
            >
              Dept CSV
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => exportTrackerReport('faculty')}
            >
              Faculty CSV
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => exportTrackerReport('student')}
            >
              Student CSV
            </button>
          </div>
        </div>
      </div>

      <div className="tab-strip">
        {[
          { id: 'department', label: 'Department Trends' },
          { id: 'faculty', label: 'Faculty Overview' },
          { id: 'student', label: 'Student Overview' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-pill ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.id);
              setFilters((prev) => ({ ...prev, category_id: '' }));
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnalyticsFilterBar
        filters={filters}
        onChange={setFilters}
        categories={categories[activeTab] || []}
      />

      <div className="analytics-grid-2">
        <ChartCard
          title="Department Performance Trend"
          subtitle="Monthly submissions in your department"
          loading={loading}
          error={error}
          isEmpty={!activeData?.monthly_trend?.length}
        >
          <LineChart
            data={(activeData?.monthly_trend || []).map((m) => ({
              label: m.month,
              value: m.total_count
            }))}
            color={accent}
          />
        </ChartCard>

        <ChartCard
          title="Category Breakdown"
          subtitle="Submissions by category"
          loading={loading}
          error={error}
          isEmpty={!activeData?.by_category?.length}
        >
          <BarChart
            data={(activeData?.by_category || []).slice(0, 8).map((c) => ({
              label: c.category_name,
              value: c.total_count
            }))}
            color={accent}
          />
        </ChartCard>
      </div>

      <div className="analytics-grid-2">
        <ChartCard
          title="Verification Status"
          subtitle="Department workflow progress"
          loading={loading}
          error={error}
          isEmpty={!activeData?.summary?.total_count}
        >
          <DonutChart
            centerLabel="Records"
            data={(activeData?.by_status || []).map((s) => ({
              label: s.status.replaceAll('_', ' '),
              value: s.count
            }))}
          />
        </ChartCard>

        <ChartCard
          title="Department Activity Heatmap"
          subtitle="Last 26 weeks"
          loading={loading}
          error={error}
          isEmpty={!activeData?.summary?.total_count}
        >
          <CalendarHeatmap data={activeData?.calendar_heatmap || []} accent={accent} />
        </ChartCard>
      </div>

      <ChartCard
        title="Pending Submissions"
        subtitle="Submissions awaiting review within your department"
        loading={loading}
        error={error}
        isEmpty={!activeData?.pending_items?.length}
        emptyMessage="No pending submissions in this tracker."
        headerRight={
          <Link to={detailBase} className="btn btn-secondary btn-sm">
            Open Tracker
          </Link>
        }
      >
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Academic Year</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(activeData?.pending_items || []).map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link to={`${detailBase}/${item.id}`} style={{ fontWeight: 600 }}>
                      {item.title}
                    </Link>
                    {item.owner_name && <div className="form-hint">{item.owner_name}</div>}
                  </td>
                  <td>{item.category_name}</td>
                  <td>{item.academic_year}</td>
                  <td>
                    <AchievementStatusBadge status={item.workflow_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
