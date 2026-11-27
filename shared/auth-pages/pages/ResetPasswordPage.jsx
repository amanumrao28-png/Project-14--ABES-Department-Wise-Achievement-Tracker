import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import { authApi } from '../../api/authApi.js';
import {
  PasswordStrengthMeter,
  isStrongPassword
} from '../../components/PasswordStrengthMeter.jsx';
import { AuthBrandLayout } from '../components/AuthBrandLayout.jsx';

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get('token') || '';

  const [token, setToken] = useState(initialToken);
  const [tokenStatus, setTokenStatus] = useState(initialToken ? 'checking' : 'manual');
  const [tokenError, setTokenError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!initialToken) {
      setTokenStatus('manual');
      return;
    }

    let active = true;
    setTokenStatus('checking');
    setTokenError('');

    authApi
      .verifyResetToken(initialToken)
      .then(() => {
        if (active) setTokenStatus('valid');
      })
      .catch((err) => {
        if (active) {
          setTokenStatus('invalid');
          setTokenError(err.message || 'This reset link is invalid or has expired.');
        }
      });

    return () => {
      active = false;
    };
  }, [initialToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!token.trim()) {
      setError('A valid reset token is required.');
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setError('Password does not meet all security requirements.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await authApi.resetPassword(token.trim(), newPassword);
      setSuccessMsg(data.message || 'Password has been reset successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthBrandLayout>
      <h1 className="auth-card-title">Reset Password</h1>
      <p className="auth-card-subtitle">
        Set a strong new password for your ABES Achievement Tracker account.
      </p>

      {tokenStatus === 'checking' && (
        <div className="alert alert-info">
          <span>Verifying your password reset token...</span>
        </div>
      )}

      {tokenStatus === 'invalid' && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={18} />
          <div>
            <div>{tokenError}</div>
            <div style={{ marginTop: 6, fontSize: 12.5 }}>
              <Link to="/forgot-password">Request a new reset link</Link>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg ? (
        <div>
          <div className="alert alert-success" role="status">
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
          <Link to="/login" className="btn btn-primary btn-block">
            Continue to Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {!initialToken && (
            <div className="form-group">
              <label className="form-label" htmlFor="rp-token">
                Reset Token
              </label>
              <input
                id="rp-token"
                type="text"
                className="form-input"
                placeholder="Paste your one-time reset token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="rp-new">
              New Password
            </label>
            <div className="input-with-icon">
              <input
                id="rp-new"
                type={showPasswords ? 'text' : 'password'}
                className="form-input"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={tokenStatus === 'invalid'}
                required
                autoComplete="new-password"
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
            <PasswordStrengthMeter password={newPassword} />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="rp-confirm">
              Confirm New Password
            </label>
            <input
              id="rp-confirm"
              type={showPasswords ? 'text' : 'password'}
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={tokenStatus === 'invalid'}
              required
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={submitting || tokenStatus === 'checking' || tokenStatus === 'invalid'}
          >
            <KeyRound size={16} />
            <span>{submitting ? 'Resetting password...' : 'Reset Password'}</span>
          </button>
        </form>
      )}

      <div className="auth-links-row">
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} />
          <span>Back to Sign In</span>
        </Link>
      </div>
    </AuthBrandLayout>
  );
}
