import { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { PasswordStrengthMeter, isStrongPassword } from './PasswordStrengthMeter.jsx';
import { authApi } from '../../core/api/authApi.js';
import { useAuth } from '../../core/auth/AuthContext.jsx';

export function ChangePasswordModal({ isOpen, onClose }) {
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setSuccessMsg('');
  };

  const handleClose = () => {
    if (submitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!isStrongPassword(newPassword)) {
      setError('New password does not meet the institutional password requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.changePassword(currentPassword, newPassword);
      setSuccessMsg(res.message || 'Password updated. Redirecting to login...');
      setTimeout(() => {
        resetForm();
        onClose();
        logout();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to update password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} title="Change Account Password" onClose={handleClose} maxWidth={460}>
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="cp-current">
            Current Password
          </label>
          <div className="input-with-icon">
            <input
              id="cp-current"
              type={showPasswords ? 'text' : 'password'}
              className="form-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="input-icon-btn"
              onClick={() => setShowPasswords((v) => !v)}
              aria-label={showPasswords ? 'Hide passwords' : 'Show passwords'}
            >
              {showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="cp-new">
            New Password
          </label>
          <input
            id="cp-new"
            type={showPasswords ? 'text' : 'password'}
            className="form-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <PasswordStrengthMeter password={newPassword} />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="cp-confirm">
            Confirm New Password
          </label>
          <input
            id="cp-confirm"
            type={showPasswords ? 'text' : 'password'}
            className="form-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="modal-footer" style={{ margin: '0 -22px -22px' }}>
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
