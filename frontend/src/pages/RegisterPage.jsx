import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sprout,
  ShoppingBag,
  Store,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BrandHeader } from '../auth/components/BrandHeader';
import { authConfig } from '../auth/authConfig';
import '../auth/styles/auth.css';

// Role Icons map using Lucide outline icons
const ROLE_ICONS = {
  farmer: <Sprout size={18} />,
  consumer: <ShoppingBag size={18} />,
  dealer: <Store size={18} />,
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, register } = useAuth();

  const [selectedRole, setSelectedRole] = useState(() => authConfig.signupRoles[0]?.id || 'farmer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate(authConfig.redirects.redirectAfterLogin(user), { replace: true });
    }
  }, [user, navigate]);

  const activeRoleConfig =
    authConfig.signupRoles.find((r) => r.id === selectedRole) || authConfig.signupRoles[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setErrorMsg('');
    const cleanName = fullName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.length < (authConfig.passwordRules?.minLength || 6)) {
      setErrorMsg(`Password must be at least ${authConfig.passwordRules?.minLength || 6} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify your password entry.');
      return;
    }

    setLoading(true);
    try {
      await register({
        full_name: cleanName,
        email: cleanEmail,
        password,
        role: selectedRole,
      });

      navigate('/login', {
        state: {
          message: `Your ${activeRoleConfig.title} account was created successfully! Please sign in.`,
        },
      });
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg =
        typeof detail === 'string'
          ? detail
          : err.message || 'Registration failed. Please check your information and try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agrimap-auth-page">
      {/* Top Header: V2V Tech AGRIMAP DSP & Support */}
      <BrandHeader />

      {/* Main Split-Panel Registration Container (Reference Image 1) */}
      <main className="agrimap-register-container">
        <div className="agrimap-split-card">
          {/* Left Branding Panel */}
          <div className="agrimap-hero-panel">
            <div className="agrimap-hero-pattern" />
            <div className="agrimap-hero-glow" />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div className="agrimap-ecosystem-badge">
                <ShieldCheck size={14} />
                <span>V2V Tech Ecosystem</span>
              </div>
              <h2 className="agrimap-hero-heading">Create Your Account</h2>
              <p className="agrimap-hero-desc">
                Connecting farmers, consumers, dealers, and spatial agricultural data across the
                unified AgriMap platform.
              </p>
            </div>

            <div className="agrimap-hero-footer" style={{ position: 'relative', zIndex: 1 }}>
              {authConfig.brand.companyName}
            </div>
          </div>

          {/* Right Registration Form */}
          <div className="agrimap-form-panel">
            <span className="agrimap-step-tag">STEP 1 OF 1 · INSTANT ACCOUNT CREATION</span>
            <h1 className="agrimap-card-title">Join AgriMap</h1>
            <p className="agrimap-card-subtitle" style={{ marginBottom: '1.25rem' }}>
              Select your role and create your verified account.
            </p>

            {/* Role Cards (Farmer, Consumer, Dealer) */}
            <div className="agrimap-role-grid" role="radiogroup" aria-label="Select Account Role">
              {authConfig.signupRoles.map((role) => {
                const isSelected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role.id);
                      setErrorMsg('');
                    }}
                    role="radio"
                    aria-checked={isSelected}
                    className={`agrimap-role-card ${isSelected ? 'agrimap-role-card--active' : ''}`}
                  >
                    <div className="agrimap-role-icon">{ROLE_ICONS[role.id]}</div>
                    <span className="agrimap-role-title">{role.title}</span>
                    <span className="agrimap-role-badge">{role.badge}</span>
                  </button>
                );
              })}
            </div>

            {/* Selected Role Summary */}
            <div
              style={{
                backgroundColor: '#FAF8FD',
                border: '1px solid #E7E0F0',
                borderRadius: '10px',
                padding: '0.65rem 0.85rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.78125rem',
                color: '#6530A0',
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>
                Registering as a <strong>{activeRoleConfig.title}</strong>: {activeRoleConfig.desc}
              </span>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="agrimap-alert agrimap-alert--error" role="alert" aria-live="polite">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Full Name */}
              <div className="agrimap-form-group">
                <label htmlFor="reg-fullname" className="agrimap-label">
                  FULL NAME
                </label>
                <div className="agrimap-input-wrapper">
                  <span className="agrimap-input-icon-left">
                    <User size={18} />
                  </span>
                  <input
                    id="reg-fullname"
                    type="text"
                    className="agrimap-input"
                    placeholder="e.g. Ramesh Patel"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="agrimap-form-group">
                <label htmlFor="reg-email" className="agrimap-label">
                  EMAIL ADDRESS
                </label>
                <div className="agrimap-input-wrapper">
                  <span className="agrimap-input-icon-left">
                    <Mail size={18} />
                  </span>
                  <input
                    id="reg-email"
                    type="email"
                    className="agrimap-input"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="agrimap-form-group">
                <label htmlFor="reg-password" className="agrimap-label">
                  PASSWORD
                </label>
                <div className="agrimap-input-wrapper">
                  <span className="agrimap-input-icon-left">
                    <Lock size={18} />
                  </span>
                  <input
                    id="reg-password"
                    type={showPassword ? 'text' : 'password'}
                    className="agrimap-input"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
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
              </div>

              {/* Confirm Password */}
              <div className="agrimap-form-group">
                <label htmlFor="reg-confirm-password" className="agrimap-label">
                  CONFIRM PASSWORD
                </label>
                <div className="agrimap-input-wrapper">
                  <span className="agrimap-input-icon-left">
                    <Lock size={18} />
                  </span>
                  <input
                    id="reg-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="agrimap-input"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    disabled={loading}
                  />
                  <div className="agrimap-input-icon-right">
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="agrimap-btn-icon"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Dynamic Role Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="agrimap-btn-submit"
                aria-busy={loading}
              >
                {loading ? (
                  <>
                    <span className="agrimap-spinner" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create {activeRoleConfig.title} Account</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>

            {/* Switch to Login */}
            <div className="agrimap-switch-row">
              <span>Already have an account?</span>
              <Link to="/login" className="agrimap-switch-link">
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Security / Encryption Footer */}
        <div className="agrimap-security-footer">
          <ShieldCheck size={16} className="agrimap-security-icon" />
          <span>Protected by 256-bit PostGIS spatial security and encrypted authentication.</span>
        </div>
      </main>

      {/* Page Base Spacer */}
      <footer style={{ height: '1.5rem' }} />
    </div>
  );
}
