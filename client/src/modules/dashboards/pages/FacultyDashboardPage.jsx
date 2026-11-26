import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Award, Briefcase, Download, FileText, GraduationCap, Lock, Plus } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext.jsx';
import { facultyTrackerApi } from '../../../core/api/facultyTrackerApi.js';
import { studentTrackerApi } from '../../../core/api/studentTrackerApi.js';
import { AchievementStatusBadge } from '../../../shared/components/tracker/AchievementStatusBadge.jsx';
import { AnalyticsFilterBar } from '../../../shared/components/charts/AnalyticsFilterBar.jsx';
import { BarChart } from '../../../shared/components/charts/BarChart.jsx';
import { CalendarHeatmap } from '../../../shared/components/charts/CalendarHeatmap.jsx';
import { ChartCard } from '../../../shared/components/charts/ChartCard.jsx';
import { DonutChart } from '../../../shared/components/charts/DonutChart.jsx';
import { LineChart } from '../../../shared/components/charts/LineChart.jsx';

export function FacultyDashboardPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    academic_year: '',
    category_id: '',
    start_date: '',
    end_date: '',
    departmentId: ''
  });

  const [categories, setCategories] = useState([]);
  const [facultyData, setFacultyData] = useState(null);
  const [deptStudentsData, setDeptStudentsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    facultyTrackerApi.listCategories().then((c) => setCategories(c || [])).catch(() => {});
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = {
        ...(filters.academic_year ? { academic_year: filters.academic_year } : {}),
        ...(filters.category_id ? { category_id: filters.category_id } : {}),
        ...(filters.start_date ? { start_date: filters.start_date } : {}),
        ...(filters.end_date ? { end_date: filters.end_date } : {})
      };

      const [myRes, stuRes] = await Promise.all([
        facultyTrackerApi.getAnalytics(query),
        studentTrackerApi.getAnalytics({
          ...(filters.academic_year ? { academic_year: filters.academic_year } : {}),
          ...(filters.start_date ? { start_date: filters.start_date } : {}),
          ...(filters.end_date ? { end_date: filters.end_date } : {})
        })
      ]);

      setFacultyData(myRes);
      setDeptStudentsData(stuRes);
    } catch (err) {
      setError(err.message || 'Failed to load faculty dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const summary = facultyData?.summary;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Faculty Dashboard</h1>
          <p className="page-subtitle">
            Welcome, {user?.full_name} ({user?.department?.code}). Personal Faculty Tracker
            metrics and read-only department student visibility.
          </p>
        </div>

        <div className="table-actions">
          <Link to="/faculty/achievements/new" className="btn btn-primary">
            <Plus size={16} />
            <span>Submit Achievement</span>
          </Link>
          <Link to="/faculty/portfolio" className="btn btn-secondary">
            <Briefcase size={16} />
            <span>Personal Portfolio</span>
          </Link>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">
            <span>My Achievements</span>
            <Award size={16} color="var(--color-success)" />
          </div>
          <div className="kpi-value">{summary?.total_count ?? 0}</div>
          <div className="kpi-note">Personal Faculty Tracker submissions</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label"><span>My Verified Achievements</span></div>
          <div className="kpi-value">{summary?.verified_count ?? 0}</div>
          <div className="kpi-note">College-approved records</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label"><span>Pending Submissions</span></div>
          <div className="kpi-value">{summary?.pending_count ?? 0}</div>
          <div className="kpi-note">{summary?.changes_requested_count ?? 0} need changes</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label"><span>My Personal Score</span></div>
          <div className="kpi-value">{summary?.verified_score ?? 0}</div>
          <div className="kpi-note">Verified Faculty score only</div>
        </div>
      </div>

      <AnalyticsFilterBar filters={filters} onChange={setFilters} categories={categories} />

      <div className="analytics-grid-2">
        <ChartCard
          title="My Achievement Trend"
          subtitle="Monthly submission activity"
          loading={loading}
          error={error}
          isEmpty={!facultyData?.monthly_trend?.length}
        >
          <LineChart
            data={(facultyData?.monthly_trend || []).map((m) => ({
              label: m.month,
              value: m.total_count
            }))}
            color="#047857"
          />
        </ChartCard>

        <ChartCard
          title="My Verification Status"
          subtitle="Workflow breakdown"
          loading={loading}
          error={error}
          isEmpty={!summary?.total_count}
        >
          <DonutChart
            centerLabel="Mine"
            data={(facultyData?.by_status || []).map((s) => ({
              label: s.status.replaceAll('_', ' '),
              value: s.count
            }))}
          />
        </ChartCard>
      </div>

      <div className="analytics-grid-2">
        <ChartCard
          title="My Achievements by Category"
          subtitle="Distribution across faculty categories"
          loading={loading}
          error={error}
          isEmpty={!facultyData?.by_category?.length}
        >
          <BarChart
            data={(facultyData?.by_category || []).map((c) => ({
              label: c.category_name,
              value: c.total_count
            }))}
            color="#047857"
          />
        </ChartCard>

        <ChartCard
          title="My Activity Calendar"
          subtitle="Last 26 weeks"
          loading={loading}
          error={error}
          isEmpty={!summary?.total_count}
        >
          <CalendarHeatmap data={facultyData?.calendar_heatmap || []} accent="#047857" />
        </ChartCard>
      </div>

      <div className="analytics-grid-2">
        <ChartCard
          title="My Achievement Timeline"
          subtitle="Recent personal submissions"
          loading={loading}
          error={error}
          isEmpty={!facultyData?.my_timeline?.length}
          headerRight={
            <Link to="/faculty/achievements" className="btn btn-secondary btn-sm">
              View All
            </Link>
          }
        >
          <div className="timeline-list">
            {(facultyData?.my_timeline || []).slice(0, 6).map((item) => (
              <div key={item.id} className="timeline-item">
                <div className="timeline-item-top">
                  <Link to={`/faculty/achievements/${item.id}`} style={{ fontWeight: 600 }}>
                    {item.title}
                  </Link>
                  <AchievementStatusBadge status={item.workflow_status} />
                </div>
                <div className="form-hint">
                  {item.category_name} • {String(item.achieved_on).slice(0, 10)}
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard
          title="My Certificates"
          subtitle="Uploaded verification proofs"
          loading={loading}
          error={error}
          isEmpty={!facultyData?.my_certificates?.length}
          emptyMessage="No certificates uploaded yet."
        >
          <div className="evidence-list">
            {(facultyData?.my_certificates || []).map((doc) => (
              <div key={doc.id} className="evidence-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <FileText size={16} color="var(--color-primary)" />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{doc.original_filename}</div>
                    <div className="form-hint">{doc.achievement_title}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() =>
                    facultyTrackerApi.downloadDocument(
                      doc.achievement_id,
                      doc.id,
                      doc.original_filename
                    )
                  }
                >
                  <Download size={13} />
                  <span>Download</span>
                </button>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Separate Read-Only Department Student Achievements Section */}
      <ChartCard
        title={`Department Student Achievements (${user?.department?.code || 'Dept'} — Read-Only)`}
        subtitle="Student outcomes within your assigned department"
        loading={loading}
        error={error}
        isEmpty={!deptStudentsData?.recent_items?.length}
        emptyMessage="No student achievements recorded in your department yet."
        headerRight={
          <div className="table-actions">
            <span className="badge badge-inactive">
              <Lock size={12} />
              Read-Only
            </span>
            <Link to="/faculty/department-students" className="btn btn-secondary btn-sm">
              <GraduationCap size={14} />
              <span>Browse Student Records</span>
            </Link>
          </div>
        }
      >
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student &amp; Achievement</th>
                <th>Category</th>
                <th>Academic Year</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(deptStudentsData?.recent_items || []).slice(0, 6).map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link
                      to={`/faculty/department-students/${row.id}`}
                      style={{ fontWeight: 600 }}
                    >
                      {row.title}
                    </Link>
                    <div className="form-hint">
                      {row.owner_name} ({row.owner_roll_no})
                    </div>
                  </td>
                  <td>{row.category_name}</td>
                  <td>{row.academic_year}</td>
                  <td>
                    <AchievementStatusBadge status={row.workflow_status} />
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
