import { useEffect, useState } from 'react';
import { AlertCircle, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Modal } from '@shared/components/Modal.jsx';
import {
  PasswordStrengthMeter,
  generateSecurePassword,
  isStrongPassword
} from '@shared/components/PasswordStrengthMeter.jsx';
import { ROLES, ROLE_LABELS } from '@shared/constants/roles.js';
import { getManageableRolesForActor } from '@shared/rbac/permissions.js';
import { usersApi } from '@shared/api/usersApi.js';

export function UserFormModal({
  isOpen,
  mode = 'create',
  initialRole = ROLES.FACULTY,
  targetUser = null,
  actor,
  departments = [],
  onClose,
  onSuccess
}) {
  const isSuperAdmin = actor?.role === ROLES.SUPER_ADMIN;
  const manageableRoles = getManageableRolesForActor(actor);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState(initialRole);
  const [departmentId, setDepartmentId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [canManageDeptUsers, setCanManageDeptUsers] = useState(false);
  const [canCoordinateStudentApprovals, setCanCoordinateStudentApprovals] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');

    if (mode === 'edit' && targetUser) {
      setFullName(targetUser.full_name || '');
      setEmail(targetUser.email || '');
      setIdentifier(targetUser.employee_or_roll_no || '');
      setRole(targetUser.role || ROLES.FACULTY);
      setDepartmentId(targetUser.department_id || '');
      setPassword('');
      setIsActive(Boolean(targetUser.is_active));
      setCanManageDeptUsers(Boolean(targetUser.can_manage_dept_users));
      setCanCoordinateStudentApprovals(Boolean(targetUser.can_coordinate_student_approvals));
    } else {
      const defaultRole = manageableRoles.includes(initialRole)
        ? initialRole
        : manageableRoles[0] || ROLES.FACULTY;
      setFullName('');
      setEmail('');
      setIdentifier('');
      setRole(defaultRole);
      setDepartmentId(
        isSuperAdmin ? departments[0]?.id || '' : actor?.department_id || ''
      );
      setPassword('');
      setIsActive(true);
      setCanManageDeptUsers(false);
      setCanCoordinateStudentApprovals(false);
    }
  }, [isOpen, mode, targetUser, initialRole, actor, departments, isSuperAdmin]);

  const handleGeneratePassword = () => {
    setPassword(generateSecurePassword(12));
    setShowPassword(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (mode === 'create' && !isStrongPassword(password)) {
      setError('Please enter or generate a password meeting all strength requirements.');
      return;
    }

    if (mode === 'edit' && password && !isStrongPassword(password)) {
      setError('Replacement password does not meet strength requirements.');
      return;
    }

    setSubmitting(true);
    try {
      let savedUser;
      if (mode === 'create') {
        const payload = {
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          employee_or_roll_no: identifier.trim(),
          role,
          department_id: isSuperAdmin ? departmentId : actor.department_id,
          password
        };
        if (isSuperAdmin && role === ROLES.HOD) {
          payload.can_manage_dept_users = canManageDeptUsers;
        }
        if (role === ROLES.FACULTY) {
          payload.can_coordinate_student_approvals = canCoordinateStudentApprovals;
        }
        savedUser = await usersApi.createUser(payload);
      } else {
        const payload = {
          full_name: fullName.trim(),
          email: email.trim().toLowerCase(),
          employee_or_roll_no: identifier.trim(),
          role,
          department_id: isSuperAdmin ? departmentId : actor.department_id,
          is_active: isActive
        };
        if (password) {
          payload.password = password;
        }
        if (isSuperAdmin) {
          payload.can_manage_dept_users = role === ROLES.HOD ? canManageDeptUsers : false;
        }
        payload.can_coordinate_student_approvals =
          role === ROLES.FACULTY ? canCoordinateStudentApprovals : false;
        savedUser = await usersApi.updateUser(targetUser.id, payload);
      }

      onSuccess(savedUser, mode);
    } catch (err) {
      setError(err.message || 'Unable to save user account.');
    } finally {
      setSubmitting(false);
    }
  };

  const title =
    mode === 'create'
      ? `Create ${ROLE_LABELS[role] || 'User'} Account`
      : `Edit Account — ${targetUser?.full_name || ''}`;

  return (
    <Modal isOpen={isOpen} title={title} onClose={() => !submitting && onClose()} maxWidth={580}>
      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="uf-name">
              Full Name
            </label>
            <input
              id="uf-name"
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              minLength={2}
              placeholder="e.g. Dr. Ananya Verma"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="uf-id">
              Employee ID / Roll No
            </label>
            <input
              id="uf-id"
              type="text"
              className="form-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              placeholder="e.g. ABES-CS-FAC-012"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="uf-email">
            Institutional Email
          </label>
          <input
            id="uf-email"
            type="email"
            className="form-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="name@abes.ac.in"
          />
        </div>

        <div className="form-grid-2">
          <div className="form-group">
            <label className="form-label" htmlFor="uf-role">
              Assigned Role
            </label>
            <select
              id="uf-role"
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
            >
              {manageableRoles.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="uf-dept">
              Assigned Department
            </label>
            <select
              id="uf-dept"
              className="form-select"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              disabled={!isSuperAdmin}
              required
            >
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.code} — {dept.name}
                </option>
              ))}
            </select>
            {!isSuperAdmin && (
              <span className="form-hint">Locked to your assigned department.</span>
            )}
          </div>
        </div>

        {isSuperAdmin && role === ROLES.HOD && (
          <div className="form-group">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={canManageDeptUsers}
                onChange={(e) => setCanManageDeptUsers(e.target.checked)}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  Grant Department User Management Permission
                </div>
                <div className="form-hint">
                  Allows this HOD to create, edit, deactivate, and reset access for Faculty and
                  Student accounts strictly within their assigned department.
                </div>
              </div>
            </label>
          </div>
        )}

        {role === ROLES.FACULTY && (
          <div className="form-group">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={canCoordinateStudentApprovals}
                onChange={(e) => setCanCoordinateStudentApprovals(e.target.checked)}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  Authorize as Student Achievement Faculty Coordinator
                </div>
                <div className="form-hint">
                  Allows this faculty member to review and approve student achievement submissions
                  at department level within their assigned department.
                </div>
              </div>
            </label>
          </div>
        )}

        {mode === 'edit' && (
          <div className="form-group">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={targetUser?.id === actor?.id}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Account Active</div>
                <div className="form-hint">
                  Deactivating revokes all active refresh tokens immediately and blocks sign-in.
                </div>
              </div>
            </label>
          </div>
        )}

        <div className="form-group">
          <div className="form-label">
            <label htmlFor="uf-password">
              {mode === 'create' ? 'Initial Password' : 'Reset Password (Optional)'}
            </label>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handleGeneratePassword}
              style={{ height: 26, padding: '0 8px' }}
            >
              <RefreshCw size={12} />
              <span>Generate Strong Password</span>
            </button>
          </div>

          <div className="input-with-icon">
            <input
              id="uf-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={mode === 'create'}
              placeholder={
                mode === 'create'
                  ? 'Enter or generate a strong password'
                  : 'Leave blank to keep existing password'
              }
              autoComplete="new-password"
            />
            <button
              type="button"
              className="input-icon-btn"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {(mode === 'create' || password.length > 0) && (
            <PasswordStrengthMeter password={password} />
          )}
        </div>

        <div className="modal-footer" style={{ margin: '0 -22px -22px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting
              ? 'Saving...'
              : mode === 'create'
                ? 'Create Account'
                : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
