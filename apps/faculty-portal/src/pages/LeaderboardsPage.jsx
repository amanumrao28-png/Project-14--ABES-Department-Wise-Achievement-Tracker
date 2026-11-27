import React, { useEffect, useState } from 'react';
import { Trophy, Award, Building2, GraduationCap, ShieldCheck } from 'lucide-react';
import { useAuth } from '@shared/auth/AuthContext.jsx';
import { ROLES } from '@shared/constants/roles.js';
import { leaderboardsApi } from '@shared/api/leaderboardsApi.js';
import { departmentsApi } from '@shared/api/departmentsApi.js';
import { deptTrackerApi } from '@shared/api/deptTrackerApi.js';
import { facultyTrackerApi } from '@shared/api/facultyTrackerApi.js';
import { studentTrackerApi } from '@shared/api/studentTrackerApi.js';
import { ACADEMIC_YEAR_OPTIONS } from '@shared/components/tracker/AchievementStatusBadge.jsx';

export default function LeaderboardsPage() {
  const { user } = useAuth();
  const canViewDepartments = user?.role === ROLES.SUPER_ADMIN || user?.role === ROLES.HOD;
  const canViewFaculty = user?.role !== ROLES.STUDENT;

  const [activeTab, setActiveTab] = useState(
    canViewDepartments ? 'departments' : canViewFaculty ? 'faculty' : 'students'
  );
  const [academicYear, setAcademicYear] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [categoriesByDomain, setCategoriesByDomain] = useState({
    departments: [],
    faculty: [],
    students: []
  });
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === ROLES.SUPER_ADMIN) {
      departmentsApi.listDepartments().then((res) => setDepartments(res?.items || res || [])).catch(() => {});
    }
    studentTrackerApi
      .listCategories()
      .then((cats) => setCategoriesByDomain((prev) => ({ ...prev, students: cats || [] })))
      .catch(() => {});
    if (canViewFaculty) {
      facultyTrackerApi
        .listCategories()
        .then((cats) => setCategoriesByDomain((prev) => ({ ...prev, faculty: cats || [] })))
        .catch(() => {});
    }
    if (canViewDepartments) {
      deptTrackerApi
        .listCategories()
        .then((cats) => setCategoriesByDomain((prev) => ({ ...prev, departments: cats || [] })))
        .catch(() => {});
    }
  }, [user, canViewFaculty, canViewDepartments]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const params = {
          academic_year: academicYear || undefined,
          category_id: categoryId || undefined,
          department_id: departmentId || undefined
        };
        let res;
        if (activeTab === 'departments' && canViewDepartments) {
          res = await leaderboardsApi.getDepartments(params);
        } else if (activeTab === 'faculty' && canViewFaculty) {
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
  }, [activeTab, academicYear, categoryId, departmentId, canViewDepartments, canViewFaculty]);

  const rows = data?.leaderboard || [];
  const activeCategories = categoriesByDomain[activeTab] || [];

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCategoryId('');
  };

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Trophy size={24} style={{ color: 'var(--color-accent)' }} />
            Independent Leaderboards
          </h1>
          <p className="page-subtitle">
            Strictly isolated rankings computed exclusively from verified (college-approved) records. Filter overall or category-wise.
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
            backgroundColor: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            border: '1px solid var(--color-success-border)',
            fontWeight: 600
          }}
        >
          <ShieldCheck size={14} />
          Verified Records Only
        </span>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="tab-strip" style={{ marginBottom: 0, borderBottom: 'none', paddingBottom: 0 }}>
          {canViewDepartments && (
            <button
              type="button"
              className={`tab-pill ${activeTab === 'departments' ? 'active' : ''}`}
              onClick={() => handleTabChange('departments')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Building2 size={15} />
              Department Leaderboard
            </button>
          )}
          {canViewFaculty && (
            <button
              type="button"
              className={`tab-pill ${activeTab === 'faculty' ? 'active' : ''}`}
              onClick={() => handleTabChange('faculty')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Award size={15} />
              Faculty Leaderboard
            </button>
          )}
          <button
            type="button"
            className={`tab-pill ${activeTab === 'students' ? 'active' : ''}`}
            onClick={() => handleTabChange('students')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <GraduationCap size={15} />
            Student Leaderboard
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="form-select"
            aria-label="Filter leaderboard by category"
            style={{ width: '195px' }}
          >
            <option value="">All Categories</option>
            {activeCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
            className="form-select"
            aria-label="Filter leaderboard by academic year"
            style={{ width: '175px' }}
          >
            <option value="">All Academic Years</option>
            {ACADEMIC_YEAR_OPTIONS.map((ay) => (
              <option key={ay} value={ay}>
                AY {ay}
              </option>
            ))}
          </select>
          {user?.role === ROLES.SUPER_ADMIN && activeTab !== 'departments' && (
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="form-select"
              aria-label="Filter leaderboard by department"
              style={{ width: '195px' }}
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
            No verified records match the selected filters yet.
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '72px' }}>Rank</th>
                  <th>{activeTab === 'departments' ? 'Department' : 'Name'}</th>
                  {activeTab !== 'departments' && <th>Department</th>}
                  {activeTab !== 'departments' && <th>ID / Roll No</th>}
                  <th className="cell-numeric">Verified Achievements</th>
                  <th className="cell-numeric">Total Verified Score</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.user_id || row.department_id}>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: row.rank <= 3 ? 'var(--color-accent)' : 'var(--color-text)'
                        }}
                      >
                        #{row.rank}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {activeTab === 'departments'
                        ? `${row.department_name} (${row.department_code})`
                        : row.full_name}
                    </td>
                    {activeTab !== 'departments' && <td>{row.department_code}</td>}
                    {activeTab !== 'departments' && (
                      <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {row.employee_or_roll_no || '—'}
                      </td>
                    )}
                    <td className="cell-numeric">{row.verified_count}</td>
                    <td className="cell-numeric" style={{ fontWeight: 700, color: 'var(--color-primary)' }}>
                      {Number(row.total_score || 0).toLocaleString()}
                    </td>
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
