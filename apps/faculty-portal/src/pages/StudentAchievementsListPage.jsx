import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Edit3,
  Eye,
  FileSpreadsheet,
  GraduationCap,
  Lock,
  Plus,
  Search
} from 'lucide-react';
import { useAuth } from '@shared/auth/AuthContext.jsx';
import { ROLES } from '@shared/constants/roles.js';
import { studentTrackerApi } from '@shared/api/studentTrackerApi.js';
import { departmentsApi } from '@shared/api/departmentsApi.js';
import {
  ACADEMIC_YEAR_OPTIONS,
  AchievementStatusBadge,
  WORKFLOW_FILTER_OPTIONS
} from '@shared/components/tracker/AchievementStatusBadge.jsx';
import { SortableTableHeader, sortRows } from '@shared/components/SortableTableHeader.jsx';

const VIEW_METADATA = {
  all: {
    title: 'My Student Achievements',
    subtitle: 'Track hackathons, internships, placements, sports, competitions, certifications, and projects.'
  },
  competitions: {
    title: 'Competition History',
    subtitle: 'Hackathons, technical competitions, sports medals, and innovation awards.'
  },
  internships: {
    title: 'Internship Records',
    subtitle: 'Verified industry and research internships with duration and PPO outcomes.'
  },
  placements: {
    title: 'Placement Achievements',
    subtitle: 'Full-time job offers, dream/super-dream placements, and PPO conversions.'
  }
};

