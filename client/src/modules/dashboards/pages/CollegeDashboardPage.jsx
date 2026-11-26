import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Building2, GraduationCap, Users } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext.jsx';
import { departmentsApi } from '../../../core/api/departmentsApi.js';
import { deptTrackerApi } from '../../../core/api/deptTrackerApi.js';
import { facultyTrackerApi } from '../../../core/api/facultyTrackerApi.js';
import { studentTrackerApi } from '../../../core/api/studentTrackerApi.js';
import { AchievementStatusBadge } from '../../../shared/components/tracker/AchievementStatusBadge.jsx';
import { AnalyticsFilterBar } from '../../../shared/components/charts/AnalyticsFilterBar.jsx';
import { BarChart } from '../../../shared/components/charts/BarChart.jsx';
import { CalendarHeatmap } from '../../../shared/components/charts/CalendarHeatmap.jsx';
import { ChartCard } from '../../../shared/components/charts/ChartCard.jsx';
import { DonutChart } from '../../../shared/components/charts/DonutChart.jsx';
import { LineChart } from '../../../shared/components/charts/LineChart.jsx';

const TAB_CONFIG = {
  department: {
    label: 'Department Analytics',
    color: '#1d4ed8',
    detailBase: '/college/department-tracker'
  },
  faculty: {
    label: 'Faculty Analytics',
    color: '#047857',
    detailBase: '/college/faculty-tracker'
  },
  student: {
    label: 'Student Analytics',
    color: '#d97706',
    detailBase: '/college/student-tracker'
  }
};

