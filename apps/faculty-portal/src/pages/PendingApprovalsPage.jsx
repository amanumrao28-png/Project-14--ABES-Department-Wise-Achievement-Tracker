import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  CheckSquare,
  Eye,
  GraduationCap,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@shared/auth/AuthContext.jsx';
import { ROLES } from '@shared/constants/roles.js';
import { deptTrackerApi } from '@shared/api/deptTrackerApi.js';
import { facultyTrackerApi } from '@shared/api/facultyTrackerApi.js';
import { studentTrackerApi } from '@shared/api/studentTrackerApi.js';
import { departmentsApi } from '@shared/api/departmentsApi.js';
import { AchievementStatusBadge } from '@shared/components/tracker/AchievementStatusBadge.jsx';

const PENDING_STATUSES = new Set(['submitted', 'under_review', 'department_approved']);

export function PendingApprovalsPage({ portalType = 'admin' }) {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const isFacultyView = portalType === 'faculty';
  const isHodView = portalType === 'hod';
  const isAdminView = portalType === 'admin';

  const [activeTab, setActiveTab] = useState(
    isFacultyView ? 'students' : isHodView ? 'faculty' : 'departments'
  );
  const [departmentId, setDepartmentId] = useState('');
  const [departments, setDepartments] = useState([]);
  const [queues, setQueues] = useState({
    departments: [],
    faculty: [],
    students: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isSuperAdmin && isAdminView) {
      departmentsApi.listDepartments().then(setDepartments).catch(() => {});
    }
  }, [isSuperAdmin, isAdminView]);

  const loadQueues = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const deptParam = isSuperAdmin && isAdminView && departmentId ? { departmentId } : {};

      const [deptRes, facultyRes, studentRes] = await Promise.all([
        isAdminView
          ? deptTrackerApi.list({ page: 1, limit: 50, ...deptParam })
          : Promise.resolve({ data: [] }),
        isAdminView || isHodView
          ? facultyTrackerApi.list({ page: 1, limit: 50, ...deptParam })
          : Promise.resolve({ data: [] }),
        studentTrackerApi.list({ page: 1, limit: 50, ...deptParam })
      ]);

      const filterPending = (rows = [], allowDeptApproved = true) =>
        rows.filter((r) =>
          allowDeptApproved
            ? PENDING_STATUSES.has(r.workflow_status)
            : ['submitted', 'under_review'].includes(r.workflow_status)
        );

      setQueues({
        departments: filterPending(deptRes?.data || [], false),
        faculty: filterPending(facultyRes?.data || [], true),
        students: filterPending(studentRes?.data || [], !isFacultyView)
      });
    } catch (err) {
      setError(err.message || 'Failed to load pending verification requests.');
    } finally {
      setLoading(false);
    }
  }, [isAdminView, isHodView, isFacultyView, isSuperAdmin, departmentId]);

  useEffect(() => {
    loadQueues();
  }, [loadQueues]);

  const rows = queues[activeTab] || [];

  const getDetailRoute = (row) => {
    if (activeTab === 'departments') return `/achievements/${row.id}`;
    if (activeTab === 'faculty') {
      return isFacultyView ? `/my-achievements/${row.id}` : `/faculty/${row.id}`;
    }
    return isFacultyView ? `/student-achievements/${row.id}` : `/students/${row.id}`;
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CheckSquare size={22} />
            <span>
              {isFacultyView
                ? 'Pending Student Verifications'
                : isHodView
                  ? `Department Verification Queue (${user?.department?.code || 'Assigned Dept'})`
                  : 'All Pending Approvals (Institutional)'}
            </span>
          </h1>
          <p className="page-subtitle">
            {isFacultyView
              ? 'All student achievement submissions from your department awaiting faculty verification.'
              : isHodView
                ? 'Automatically scoped to your department’s faculty and student submissions awaiting verification.'
                : 'Centralized queue of all Department, Faculty, and Student submissions awaiting final verification.'}
          </p>
        </div>

        <div className="table-actions">
          {isSuperAdmin && isAdminView && (
            <select
              className="form-select"
              aria-label="Filter pending approvals by department"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              style={{ width: 210 }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} — {d.name}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="btn btn-secondary" onClick={loadQueues} disabled={loading}>
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="tab-strip">
        {isAdminView && (
          <button
            type="button"
            className={`tab-pill ${activeTab === 'departments' ? 'active' : ''}`}
            onClick={() => setActiveTab('departments')}
          >
            <Building2 size={14} style={{ marginRight: 6 }} />
            Department ({queues.departments.length})
          </button>
        )}
        {(isAdminView || isHodView) && (
          <button
            type="button"
            className={`tab-pill ${activeTab === 'faculty' ? 'active' : ''}`}
            onClick={() => setActiveTab('faculty')}
          >
            <UserCheck size={14} style={{ marginRight: 6 }} />
            Faculty ({queues.faculty.length})
          </button>
        )}
        <button
          type="button"
          className={`tab-pill ${activeTab === 'students' ? 'active' : ''}`}
          onClick={() => setActiveTab('students')}
        >
          <GraduationCap size={14} style={{ marginRight: 6 }} />
          Students ({queues.students.length})
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
            Loading pending verification requests...
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
            No pending {activeTab} achievements awaiting verification.
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Achievement</th>
                  <th>Submitted By</th>
                  <th>Department</th>
                  <th>Category</th>
                  <th>Academic Year</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{row.title}</div>
                      <div className="form-hint">
                        {row.organization} • {row.achievement_level}
                      </div>
                    </td>
                    <td>
                      {row.owner_name || row.created_by_name || '—'}
                      {row.owner_roll_no ? (
                        <div className="form-hint">{row.owner_roll_no}</div>
                      ) : null}
                    </td>
                    <td>{row.department_code || '—'}</td>
                    <td>{row.category_name || '—'}</td>
                    <td>{row.academic_year}</td>
                    <td>
                      <AchievementStatusBadge status={row.workflow_status} />
                    </td>
                    <td>
                      <Link to={getDetailRoute(row)} className="btn btn-primary btn-sm">
                        <Eye size={14} />
                        <span>Open &amp; Verify</span>
                      </Link>
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
