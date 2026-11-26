import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  KeyRound,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserX
} from 'lucide-react';
import { useAuth } from '../../../core/auth/AuthContext.jsx';
import { usersApi } from '../../../core/api/usersApi.js';
import { departmentsApi } from '../../../core/api/departmentsApi.js';
import { ROLES } from '../../../core/constants/roles.js';
import { canMutateTargetUser } from '../../../core/rbac/permissions.js';
import { AccountStatusBadge, RoleBadge } from '../../../shared/components/StatusBadge.jsx';
import { SortableTableHeader, sortRows } from '../../../shared/components/SortableTableHeader.jsx';
import { UserFormModal } from '../components/UserFormModal.jsx';
import { ResetAccessModal } from '../components/ResetAccessModal.jsx';

export function UsersManagementPage() {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === ROLES.SUPER_ADMIN;

  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const [searchParams] = useSearchParams();
  // Filters
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [sortState, setSortState] = useState({ key: '', dir: 'asc' });

  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null) {
      setSearch(q);
      setPage(1);
    }
  }, [searchParams]);

  const handleSort = (key) => {
    setSortState((prev) => ({
      key,
      dir: prev.key === key && prev.dir === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedUsers = useMemo(() => sortRows(users, sortState), [users, sortState]);

  // Modals
  const [formState, setFormState] = useState({
    isOpen: false,
    mode: 'create',
    initialRole: ROLES.FACULTY,
    targetUser: null
  });
  const [resetTarget, setResetTarget] = useState(null);

  const loadDepartments = useCallback(async () => {
    try {
      const list = await departmentsApi.listDepartments();
      setDepartments(list);
    } catch {
      // Non-fatal if reference load fails; handled on main fetch
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: 15,
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(isSuperAdmin && deptFilter ? { department_id: deptFilter } : {}),
        ...(statusFilter !== '' ? { is_active: statusFilter } : {})
      };
      const response = await usersApi.listUsers(params);
      setUsers(response.data || []);
      if (response.meta) {
        setMeta(response.meta);
      }
    } catch (err) {
      setError(err.message || 'Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, deptFilter, statusFilter, isSuperAdmin]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleActive = async (target) => {
    setError('');
    setFeedback('');
    try {
      if (target.is_active) {
        await usersApi.deactivateUser(target.id);
        setFeedback(`Account "${target.full_name}" deactivated and all active sessions revoked.`);
      } else {
        await usersApi.updateUser(target.id, { is_active: true });
        setFeedback(`Account "${target.full_name}" activated.`);
      }
      loadUsers();
    } catch (err) {
      setError(err.message || 'Failed to update account status.');
    }
  };

  const openCreateModal = (initialRole) => {
    setFormState({
      isOpen: true,
      mode: 'create',
      initialRole,
      targetUser: null
    });
  };

  const openEditModal = (target) => {
    setFormState({
      isOpen: true,
      mode: 'edit',
      initialRole: target.role,
      targetUser: target
    });
  };

  const handleFormSuccess = (savedUser, mode) => {
    setFormState((prev) => ({ ...prev, isOpen: false }));
    setFeedback(
      mode === 'create'
        ? `Account created for ${savedUser.full_name} (${savedUser.email}).`
        : `Account updated for ${savedUser.full_name}.`
    );
    loadUsers();
  };

  const handleResetCompleted = (updatedUser) => {
    setFeedback(`Access reset executed for ${updatedUser.full_name}.`);
    loadUsers();
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isSuperAdmin ? 'Institutional User Management' : 'Department User Management'}
          </h1>
          <p className="page-subtitle">
            {isSuperAdmin
              ? 'Create HOD, Faculty, and Student accounts, assign departments and roles, manage active status, and reset access.'
              : `Delegated management for Faculty and Student accounts in ${currentUser?.department?.name || 'your department'}.`}
          </p>
        </div>

        <div className="table-actions">
          {isSuperAdmin && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => openCreateModal(ROLES.HOD)}
            >
              <Plus size={16} />
              <span>Create HOD</span>
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => openCreateModal(ROLES.FACULTY)}
          >
            <Plus size={16} />
            <span>Create Faculty</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => openCreateModal(ROLES.STUDENT)}
          >
            <Plus size={16} />
            <span>Create Student</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {feedback && (
        <div className="alert alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{feedback}</span>
        </div>
      )}

      <div className="card">
        <div className="filters-bar">
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 10,
                top: 10,
                color: 'var(--color-text-muted)'
              }}
            />
            <input
              type="search"
              className="form-input filters-search"
              style={{ paddingLeft: 32, width: '100%' }}
              placeholder="Search by name, email, or employee/roll no..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <select
            className="form-select"
            aria-label="Filter by role"
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Roles</option>
            {isSuperAdmin && <option value={ROLES.SUPER_ADMIN}>Super Admin</option>}
            <option value={ROLES.HOD}>HOD</option>
            <option value={ROLES.FACULTY}>Faculty</option>
            <option value={ROLES.STUDENT}>Student</option>
          </select>

          {isSuperAdmin && (
            <select
              className="form-select"
              aria-label="Filter by department"
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.code} — {dept.name}
                </option>
              ))}
            </select>
          )}

          <select
            className="form-select"
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="true">Active Only</option>
            <option value="false">Inactive Only</option>
          </select>
        </div>

        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th><SortableTableHeader label="User" sortKey="full_name" currentSort={sortState} onSort={handleSort} /></th>
                <th><SortableTableHeader label="ID / Roll No" sortKey="employee_or_roll_no" currentSort={sortState} onSort={handleSort} /></th>
                <th><SortableTableHeader label="Role & Authority" sortKey="role" currentSort={sortState} onSort={handleSort} /></th>
                <th><SortableTableHeader label="Department" sortKey="department_code" currentSort={sortState} onSort={handleSort} /></th>
                <th><SortableTableHeader label="Status" sortKey="is_active" currentSort={sortState} onSort={handleSort} /></th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>
                    Loading accounts...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: 32 }}>
                    No matching user accounts found.
                  </td>
                </tr>
              ) : (
                sortedUsers.map((row) => {
                  const canMutate = canMutateTargetUser(currentUser, row);
                  const isSelf = row.id === currentUser?.id;

                  return (
                    <tr key={row.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{row.full_name}</div>
                        <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                          {row.email}
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5 }}>
                        {row.employee_or_roll_no}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <RoleBadge role={row.role} />
                          {row.role === ROLES.HOD && row.can_manage_dept_users && (
                            <span
                              className="badge badge-active"
                              title="Delegated permission to manage department faculty and student accounts"
                            >
                              <ShieldCheck size={12} />
                              Dept User Manager
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {row.department_code
                          ? `${row.department_code} — ${row.department_name}`
                          : '—'}
                      </td>
                      <td>
                        <AccountStatusBadge isActive={row.is_active} />
                      </td>
                      <td>
                        {canMutate ? (
                          <div className="table-actions">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => openEditModal(row)}
                            >
                              <Edit3 size={13} />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => setResetTarget(row)}
                            >
                              <KeyRound size={13} />
                              <span>Reset Access</span>
                            </button>

                            {!isSelf && (
                              <button
                                type="button"
                                className={`btn btn-sm ${
                                  row.is_active ? 'btn-danger' : 'btn-primary'
                                }`}
                                onClick={() => handleToggleActive(row)}
                              >
                                {row.is_active ? (
                                  <>
                                    <UserX size={13} />
                                    <span>Deactivate</span>
                                  </>
                                ) : (
                                  <>
                                    <UserCheck size={13} />
                                    <span>Activate</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="form-hint">Read-only</span>
                        )}
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
            Showing {users.length} of {meta.total} accounts (Page {meta.page} of{' '}
            {Math.max(meta.totalPages, 1)})
          </span>
          <div className="table-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= meta.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <UserFormModal
        isOpen={formState.isOpen}
        mode={formState.mode}
        initialRole={formState.initialRole}
        targetUser={formState.targetUser}
        actor={currentUser}
        departments={departments}
        onClose={() => setFormState((prev) => ({ ...prev, isOpen: false }))}
        onSuccess={handleFormSuccess}
      />

      <ResetAccessModal
        isOpen={Boolean(resetTarget)}
        targetUser={resetTarget}
        onClose={() => setResetTarget(null)}
        onCompleted={handleResetCompleted}
      />
    </div>
  );
}
