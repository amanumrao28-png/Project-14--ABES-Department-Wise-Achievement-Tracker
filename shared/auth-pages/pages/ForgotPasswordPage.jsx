import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { authApi } from '../../api/authApi.js';
import { AuthBrandLayout } from '../components/AuthBrandLayout.jsx';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submittedMessage, setSubmittedMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmittedMessage('');
    setSubmitting(true);

    try {
      const data = await authApi.forgotPassword(email.trim());
      setSubmittedMessage(
        data.message ||
          'If an active account exists for this email, password reset instructions have been issued.'
      );
    } catch (err) {
      setError(err.message || 'Unable to process password reset request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthBrandLayout>
      <h1 className="auth-card-title">Forgot Password</h1>
      <p className="auth-card-subtitle">
        Enter your registered institutional email to initiate a secure password reset.
      </p>

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {submittedMessage && (
        <div className="alert alert-success" role="status">
          <CheckCircle2 size={18} />
          <div>
            <div>{submittedMessage}</div>
            <div style={{ marginTop: 6, fontSize: 12.5 }}>
              If your administrator provided a reset token directly, proceed to{' '}
              <Link to="/reset-password">Reset Password</Link>.
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="fp-email">
            Institutional Email
          </label>
          <input
            id="fp-email"
            type="email"
            className="form-input"
            placeholder="name@abes.ac.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={submitting || !email.trim()}
        >
          <Mail size={16} />
          <span>{submitting ? 'Submitting...' : 'Send Reset Instructions'}</span>
        </button>
      </form>

      <div className="auth-links-row">
        <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={14} />
          <span>Back to Sign In</span>
        </Link>
        <Link to="/reset-password">Enter reset token</Link>
      </div>
    </AuthBrandLayout>
  );
}
