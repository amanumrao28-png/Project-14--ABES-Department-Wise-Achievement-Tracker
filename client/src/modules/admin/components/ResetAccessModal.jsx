import { useEffect, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, Copy, KeyRound, RefreshCw, ShieldOff } from 'lucide-react';
import { Modal } from '../../../shared/components/Modal.jsx';
import {
  PasswordStrengthMeter,
  generateSecurePassword,
  isStrongPassword
} from '../../../shared/components/PasswordStrengthMeter.jsx';
import { usersApi } from '../../../core/api/usersApi.js';

export function ResetAccessModal({ isOpen, targetUser, onClose, onCompleted }) {
  const [mode, setMode] = useState('reset_link');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [activateAccount, setActivateAccount] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setMode('reset_link');
    setTemporaryPassword('');
    setActivateAccount(targetUser ? !targetUser.is_active : false);
    setError('');
    setResult(null);
    setCopied(false);
  }, [isOpen, targetUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (mode === 'temporary_password' && !isStrongPassword(temporaryPassword)) {
      setError('Temporary password must satisfy all password policy rules.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        mode,
        ...(mode === 'temporary_password' ? { temporaryPassword } : {}),
        ...(activateAccount ? { activateAccount: true } : {})
      };
      const data = await usersApi.resetUserAccess(targetUser.id, payload);
      setResult(data);
      onCompleted(data.user);
    } catch (err) {
      setError(err.message || 'Failed to reset user access.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API fallback ignored
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      title={`Reset User Access — ${targetUser?.full_name || ''}`}
      onClose={() => !submitting && onClose()}
      maxWidth={520}
    >
      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {result ? (
        <div>
          <div className="alert alert-success">
            <CheckCircle2 size={18} />
            <div>
              <strong>Access Reset Completed</strong>
              <div>{result.message}</div>
            </div>
          </div>

          {result.resetUrl && (
            <div className="form-group">
              <label className="form-label">One-Time Password Reset Link (Valid 30 mins)</label>
              <div className="mono-box">{result.resetUrl}</div>
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleCopy(result.resetUrl)}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied Link' : 'Copy Reset Link'}</span>
                </button>
              </div>
            </div>
          )}

          <div className="modal-footer" style={{ margin: '18px -22px -22px' }}>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p style={{ marginTop: 0, fontSize: 13.5, color: 'var(--color-text-secondary)' }}>
            Account: <strong>{targetUser?.email}</strong>. Every mode immediately revokes all active
            refresh sessions for this user.
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="ra-mode">
              Reset Action
            </label>
            <select
              id="ra-mode"
              className="form-select"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="reset_link">
                Issue One-Time Password Reset Link & Revoke Sessions
              </option>
              <option value="temporary_password">
                Assign Temporary Password & Revoke Sessions
              </option>
              <option value="revoke_sessions">
                Revoke All Active Sessions Only (Force Re-Login)
              </option>
            </select>
          </div>

          {mode === 'temporary_password' && (
            <div className="form-group">
              <div className="form-label">
                <label htmlFor="ra-temp-pw">Temporary Password</label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ height: 26, padding: '0 8px' }}
                  onClick={() => setTemporaryPassword(generateSecurePassword(12))}
                >
                  <RefreshCw size={12} />
                  <span>Generate</span>
                </button>
              </div>
              <input
                id="ra-temp-pw"
                type="text"
                className="form-input"
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                required
                placeholder="Enter strong temporary password"
              />
              <PasswordStrengthMeter password={temporaryPassword} />
            </div>
          )}

          {targetUser && !targetUser.is_active && (
            <div className="form-group">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={activateAccount}
                  onChange={(e) => setActivateAccount(e.target.checked)}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    Reactivate Account Simultaneously
                  </div>
                  <div className="form-hint">
                    This account is currently deactivated. Check to restore active login status.
                  </div>
                </div>
              </label>
            </div>
          )}

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
              {mode === 'revoke_sessions' ? <ShieldOff size={15} /> : <KeyRound size={15} />}
              <span>{submitting ? 'Applying...' : 'Reset User Access'}</span>
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