export function CollegeDashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('department');
  const [filters, setFilters] = useState({
    academic_year: '',
    category_id: '',
    start_date: '',
    end_date: '',
    departmentId: ''
  });

  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState({ department: [], faculty: [], student: [] });
  const [analytics, setAnalytics] = useState({ department: null, faculty: null, student: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      departmentsApi.listDepartments(),
      deptTrackerApi.listCategories(),
      facultyTrackerApi.listCategories(),
      studentTrackerApi.listCategories()
    ])
      .then(([depts, dCats, fCats, sCats]) => {
        setDepartments(depts || []);
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
        ...(filters.end_date ? { end_date: filters.end_date } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {})
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
      setError(err.message || 'Failed to load college analytics.');
    } finally {
      setLoading(false);
    }
  }, [filters, activeTab]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const activeData = analytics[activeTab];
  const tabMeta = TAB_CONFIG[activeTab];
  const deptSummary = analytics.department?.summary;
  const facultySummary = analytics.faculty?.summary;
  const studentSummary = analytics.student?.summary;

  const totalPending =
    (deptSummary?.pending_count || 0) +
    (facultySummary?.pending_count || 0) +
    (studentSummary?.pending_count || 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">College Dashboard</h1>
          <p className="page-subtitle">
            Welcome, {user?.full_name}. Independent institutional analytics across Department,
            Faculty, and Student trackers. Scores are never combined.
          </p>
        </div>

        <div className="table-actions">
          <Link to="/college/users" className="btn btn-primary">
            <Users size={16} />
            <span>Manage Users</span>
          </Link>
          <Link to="/college/departments" className="btn btn-secondary">
            <Building2 size={16} />
            <span>Departments</span>
          </Link>
        </div>
      </div>

      {/* Top Independent KPI Summary */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Total Departments</span>
            <Building2 size={16} color="var(--color-primary)" />
          </div>
          <div className="kpi-value">{departments.length}</div>
          <div className="kpi-note">{totalPending} total pending approvals across trackers</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Department Achievements</span>
            <Building2 size={16} color="var(--color-primary)" />
          </div>
          <div className="kpi-value">{deptSummary?.total_count ?? 0}</div>
          <div className="kpi-note">
            {deptSummary?.verified_count ?? 0} verified • {deptSummary?.pending_count ?? 0} pending •
            Score {deptSummary?.verified_score ?? 0}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Faculty Achievements</span>
            <Award size={16} color="var(--color-success)" />
          </div>
          <div className="kpi-value">{facultySummary?.total_count ?? 0}</div>
          <div className="kpi-note">
            {facultySummary?.verified_count ?? 0} verified • {facultySummary?.pending_count ?? 0}{' '}
            pending • Score {facultySummary?.verified_score ?? 0}
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Student Achievements</span>
            <GraduationCap size={16} color="var(--color-warning)" />
          </div>
          <div className="kpi-value">{studentSummary?.total_count ?? 0}</div>
          <div className="kpi-note">
            {studentSummary?.verified_count ?? 0} verified • {studentSummary?.pending_count ?? 0}{' '}
            pending • Score {studentSummary?.verified_score ?? 0}
          </div>
        </div>
      </div>

      {/* Independent Analytics Tabs */}
      <div className="tab-strip" role="tablist" aria-label="Independent tracker analytics tabs">
        {Object.entries(TAB_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={activeTab === key}
            className={`tab-pill ${activeTab === key ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(key);
              setFilters((prev) => ({ ...prev, category_id: '' }));
            }}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      <AnalyticsFilterBar
        filters={filters}
        onChange={setFilters}
        categories={categories[activeTab] || []}
        departments={departments}
        showDepartmentFilter
      />

      <div className="analytics-grid-2">
        <ChartCard
          title="Department Comparison"
          subtitle={`Verified ${tabMeta.label.replace(' Analytics', '')} scores by department`}
          loading={loading}
          error={error}
          isEmpty={!activeData?.department_comparison?.length}
        >
          <BarChart
            data={(activeData?.department_comparison || []).map((d) => ({
              label: d.department_code,
              value: d.verified_score || d.total_count
            }))}
            color={tabMeta.color}
          />
        </ChartCard>

        <ChartCard
          title="Year-wise &amp; Monthly Trend"
          subtitle="Submission volume over time"
          loading={loading}
          error={error}
          isEmpty={!activeData?.monthly_trend?.length}
        >
          <LineChart
            data={(activeData?.monthly_trend || []).map((m) => ({
              label: m.month,
              value: m.total_count
            }))}
            color={tabMeta.color}
          />
        </ChartCard>
      </div>

      <div className="analytics-grid-2">
        <ChartCard
          title="Verification Status Distribution"
          subtitle="Current workflow stage breakdown"
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
          title="Category Breakdown"
          subtitle={`Independent ${activeTab} categories`}
          loading={loading}
          error={error}
          isEmpty={!activeData?.by_category?.length}
        >
          <BarChart
            data={(activeData?.by_category || []).slice(0, 8).map((c) => ({
              label: c.category_name,
              value: c.total_count
            }))}
            color={tabMeta.color}
          />
        </ChartCard>
      </div>

      <div style={{ marginBottom: 18 }}>
        <ChartCard
          title="Activity Calendar Heatmap"
          subtitle="Daily achievement density over the last 26 weeks"
          loading={loading}
          error={error}
          isEmpty={!activeData?.summary?.total_count}
        >
          <CalendarHeatmap
            data={activeData?.calendar_heatmap || []}
            accent={tabMeta.color}
          />
        </ChartCard>
      </div>

      <div className="analytics-grid-2">
        <ChartCard
          title="Pending Approvals Queue"
          subtitle="Submissions awaiting review or final college verification"
          loading={loading}
          error={error}
          isEmpty={!activeData?.pending_items?.length}
          emptyMessage="No pending approvals in this tracker."
          headerRight={
            <Link to={tabMeta.detailBase} className="btn btn-secondary btn-sm">
              Open Full Tracker
            </Link>
          }
        >
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Achievement</th>
                  <th>Dept</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(activeData?.pending_items || []).map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link to={`${tabMeta.detailBase}/${item.id}`} style={{ fontWeight: 600 }}>
                        {item.title}
                      </Link>
                      <div className="form-hint">
                        {item.category_name} • {item.academic_year}
                      </div>
                    </td>
                    <td>{item.department_code}</td>
                    <td>
                      <AchievementStatusBadge status={item.workflow_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        {activeTab !== 'department' && (
          <ChartCard
            title={
              activeTab === 'faculty'
                ? 'Independent Faculty Leaderboard'
                : 'Independent Student Leaderboard'
            }
            subtitle="Ranked strictly by college-approved verified scores within this tracker"
            loading={loading}
            error={error}
            isEmpty={!activeData?.leaderboard?.length}
            emptyMessage="No college-approved records yet to rank."
          >
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Dept</th>
                    <th>Verified</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeData?.leaderboard || []).map((entry, idx) => (
                    <tr key={entry.user_id}>
                      <td style={{ fontWeight: 700 }}>{idx + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{entry.full_name}</div>
                        <div className="form-hint">{entry.employee_or_roll_no}</div>
                      </td>
                      <td>{entry.department_code}</td>
                      <td>{entry.verified_count}</td>
                      <td style={{ fontWeight: 700 }}>{entry.verified_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        )}
      </div>
    </div>
  );
}
