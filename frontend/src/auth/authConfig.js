/**
 * AgriMap DSP — Authentication Configuration
 * Adapted from FarmXT authentication contract for AgriMap DSP & V2V Tech.
 * Connects seamlessly to FastAPI endpoints and preserves all existing roles.
 */

export const authConfig = {
  // 1. API Configuration
  apiBaseUrl: (typeof import.meta !== 'undefined' && import.meta?.env?.VITE_API_URL) || '/api/v1',
  endpoints: {
    login: '/auth/login',
    register: '/auth/register',
    me: '/auth/me',
  },

  // 2. Token Storage Strategy (In-memory + sessionStorage flag)
  tokenStorage: {
    sessionKey: 'agrimap_session',
    userKey: 'v2v_auth_user',
  },

  // 3. Brand Identity (V2V Tech / AgriMap DSP)
  brand: {
    name: 'AgriMap DSP',
    shortName: 'AgriMap',
    productName: 'AGRIMAP DSP',
    tagline: 'Verified Spatial Agriculture & Digital Twins',
    companyName: 'V2V Tech · Vision To Value Technologies',
    logoUrl: '/images/v2v-icon.png',
    supportEmail: 'support@v2vtech.com',
  },

  // 4. Allowed Public Sign-up Roles (Farmer, Consumer, Dealer)
  // Privileged roles (Admin, Surveyor, Verifier) are strictly disallowed on public signup.
  signupRoles: [
    {
      id: 'farmer',
      title: 'Farmer',
      badge: 'Grower & Land Owner',
      desc: 'Locate farmland on interactive map, manage tubewell pumps, and list harvest produce.',
    },
    {
      id: 'consumer',
      title: 'Consumer',
      badge: 'Direct Buyer',
      desc: 'Purchase fresh, verified agricultural produce directly from verified farmers.',
    },
    {
      id: 'dealer',
      title: 'Dealer',
      badge: 'Procurement Partner',
      desc: 'Procure bulk agricultural lots and supply high-grade farming equipment & inputs.',
    },
  ],

  // 5. Navigation & Role-based Redirect Rules
  redirects: {
    loginRoute: '/login',
    registerRoute: '/register',
    redirectAfterLogin: (user) => {
      if (!user) return '/login';
      const role = (user.role || '').toLowerCase();
      if (role === 'farmer') return '/farmer';
      if (role === 'consumer') return '/marketplace';
      if (role === 'dealer') return '/dealer';
      if (role === 'admin') return '/admin/farmers';
      if (role === 'verifier' || role === 'land_verifier' || role === 'surveyor') {
        return '/admin/editor/field-1';
      }
      return '/farmer';
    },
    redirectAfterLogout: () => '/login',
  },

  // 6. Password Policy
  passwordRules: {
    minLength: 6,
  },
};

export default authConfig;
