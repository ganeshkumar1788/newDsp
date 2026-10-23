/**
 * AgriMap DSP — Authentication Service API Client
 * Adapted from FarmXT to interface with AgriMap DSP's FastAPI backend.
 * Uses in-memory tokenStore and handles error serialization cleanly.
 */

import api, { tokenStore } from '../lib/api.js';
import { authConfig } from './authConfig.js';

export class AuthService {
  constructor(config = authConfig) {
    this.config = config;
  }

  // Session state helpers
  hasSession() {
    try {
      return Boolean(sessionStorage.getItem(this.config.tokenStorage.sessionKey));
    } catch {
      return false;
    }
  }

  getSavedUser() {
    try {
      const raw = sessionStorage.getItem(this.config.tokenStorage.userKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  setSession(user, token) {
    try {
      if (token) {
        tokenStore.set(token);
      }
      if (user) {
        sessionStorage.setItem(this.config.tokenStorage.userKey, JSON.stringify(user));
        sessionStorage.setItem(this.config.tokenStorage.sessionKey, '1');
      }
    } catch (err) {
      console.warn('[AuthService] Unable to write session:', err);
    }
  }

  clearSession() {
    try {
      tokenStore.clear();
      sessionStorage.removeItem(this.config.tokenStorage.userKey);
      sessionStorage.removeItem(this.config.tokenStorage.sessionKey);
      sessionStorage.removeItem('v2v_demo_user');
    } catch (err) {
      console.warn('[AuthService] Unable to clear session:', err);
    }
  }

  /**
   * Log in user via FastAPI POST /api/v1/auth/login
   */
  async login(credentials) {
    const email = (credentials.email || '').trim().toLowerCase();
    const password = credentials.password || '';

    if (!email || !password) {
      throw new Error('Please enter both your email address and password.');
    }

    try {
      // Send as application/json or urlencoded. FastAPI /auth/login handles JSON cleanly.
      const response = await api.post(this.config.endpoints.login, {
        email,
        password,
      });

      const data = response.data;
      const token = data.access_token;
      const user = {
        id: data.user_id,
        email,
        full_name: data.full_name || email.split('@')[0],
        role: data.role || 'farmer',
      };

      this.setSession(user, token);
      return { user, token };
    } catch (err) {
      // Extract clear backend error message
      const detail = err.response?.data?.detail;
      const message =
        typeof detail === 'string'
          ? detail
          : err.response?.status === 401
          ? 'Invalid email or password.'
          : err.response?.status === 403
          ? 'Your account has been deactivated.'
          : err.message || 'Unable to sign in. Please verify your connection.';
      throw new Error(message);
    }
  }

  /**
   * Register user via FastAPI POST /api/v1/auth/register
   */
  async register(formData) {
    const fullName = (formData.fullName || formData.full_name || '').trim();
    const email = (formData.email || '').trim().toLowerCase();
    const password = formData.password || '';
    const role = (formData.role || 'farmer').toLowerCase();

    // Enforce role authorization
    const allowed = this.config.signupRoles.map((r) => r.id);
    if (!allowed.includes(role)) {
      throw new Error(`Public registration for role "${role}" is not permitted.`);
    }

    if (!fullName) {
      throw new Error('Please enter your full name.');
    }
    if (!email || !email.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }
    if (password.length < (this.config.passwordRules?.minLength || 6)) {
      throw new Error(`Password must be at least ${this.config.passwordRules?.minLength || 6} characters.`);
    }

    try {
      const response = await api.post(this.config.endpoints.register, {
        email,
        password,
        full_name: fullName,
        role,
        is_active: true,
      });

      const user = response.data;
      return user;
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message =
        typeof detail === 'string'
          ? detail
          : err.response?.status === 409
          ? 'An account with this email already exists.'
          : err.message || 'Registration failed. Please check your details.';
      throw new Error(message);
    }
  }

  /**
   * Fetch current authenticated user via FastAPI GET /api/v1/auth/me
   */
  async getMe() {
    try {
      const response = await api.get(this.config.endpoints.me);
      return response.data;
    } catch (err) {
      this.clearSession();
      throw err;
    }
  }
}

export const authService = new AuthService();
export default authService;
