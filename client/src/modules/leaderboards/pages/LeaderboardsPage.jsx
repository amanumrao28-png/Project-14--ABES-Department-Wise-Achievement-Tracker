import React, { useEffect, useState } from 'react';
import { Trophy, Award, Building2, GraduationCap, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext.jsx';
import { ROLES } from '../../../core/constants/roles.js';
import { leaderboardsApi } from '../../../core/api/leaderboardsApi.js';
import { departmentsApi } from '../../../core/api/departmentsApi.js';

export default function LeaderboardsPage() {
  const { user } = useAuth();
  const canViewDepartments = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.HOD;

  const [activeTab, setActiveTab] = useState(canViewDepartments ? 'departments' : 'faculty');
  const [academicYear, setAcademicYear] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === ROLES.SUPER_ADMIN) {
      departmentsApi.list().then((res) => setDepartments(res.items || res || [])).catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = { academic_year: academicYear || undefined, department_id: departmentId || undefined };
        let res;
        if (activeTab === 'departments' && canViewDepartments) {
          res = await leaderboardsApi.getDepartments(params);
        } else if (activeTab === 'faculty') {
          res = await leaderboardsApi.getFaculty(params);
        } else {
          res = await leaderboardsApi.getStudents(params);
        }
        if (active) setData(res);
      } catch (err) {
        if (active) setError(err.message || 'Failed to load leaderboard.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [activeTab, academicYear, departmentId, canViewDepartments]);

  const rows = data?.leaderboard || [];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={24} style={{ color: 'var(--color-accent)' }} />
            Independent Leaderboards
          </h1>
          <p className="page-subtitle">
            Strictly isolated rankings computed exclusively from verified (college-approved) records. Scores are never combined across trackers.
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
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            fontWeight: 600
          }}
        >
          <ShieldCheck size={14} />
          Verified Records Only
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {canViewDepartments && (
            <button
              type="button"
              className={`btn ${activeTab === 'departments' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('departments')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Building2 size={16} />
              Department Leaderboard
            </button>
          )}
          <button
            type="button"
            className={`btn ${activeTab === 'faculty' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('faculty')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Award size={16} />
            Faculty Leaderboard
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'students' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('students')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <GraduationCap size={16} />
            Student Leaderboard
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Academic Year (e.g. 2024-25)"
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="form-input"
            style={{ width: '190px' }}
          />
          {user?.role === ROLES.SUPER_ADMIN && activeTab !== 'departments' && (
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="form-input"
              style={{ width: '190px' }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
            Loading verified leaderboard...
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
            No verified records found for this leaderboard filter.
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '70px' }}>Rank</th>
                  <th>{activeTab === 'departments' ? 'Department' : 'Name'}</th>
                  {activeTab !== 'departments' && <th>ID / Roll No</th>}
                  {activeTab !== 'departments' && <th>Department</th>}
                  <th>Verified Achievements</th>
                  <th>Total Verified Score</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.department_id && activeTab === 'departments' ? row.department_id : row.user_id}>
                    <td style={{ fontWeight: 700 }}>#{row.rank}</td>
                    <td style={{ fontWeight: 600 }}>
                      {activeTab === 'departments' ? `${row.department_name} (${row.department_code})` : row.full_name}
                    </td>
                    {activeTab !== 'departments' && <td>{row.employee_or_roll_no}</td>}
                    {activeTab !== 'departments' && <td>{row.department_code}</td>}
                    <td>{row.verified_count}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-accent)' }}>{row.total_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
