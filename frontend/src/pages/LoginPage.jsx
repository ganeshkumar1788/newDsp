import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BrandHeader } from '../auth/components/BrandHeader';
import { authConfig } from '../auth/authConfig';
import '../auth/styles/auth.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Success message passed from registration
  const registrationSuccessMsg = location.state?.message;

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (user) {
      const fromPath = location.state?.from?.pathname;
      const target = fromPath || authConfig.redirects.redirectAfterLogin(user);
      navigate(target, { replace: true });
    }
  }, [user, location.state, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setErrorMsg('');
    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(cleanEmail, password);
      const destination =
        location.state?.from?.pathname ||
        authConfig.redirects.redirectAfterLogin(result?.user || result);
      navigate(destination, { replace: true });
    } catch (err) {
      setErrorMsg(err.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agrimap-auth-page">
      {/* Top Header: V2V Tech AGRIMAP DSP & Support */}
      <BrandHeader />

      {/* Main Login Card Container (Reference Image 2) */}
      <main className="agrimap-login-container">
        <div className="agrimap-login-card">
          <h1 className="agrimap-card-title">Sign in to AgriMap</h1>
          <p className="agrimap-card-subtitle">
            Enter your credentials to access the verified agricultural spatial platform.
          </p>

          {/* Registration Success Banner */}
          {registrationSuccessMsg && !errorMsg && (
            <div className="agrimap-alert agrimap-alert--success" role="status">
              <ShieldCheck size={18} style={{ flexShrink: 0 }} />
              <span>{registrationSuccessMsg}</span>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="agrimap-alert agrimap-alert--error" role="alert" aria-live="polite">
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email Address */}
            <div className="agrimap-form-group">
              <label htmlFor="login-email" className="agrimap-label">
                EMAIL ADDRESS
              </label>
              <div className="agrimap-input-wrapper">
                <span className="agrimap-input-icon-left">
                  <Mail size={18} />
                </span>
                <input
                  id="login-email"
                  type="email"
                  className="agrimap-input"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="agrimap-form-group">
              <label htmlFor="login-password" className="agrimap-label">
                PASSWORD
              </label>
              <div className="agrimap-input-wrapper">
                <span className="agrimap-input-icon-left">
                  <Lock size={18} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="agrimap-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
                <div className="agrimap-input-icon-right">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="agrimap-btn-icon"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="agrimap-forgot-link"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Forgot password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="agrimap-btn-submit"
              aria-busy={loading}
            >
              {loading ? (
                <>
                  <span className="agrimap-spinner" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Switch to Register */}
          <div className="agrimap-switch-row">
            <span>Don't have an account?</span>
            <Link to="/register" className="agrimap-switch-link">
              Create an account
            </Link>
          </div>
        </div>

        {/* Security / Encryption Footer */}
        <div className="agrimap-security-footer">
          <ShieldCheck size={16} className="agrimap-security-icon" />
          <span>Protected by 256-bit PostGIS spatial security and encrypted authentication.</span>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setShowForgotModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-[#E7E0F0] text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-[#F5F3FA] text-[#6530A0] flex items-center justify-center mx-auto mb-3">
              <Lock size={22} />
            </div>
            <h3 className="text-base font-bold text-[#25143E] mb-2">Password Recovery</h3>
            <p className="text-xs text-[#82758F] leading-relaxed mb-5">
              To securely recover your account credentials or reset your password, contact your
              district administrator or reach support at{' '}
              <a href="mailto:support@v2vtech.com" className="text-[#6530A0] font-semibold underline">
                support@v2vtech.com
              </a>.
            </p>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#35105F] text-white text-xs font-semibold hover:bg-[#6530A0] transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Page Base Spacer */}
      <footer style={{ height: '1.5rem' }} />
    </div>
  );
}
