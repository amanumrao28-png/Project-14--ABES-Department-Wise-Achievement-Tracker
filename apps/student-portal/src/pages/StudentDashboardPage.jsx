import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Download, FileText, GraduationCap, Plus, ShieldCheck, Trophy } from 'lucide-react';
import { useAuth } from '@shared/auth/AuthContext.jsx';
import { studentTrackerApi } from '@shared/api/studentTrackerApi.js';
import { AchievementStatusBadge } from '@shared/components/tracker/AchievementStatusBadge.jsx';
import { AnalyticsFilterBar } from '@shared/components/charts/AnalyticsFilterBar.jsx';
import { BarChart } from '@shared/components/charts/BarChart.jsx';
import { CalendarHeatmap } from '@shared/components/charts/CalendarHeatmap.jsx';
import { ChartCard } from '@shared/components/charts/ChartCard.jsx';
import { DonutChart } from '@shared/components/charts/DonutChart.jsx';
import { LineChart } from '@shared/components/charts/LineChart.jsx';

export function StudentDashboardPage() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({
    academic_year: '',
    category_id: '',
    start_date: '',
    end_date: '',
    departmentId: ''
  });

  const [categories, setCategories] = useState([]);
  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    studentTrackerApi.listCategories().then((c) => setCategories(c || [])).catch(() => {});
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
      const data = await studentTrackerApi.getAnalytics(query);
      setStudentData(data);
    } catch (err) {
      setError(err.message || 'Failed to load student dashboard.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const summary = studentData?.summary;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Student Dashboard</h1>
          <p className="page-subtitle">
            Welcome, {user?.full_name} ({user?.employee_or_roll_no} • {user?.department?.code}).
            Your personal achievement portfolio, certificates, and verification status.
          </p>
        </div>

        <div className="table-actions">
          <Link to="/achievements/new" className="btn btn-primary">
            <Plus size={16} />
            <span>Submit Achievement</span>
          </Link>
          <Link to="/profile" className="btn btn-secondary">
            <FileText size={16} />
            <span>Personal Portfolio</span>
          </Link>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card is-forest">
          <div className="kpi-label">
            <span>My Achievements</span>
            <span className="kpi-icon-chip"><GraduationCap size={15} /></span>
          </div>
          <div className="kpi-value">{summary?.total_count ?? 0}</div>
          <div className="kpi-note">
            {summary?.verified_count ?? 0} verified • Score {summary?.verified_score ?? 0}
          </div>
        </div>

        <div className="kpi-card is-sage">
          <div className="kpi-label">
            <span>My Competitions</span>
            <span className="kpi-icon-chip"><Trophy size={15} color="var(--color-gold-600)" /></span>
          </div>
          <div className="kpi-value">{summary?.competitions_count ?? 0}</div>
          <div className="kpi-note">
            <Link to="/competitions">View competition history</Link>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>My Internships</span>
            <span className="kpi-icon-chip"><Briefcase size={15} color="var(--color-success)" /></span>
          </div>
          <div className="kpi-value">{summary?.internships_count ?? 0}</div>
          <div className="kpi-note">
            <Link to="/internships">View internship records</Link>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>My Placements</span>
            <span className="kpi-icon-chip"><ShieldCheck size={15} color="var(--color-accent)" /></span>
          </div>
          <div className="kpi-value">{summary?.placements_count ?? 0}</div>
          <div className="kpi-note">
            <Link to="/placements">View placement offers</Link>
          </div>
        </div>
      </div>

      <AnalyticsFilterBar filters={filters} onChange={setFilters} categories={categories} />

      <div className="analytics-grid-2">
        <ChartCard
          title="My Verification Status"
          subtitle="Current approval status of your submissions"
          loading={loading}
          error={error}
          isEmpty={!summary?.total_count}
        >
          <DonutChart
            centerLabel="Mine"
            data={(studentData?.by_status || []).map((s) => ({
              label: s.status.replaceAll('_', ' '),
              value: s.count
            }))}
          />
        </ChartCard>

        <ChartCard
          title="My Achievements by Category"
          subtitle="Distribution across student categories"
          loading={loading}
          error={error}
          isEmpty={!studentData?.by_category?.length}
        >
          <BarChart
            data={(studentData?.by_category || []).map((c) => ({
              label: c.category_name,
              value: c.total_count
            }))}
            color="var(--chart-2)"
          />
        </ChartCard>
      </div>

      <div className="analytics-grid-2">
        <ChartCard
          title="My Achievement Trend"
          subtitle="Monthly progression"
          loading={loading}
          error={error}
          isEmpty={!studentData?.monthly_trend?.length}
        >
          <LineChart
            data={(studentData?.monthly_trend || []).map((m) => ({
              label: m.month,
              value: m.total_count
            }))}
            color="var(--chart-2)"
          />
        </ChartCard>

        <ChartCard
          title="My Activity Calendar"
          subtitle="Last 26 weeks"
          loading={loading}
          error={error}
          isEmpty={!summary?.total_count}
        >
          <CalendarHeatmap data={studentData?.calendar_heatmap || []} accent="var(--chart-2)" />
        </ChartCard>
      </div>

      <div className="analytics-grid-2">
        <ChartCard
          title="My Recent Submissions &amp; Verification Status"
          subtitle="Latest entries in your personal portfolio"
          loading={loading}
          error={error}
          isEmpty={!studentData?.my_timeline?.length}
          headerRight={
            <Link to="/achievements" className="btn btn-secondary btn-sm">
              View All
            </Link>
          }
        >
          <div className="timeline-list">
            {(studentData?.my_timeline || []).slice(0, 6).map((item) => (
              <div key={item.id} className="timeline-item">
                <div className="timeline-item-top">
                  <Link to={`/achievements/${item.id}`} style={{ fontWeight: 600 }}>
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
          subtitle="Uploaded certificates &amp; offer letters"
          loading={loading}
          error={error}
          isEmpty={!studentData?.my_certificates?.length}
          emptyMessage="No certificates uploaded yet."
        >
          <div className="cert-gallery-grid">
            {(studentData?.my_certificates || []).map((doc) => (
              <div key={doc.id} className="cert-preview-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0 }}>
                  <span className="kpi-icon-chip"><FileText size={15} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.original_filename}
                    </div>
                    <div className="form-hint">{doc.achievement_title}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: 'flex-start' }}
                  onClick={() =>
                    studentTrackerApi.downloadDocument(
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
    </div>
  );
}
