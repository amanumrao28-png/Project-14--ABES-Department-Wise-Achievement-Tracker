import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, Building2, Eye, Edit3, Plus, Search } from 'lucide-react';
import { useAuth } from '@shared/auth/AuthContext.jsx';
import { ROLES } from '@shared/constants/roles.js';
import { deptTrackerApi } from '@shared/api/deptTrackerApi.js';
import { departmentsApi } from '@shared/api/departmentsApi.js';
import {
  ACADEMIC_YEAR_OPTIONS,
  AchievementStatusBadge,
  WORKFLOW_FILTER_OPTIONS
} from '@shared/components/tracker/AchievementStatusBadge.jsx';
import { SortableTableHeader, sortRows } from '@shared/components/SortableTableHeader.jsx';

export function DeptAchievementsListPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN;
  const basePath = isSuperAdmin ? '/achievements' : '/achievements';

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchParams] = useSearchParams();
  // Filters
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
    deptTrackerApi.listCategories().then(setCategories).catch(() => {});
    if (isSuperAdmin) {
      departmentsApi.listDepartments().then(setDepartments).catch(() => {});
    }
  }, [isSuperAdmin]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await deptTrackerApi.list({
        page,
        limit: 15,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(categoryId ? { category_id: categoryId } : {}),
        ...(academicYear ? { academic_year: academicYear } : {}),
        ...(status ? { workflow_status: status } : {}),
        ...(isSuperAdmin && departmentId ? { departmentId } : {})
      });
      setItems(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      setError(err.message || 'Failed to load department achievements.');
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryId, academicYear, status, departmentId, isSuperAdmin]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const approvedCount = items.filter((i) => i.workflow_status === 'college_approved').length;
  const pendingCount = items.filter((i) =>
    ['submitted', 'under_review'].includes(i.workflow_status)
  ).length;
  const deptScoreTotal = items
    .filter((i) => i.workflow_status === 'college_approved')
    .reduce((acc, row) => acc + Number(row.computed_score || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Department Achievement Tracker</h1>
          <p className="page-subtitle">
            Independent registry of department awards, accreditations, rankings, collaborations,
            funded department projects, and events.
          </p>
        </div>

        <Link to={`${basePath}/new`} className="btn btn-primary">
          <Plus size={16} />
          <span>Add Department Achievement</span>
        </Link>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Total Department Records</span>
            <Building2 size={16} color="var(--color-primary)" />
          </div>
          <div className="kpi-value">{meta.total}</div>
          <div className="kpi-note">Strictly isolated from Faculty &amp; Student records</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label"><span>Approved (Current Page)</span></div>
          <div className="kpi-value">{approvedCount}</div>
          <div className="kpi-note">{pendingCount} awaiting Super Admin review</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label"><span>Department Score (Approved)</span></div>
          <div className="kpi-value">{deptScoreTotal.toFixed(1)}</div>
          <div className="kpi-note">Computed solely from Department scoring rules</div>
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
              placeholder="Search title or organization..."
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
                <th><SortableTableHeader label="Category" sortKey="category_name" currentSort={sortState} onSort={handleSort} /></th>
                <th><SortableTableHeader label="Department" sortKey="department_code" currentSort={sortState} onSort={handleSort} /></th>
                <th><SortableTableHeader label="Academic Year" sortKey="academic_year" currentSort={sortState} onSort={handleSort} /></th>
                <th><SortableTableHeader label="Approval Status" sortKey="workflow_status" currentSort={sortState} onSort={handleSort} /></th>
                <th><SortableTableHeader label="Dept Score" sortKey="computed_score" currentSort={sortState} onSort={handleSort} /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>
                    Loading department achievements...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 30 }}>
                    No department achievements match your filters.
                  </td>
                </tr>
              ) : (
                sortedItems.map((row) => {
                  const canEdit =
                    row.workflow_status === 'draft' || row.workflow_status === 'changes_requested';

                  return (
                    <tr key={row.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{row.title}</div>
                        <div className="form-hint">
                          {row.organization} • {row.achievement_level} • {row.evidence_count} file(s)
                        </div>
                      </td>
                      <td>{row.category_name}</td>
                      <td>{row.department_code}</td>
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
