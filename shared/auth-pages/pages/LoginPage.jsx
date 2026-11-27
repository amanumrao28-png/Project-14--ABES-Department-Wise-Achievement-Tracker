import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { AuthBrandLayout } from '../components/AuthBrandLayout.jsx';

export function LoginPage({
  portalTitle = 'Sign in to Portal',
  portalSubtitle = 'Use your ABES institutional credentials to access your workspace.',
  brandSubtitle = 'Department-Wise Achievement Tracker',
  defaultRedirect = '/dashboard'
}) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const requestedRedirect = location.state?.from || null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email.trim(), password);
      const destination =
        requestedRedirect && requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//')
          ? requestedRedirect
          : defaultRedirect;
      navigate(destination, { replace: true });
    } catch (err) {
      if (err.status === 429) {
        setError(err.message || 'Too many login attempts. Please wait 15 minutes and try again.');
      } else {
        setError(err.message || 'Invalid email or password.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthBrandLayout subtitle={brandSubtitle}>
      <h1 className="auth-card-title">{portalTitle}</h1>
      <p className="auth-card-subtitle">{portalSubtitle}</p>

      {error && (
        <div className="alert alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="login-email">
            Institutional Email
          </label>
          <input
            id="login-email"
            type="email"
            className="form-input"
            placeholder="name@abes.ac.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="login-password">
            Password
          </label>
          <div className="input-with-icon">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              className="input-icon-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary btn-block"
          disabled={submitting || !email.trim() || !password}
        >
          <LogIn size={16} />
          <span>{submitting ? 'Signing in...' : 'Sign In'}</span>
        </button>
      </form>

      <div className="auth-links-row">
        <Link to="/forgot-password">Forgot password?</Link>
        <Link to="/reset-password">Have a reset token?</Link>
      </div>
    </AuthBrandLayout>
  );
}