export function StudentAchievementsListPage({ initialGroup = 'all' }) {
  const { user } = useAuth();
  const isStudent = user?.role === ROLES.STUDENT;
  const isFaculty = user?.role === ROLES.FACULTY;
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;

  const basePath = '/student-achievements';

  const [group, setGroup] = useState(initialGroup);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [categoryId, setCategoryId] = useState('');
  const [academicYear, setAcademicYear] = useState(() => searchParams.get('academic_year') || '');
  const [status, setStatus] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState({ key: '', dir: 'asc' });

  useEffect(() => {
    const q = searchParams.get('search');
    const ay = searchParams.get('academic_year');
    if (q !== null) {
      setSearch(q);
      setPage(1);
    }
    if (ay !== null) {
      setAcademicYear(ay);
      setPage(1);
    }
  }, [searchParams]);

  const handleSort = (key) => {
    setSortState((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedItems = useMemo(() => sortRows(items, sortState), [items, sortState]);

  useEffect(() => {
    setGroup(initialGroup);
    setCategoryId('');
    setPage(1);
  }, [initialGroup]);

  useEffect(() => {
    studentTrackerApi.listCategories().then(setCategories).catch(() => {});
    if (isSuperAdmin) {
      departmentsApi.listDepartments().then(setDepartments).catch(() => {});
    }
  }, [isSuperAdmin]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await studentTrackerApi.list({
        page,
        limit: 15,
        ...(group !== 'all' ? { category_group: group } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(categoryId ? { category_id: categoryId } : {}),
        ...(academicYear ? { academic_year: academicYear } : {}),
        ...(status ? { workflow_status: status } : {}),
        ...(isSuperAdmin && departmentId ? { departmentId } : {})
      });
      setItems(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      setError(err.message || 'Failed to load student achievements.');
    } finally {
      setLoading(false);
    }
  }, [page, group, search, categoryId, academicYear, status, departmentId, isSuperAdmin]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const approvedItems = items.filter((i) => i.workflow_status === 'college_approved');
  const studentScoreSum = approvedItems.reduce(
    (sum, r) => sum + Number(r.computed_score || 0),
    0
  );
  const uniqueStudentsCount = new Set(items.map((i) => i.owner_user_id).filter(Boolean)).size;
  const uniqueApprovedStudentsCount = new Set(
    approvedItems.map((i) => i.owner_user_id).filter(Boolean)
  ).size;

  const heading = isFaculty
    ? `Department Student Achievements (${user?.department?.code || 'Read-Only'})`
    : isStudent
      ? VIEW_METADATA[group]?.title || 'My Student Achievements'
      : 'Student Achievement Tracker';

  const subtitle = isFaculty
    ? 'Read-only visibility into student achievements within your assigned department.'
    : isStudent
      ? VIEW_METADATA[group]?.subtitle
      : 'Review and approve student submissions. Scores remain strictly independent from Faculty and Department trackers.';

  const createPresetCode =
    group === 'internships'
      ? 'STUDENT_INTERNSHIP'
      : group === 'placements'
        ? 'STUDENT_PLACEMENT'
        : group === 'competitions'
          ? 'STUDENT_HACKATHON'
          : '';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">{heading}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>

        <div className="table-actions">
          {isFaculty && !user?.can_coordinate_student_approvals && (
            <span className="badge badge-inactive">
              <Lock size={12} />
              Read-Only Mode
            </span>
          )}
          {isStudent && (
            <>
              <Link to="/student/portfolio" className="btn btn-secondary">
                <FileSpreadsheet size={16} />
                <span>Personal Portfolio</span>
              </Link>
              <Link
                to={
                  createPresetCode
                    ? `/student/achievements/new?preset=${createPresetCode}`
                    : '/student/achievements/new'
                }
                className="btn btn-primary"
              >
                <Plus size={16} />
                <span>Submit Achievement</span>
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="tab-strip">
        {[
          { id: 'all', label: 'All Records' },
          { id: 'competitions', label: 'Competition History' },
          { id: 'internships', label: 'Internship Records' },
          { id: 'placements', label: 'Placement Achievements' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab-pill ${group === tab.id ? 'active' : ''}`}
            onClick={() => {
              setGroup(tab.id);
              setCategoryId('');
              setPage(1);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Matching Student Records</span>
            <GraduationCap size={16} color="var(--color-warning)" />
          </div>
          <div className="kpi-value">{meta.total}</div>
          <div className="kpi-note">Independent Student Tracker records</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label"><span>Verified / Approved (Page)</span></div>
          <div className="kpi-value">{approvedItems.length}</div>
          <div className="kpi-note">
            {items.filter((i) => ['submitted', 'under_review', 'department_approved'].includes(i.workflow_status)).length} awaiting final verification
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Total Students (Page)</span>
          </div>
          <div className="kpi-value">{uniqueStudentsCount}</div>
          <div className="kpi-note">
            {`${uniqueApprovedStudentsCount} with verified achievements`}
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="card">
        <div className="filters-bar">
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: 10, top: 10, color: 'var(--color-text-muted)' }}
            />
            <input
              type="search"
              className="form-input filters-search"
              style={{ paddingLeft: 32, width: '100%' }}
              placeholder="Search title, company, or organizer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <select
            className="form-select"
            aria-label="Filter by category"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            aria-label="Filter by academic year"
            value={academicYear}
            onChange={(e) => {
              setAcademicYear(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Academic Years</option>
            {ACADEMIC_YEAR_OPTIONS.map((ay) => (
              <option key={ay} value={ay}>
                {ay}
              </option>
            ))}
          </select>

          <select
            className="form-select"
            aria-label="Filter by approval status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            {WORKFLOW_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {isSuperAdmin && (
            <select
              className="form-select"
              aria-label="Filter by department"
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setPage(1);
              }}
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

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th><SortableTableHeader label="Achievement" sortKey="title" currentSort={sortState} onSort={handleSort} /></th>
                {!isStudent && <th><SortableTableHeader label="Student" sortKey="owner_name" currentSort={sortState} onSort={handleSort} /></th>}
                <th><SortableTableHeader label="Category" sortKey="category_name" currentSort={sortState} onSort={handleSort} /></th>
                <th><SortableTableHeader label="Academic Year" sortKey="academic_year" currentSort={sortState} onSort={handleSort} /></th>
                <th><SortableTableHeader label="Approval Status" sortKey="workflow_status" currentSort={sortState} onSort={handleSort} /></th>
                <th><SortableTableHeader label="Student Score" sortKey="computed_score" currentSort={sortState} onSort={handleSort} /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isStudent ? 6 : 7} style={{ textAlign: 'center', padding: 30 }}>
                    Loading student achievements...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={isStudent ? 6 : 7} style={{ textAlign: 'center', padding: 30 }}>
                    No student achievements found for this view.
                  </td>
                </tr>
              ) : (
                sortedItems.map((row) => {
                  const isOwner = row.owner_user_id === user?.id;
                  const canEdit =
                    !isFaculty &&
                    (isOwner || isSuperAdmin) &&
                    (row.workflow_status === 'draft' || row.workflow_status === 'changes_requested');

                  return (
                    <tr key={row.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{row.title}</div>
                        <div className="form-hint">
                          {row.organization} • {row.achievement_level} • {row.evidence_count} certificate(s)
                        </div>
                      </td>
                      {!isStudent && (
                        <td>
                          <div style={{ fontWeight: 600 }}>{row.owner_name}</div>
                          <div className="form-hint">
                            {row.owner_roll_no} • {row.department_code}
                          </div>
                        </td>
                      )}
                      <td>{row.category_name}</td>
                      <td>{row.academic_year}</td>
                      <td>
                        <AchievementStatusBadge status={row.workflow_status} />
                      </td>
                      <td style={{ fontWeight: 700 }}>
                        {row.computed_score != null ? Number(row.computed_score).toFixed(1) : '—'}
                      </td>
                      <td>
                        <div className="table-actions">
                          <Link to={`${basePath}/${row.id}`} className="btn btn-secondary btn-sm">
                            <Eye size={13} />
                            <span>Details</span>
                          </Link>
                          {canEdit && (
                            <Link
                              to={`${basePath}/${row.id}/edit`}
                              className="btn btn-secondary btn-sm"
                            >
                              <Edit3 size={13} />
                              <span>Edit</span>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="pagination-bar">
          <span>
            Page {meta.page} of {Math.max(meta.totalPages, 1)} ({meta.total} total records)
          </span>
          <div className="table-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
