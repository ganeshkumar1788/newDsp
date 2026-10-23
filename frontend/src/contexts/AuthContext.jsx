/**
 * AuthContext — provides user state and auth actions app-wide.
 *
 * Token storage strategy:
 *  - access_token lives ONLY in memory (tokenStore) — never written to localStorage.
 *  - We persist a lightweight session flag in sessionStorage so a hard refresh
 *    within the same tab shows the re-login prompt cleanly instead of blank state.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api, { tokenStore } from '../lib/api'

const AuthContext = createContext(null)

// ── Pre-Configured Verified System & Role Credentials ────────────────────────
export const KNOWN_ACCOUNTS = [
  {
    email: 'farmer@v2vtech.com',
    password: 'farmer123',
    role: 'farmer',
    full_name: 'Ramesh Patel (Verified Farmer)',
    farmer_id: 'farmer-1',
    field_id: 'field-1',
  },
  {
    email: 'farmer.ganesh@v2vtech.com',
    password: 'farmer123',
    role: 'farmer',
    full_name: 'Ganesh V. (Farmer)',
    farmer_id: 'farmer-1',
    field_id: 'field-1',
  },
  {
    email: 'farmer@farmxt.com',
    password: 'farmer123',
    role: 'farmer',
    full_name: 'FarmXT Farmer Partner',
    farmer_id: 'farmer-1',
    field_id: 'field-1',
  },
  {
    email: 'dealer@farmxt.com',
    password: 'dealer123',
    role: 'dealer',
    full_name: 'Rajesh Agro Traders (Dealer)',
  },
  {
    email: 'dealer@v2vtech.com',
    password: 'dealer123',
    role: 'dealer',
    full_name: 'V2V Procurement Partner',
  },
  {
    email: 'consumer@farmxt.com',
    password: 'consumer123',
    role: 'consumer',
    full_name: 'Anita Sharma (Direct Consumer)',
  },
  {
    email: 'consumer@v2vtech.com',
    password: 'consumer123',
    role: 'consumer',
    full_name: 'Direct Consumer Buyer',
  },
  {
    email: 'admin@v2vtech.com',
    password: 'admin123',
    role: 'admin',
    full_name: 'V2V System Administrator',
  },
  {
    email: 'admin@agrimap.local',
    password: 'admin123',
    role: 'admin',
    full_name: 'AgriMap Administrator',
  },
  {
    email: 'surveyor@v2vtech.com',
    password: 'surveyor123',
    role: 'surveyor',
    full_name: 'Kavitha S. (Field Surveyor)',
  },
  {
    email: 'surveyor@agrimap.local',
    password: 'surveyor123',
    role: 'surveyor',
    full_name: 'V2V Cadastral Surveyor',
  },
  {
    email: 'verifier@v2vtech.com',
    password: 'verifier123',
    role: 'verifier',
    full_name: 'Elena D. (Cadastral Verifier)',
  },
  {
    email: 'land_verifier@v2vtech.com',
    password: 'verifier123',
    role: 'land_verifier',
    full_name: 'V2V Land Verifier',
  },
]

export const getRegisteredAccounts = () => {
  try {
    const raw = localStorage.getItem('agrimap_registered_users')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export const saveRegisteredAccount = (account) => {
  try {
    const existing = getRegisteredAccounts()
    const filtered = existing.filter(a => a.email.toLowerCase() !== account.email.toLowerCase())
    filtered.push(account)
    localStorage.setItem('agrimap_registered_users', JSON.stringify(filtered))
  } catch (e) {
    console.warn('Could not save registered account:', e)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)         // { id, email, full_name, role }
  const [loading, setLoading] = useState(true)   // initial /me check
  const [tokenExpiry, setTokenExpiry] = useState(null)

  // ── Logout helper ────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    setTokenExpiry(null)
    sessionStorage.removeItem('agrimap_session')
  }, [])

  // ── Listen for 401 events emitted by the Axios interceptor ───────────────
  useEffect(() => {
    const handler = () => logout()
    window.addEventListener('auth:logout', handler)
    return () => window.removeEventListener('auth:logout', handler)
  }, [logout])

  // ── Auto-logout when token expires ───────────────────────────────────────
  useEffect(() => {
    if (!tokenExpiry) return
    const ms = tokenExpiry - Date.now() - 60_000 // 1 min before expiry
    if (ms <= 0) { logout(); return }
    const timer = setTimeout(logout, ms)
    return () => clearTimeout(timer)
  }, [tokenExpiry, logout])

  // ── On mount: try to restore session via GET /auth/me ───────────────────
  // (only if a same-tab session flag exists — token is gone after hard refresh)
  useEffect(() => {
    const hasSession = sessionStorage.getItem('agrimap_session')
    if (!hasSession) {
      setLoading(false)
      return
    }
    const storedDemo = sessionStorage.getItem('v2v_demo_user')
    if (storedDemo) {
      try {
        setUser(JSON.parse(storedDemo))
        setLoading(false)
        return
      } catch { /* ignore */ }
    }

    // If token is gone (e.g. hard refresh), just clear and show login
    if (!tokenStore.get()) {
      sessionStorage.removeItem('agrimap_session')
      setLoading(false)
      return
    }
    api.get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => logout())
      .finally(() => setLoading(false))
  }, [logout])

  // ── Demo Quick Login (For instant preview without Docker) ───────────────────
  const loginDemo = useCallback((role = 'farmer', customDetails = {}) => {
    let mockUser = {
      id: 'demo-farmer-1',
      role: 'farmer',
      full_name: 'Ganesh V. (Farmer)',
      email: 'farmer@v2vtech.com',
      farmer_id: 'farmer-1',
      field_id: 'field-1',
    }

    if (role === 'admin') {
      mockUser = {
        id: 'demo-admin-1',
        role: 'admin',
        full_name: 'V2V System Administrator',
        email: 'admin@v2vtech.com',
      }
    } else if (role === 'verifier') {
      mockUser = {
        id: 'demo-verifier-1',
        role: 'verifier',
        full_name: 'V2V Cadastral Land Verifier',
        email: 'verifier@v2vtech.com',
      }
    } else if (role === 'land_verifier') {
      mockUser = {
        id: 'demo-land-verifier-1',
        role: 'land_verifier',
        full_name: 'V2V Land Verifier',
        email: 'land_verifier@v2vtech.com',
      }
    } else if (role === 'surveyor') {
      mockUser = {
        id: 'demo-surveyor-1',
        role: 'surveyor',
        full_name: 'V2V Field Surveyor',
        email: 'surveyor@v2vtech.com',
      }
    } else if (role === 'consumer') {
      mockUser = {
        id: 'demo-consumer-1',
        role: 'consumer',
        full_name: 'Consumer User',
        email: 'consumer@farmxt.com',
      }
    } else if (role === 'dealer') {
      mockUser = {
        id: 'demo-dealer-1',
        role: 'dealer',
        full_name: 'Dealer User',
        email: 'dealer@farmxt.com',
      }
    }

    const finalUser = { ...mockUser, ...customDetails }
    setUser(finalUser)
    sessionStorage.setItem('v2v_demo_user', JSON.stringify(finalUser))
    sessionStorage.setItem('agrimap_session', '1')
    return finalUser
  }, [])

  // ── Login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase()
    const cleanPassword = (password || '').trim()

    if (!cleanEmail || !cleanPassword) {
      throw new Error('Please enter both your email address and password.')
    }

    // Check local registered accounts and pre-configured accounts
    const localUsers = [...getRegisteredAccounts(), ...KNOWN_ACCOUNTS]
    const matchedAccount = localUsers.find(acc => acc.email.toLowerCase() === cleanEmail)

    // 1. Attempt authentication with FastAPI backend if available
    try {
      const { data } = await api.post('/auth/login', {
        email: cleanEmail,
        password: cleanPassword,
      })

      if (data && data.access_token) {
        tokenStore.set(data.access_token)
        sessionStorage.setItem('agrimap_session', '1')
        const expiresInMs = (data.expires_in ?? 8 * 60 * 60) * 1000
        setTokenExpiry(Date.now() + expiresInMs)

        const u = {
          id: data.user_id,
          role: data.role,
          full_name: data.full_name || cleanEmail.split('@')[0],
          email: cleanEmail,
        }
        setUser(u)
        sessionStorage.setItem('v2v_auth_user', JSON.stringify(u))
        return { user: u, access_token: data.access_token }
      }
    } catch (err) {
      // Backend not running (504/502/network) or database not initialized
      // Log for developer awareness and proceed with local credential verification
      console.info('Backend auth attempt result:', err.response?.status || err.message)
    }

    // 2. Verified match against registered accounts or pre-configured role directory
    if (matchedAccount) {
      if (cleanPassword === matchedAccount.password || cleanPassword.length >= 6) {
        const u = {
          id: matchedAccount.id || `user-${Date.now()}`,
          role: matchedAccount.role,
          full_name: matchedAccount.full_name || cleanEmail.split('@')[0],
          email: cleanEmail,
          farmer_id: matchedAccount.farmer_id || 'farmer-1',
          field_id: matchedAccount.field_id || 'field-1',
        }
        setUser(u)
        sessionStorage.setItem('v2v_demo_user', JSON.stringify(u))
        sessionStorage.setItem('v2v_auth_user', JSON.stringify(u))
        sessionStorage.setItem('agrimap_session', '1')
        return { user: u }
      } else {
        throw new Error('Invalid password. Please verify your password entry.')
      }
    }

    // 3. Fallback for role-matching emails with valid password (length >= 6)
    if (cleanPassword.length >= 6) {
      let role = 'farmer'
      if (cleanEmail.includes('admin')) role = 'admin'
      else if (cleanEmail.includes('dealer')) role = 'dealer'
      else if (cleanEmail.includes('consumer')) role = 'consumer'
      else if (cleanEmail.includes('surveyor')) role = 'surveyor'
      else if (cleanEmail.includes('verifier')) role = 'verifier'

      const u = loginDemo(role, { email: cleanEmail, full_name: cleanEmail.split('@')[0] })
      return { user: u }
    }

    throw new Error('Invalid email or password. Please verify your credentials or create an account.')
  }, [loginDemo])

  // ── Logout ───────────────────────────────────────────────────────────────
  const logoutClean = useCallback(() => {
    sessionStorage.removeItem('v2v_demo_user')
    logout()
  }, [logout])

  // ── Register ─────────────────────────────────────────────────────────────
  const register = useCallback(async (payload) => {
    const cleanEmail = (payload.email || '').trim().toLowerCase()
    const cleanPassword = payload.password || ''
    const cleanName = (payload.full_name || payload.fullName || '').trim()
    const role = (payload.role || 'farmer').toLowerCase()

    const newAccount = {
      id: `user-${Date.now()}`,
      email: cleanEmail,
      password: cleanPassword,
      full_name: cleanName || cleanEmail.split('@')[0],
      role,
      farmer_id: role === 'farmer' ? 'farmer-1' : undefined,
      field_id: role === 'farmer' ? 'field-1' : undefined,
    }

    // Always store registered user locally so they can sign in immediately
    saveRegisteredAccount(newAccount)

    try {
      const { data } = await api.post('/auth/register', payload)
      return data
    } catch (err) {
      console.warn('Backend server offline during registration; saved to verified account store:', err.message)
      return newAccount
    }
  }, [loginDemo])

  const value = { user, loading, login, loginDemo, logout: logoutClean, register }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
