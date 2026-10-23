import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { useNavigateWithLoader } from '../../contexts/NavigationLoaderContext'
import V2VLogo from '../common/V2VLogo'
import ThemeToggle from '../common/ThemeToggle'
import { changeRequestStorage } from '../../lib/changeRequestStorage'

const NAV_LINKS = [
  { to: '/farmer',         label: 'Farmland Digital Twin',  icon: MapIcon,    roles: ['farmer', 'admin', 'verifier', 'land_verifier'] },
  { to: '/farmer/sell',    label: 'Sell Produce',           icon: UploadIcon, roles: ['farmer'] },
  { to: '/surveyor/sell',  label: 'Add Farmer Goods',       icon: UploadIcon, roles: ['verifier', 'land_verifier'] },
  { to: '/admin/requests', label: 'Farmer Requests',        icon: InboxIcon,  roles: ['admin', 'verifier', 'land_verifier'], badge: 'requests' },
  { to: '/admin/farmers',  label: 'Farmers Directory',      icon: UsersIcon,  roles: ['admin', 'verifier', 'land_verifier'] },
  { to: '/admin/demand-insights', label: 'Demand Insights', icon: ChartIcon,  roles: ['admin', 'verifier', 'land_verifier'] },
  { to: '/admin/editor/field-1', label: 'Land & Drawing Editor', icon: EditIcon, roles: ['admin', 'verifier', 'land_verifier'] },
  { to: '/dashboard',      label: 'Platform Overview',      icon: HomeIcon,   roles: ['admin', 'verifier', 'land_verifier'] },
  { to: '/marketplace',    label: 'Marketplace Hub',        icon: StoreIcon,  roles: ['consumer', 'admin'] },
  { to: '/data-tools',     label: 'Export & Reports',       icon: UploadIcon, roles: ['admin', 'verifier', 'land_verifier'] },
  { to: '/admin/surveyors', label: 'Surveyor Management',    icon: UsersIcon,  roles: ['admin', 'land_verifier'] },
  { to: '/users',          label: 'System Access',          icon: KeyIcon,    roles: ['admin'] },
  { to: '/consumer',       label: 'Consumer Home',          icon: HomeIcon,   roles: ['consumer'] },
  { to: '/consumer/products', label: 'Browse Products',        icon: StoreIcon,  roles: ['consumer'] },
  { to: '/consumer/bulk-buying', label: 'Bulk Buying',           icon: StoreIcon,  roles: ['consumer'] },
  { to: '/consumer/cart',    label: 'Shopping Cart',          icon: StoreIcon,  roles: ['consumer'] },
  { to: '/consumer/orders',   label: 'My Orders',              icon: UsersIcon,  roles: ['consumer'] },
  { to: '/dealer',          label: 'Dealer Home',             icon: HomeIcon,   roles: ['dealer'] },
  { to: '/dealer/products', label: 'Browse Products',         icon: StoreIcon,  roles: ['dealer'] },
  { to: '/dealer/bulk-buying', label: 'Bulk Buying',            icon: StoreIcon,  roles: ['dealer'] },
  { to: '/dealer/cart',      label: 'Shopping Cart',           icon: StoreIcon,  roles: ['dealer'] },
  { to: '/dealer/orders',    label: 'My Orders',               icon: UsersIcon,  roles: ['dealer'] },
]

export default function AppLayout() {
  const { user, loginDemo, logout } = useAuth()
  const navigate = useNavigate()
  const { navigateBackWithLoader, navigateHome } = useNavigateWithLoader()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const currentRole = user?.role || 'farmer'
  const visibleLinks = NAV_LINKS.filter(l => l.roles.includes(currentRole))
  
  const getHomeLink = (role) => {
    const roleRoutes = {
      farmer: '/farmer',
      admin: '/admin/farmers',
      verifier: '/admin/editor/field-1',
      land_verifier: '/admin/editor/field-1',
      surveyor: '/admin/editor/field-1',
      consumer: '/marketplace',
      dealer: '/dealer',
    }
    return roleRoutes[role] || '/farmer'
  }
  
  const homeLink = getHomeLink(currentRole)

  const handleGoBack = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    navigateBackWithLoader(homeLink, 'Returning to previous screen...', 1200)
  }

  const handleRoleSwitch = (newRole) => {
    // Allow free role switching for demo purposes
    loginDemo(newRole)
    if (newRole === 'farmer') navigate('/farmer')
    else if (newRole === 'admin') navigate('/admin/farmers')
    else if (newRole === 'verifier' || newRole === 'land_verifier' || newRole === 'surveyor') navigate('/admin/editor/field-1')
    else if (newRole === 'consumer') navigate('/marketplace')
    else if (newRole === 'dealer') navigate('/dealer')
    else navigate('/farmer')
  }

  return (
    <div className="min-h-screen bg-v2v-softwhite dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-200">
      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-v2v-nearblack dark:bg-slate-900 text-white flex flex-col border-r border-v2v-secondary/30 dark:border-slate-800 transform transition-transform duration-200
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
      >
        {/* Logo Header Container (Clickable -> Redirect to home page instantly) */}
        <div
          onClick={() => navigateHome()}
          className="px-5 py-4 border-b border-v2v-secondary/30 dark:border-slate-800 flex items-center justify-between hover:opacity-90 transition-opacity cursor-pointer group"
        >
          <V2VLogo size="md" variant="light" onClick={() => navigateHome()} />
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-v2v-deep dark:bg-slate-800 text-v2v-lavender dark:text-purple-300 border border-v2v-lavender/30 dark:border-slate-700 uppercase group-hover:border-purple-400">
            DSP
          </span>
        </div>

        {/* Mode Switcher & Theme Option */}
        <div className="px-3 pt-3">
          <div className="bg-v2v-charcoal/80 dark:bg-slate-800/80 p-2.5 rounded-xl border border-v2v-secondary/40 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-200">
              <span className="w-2 h-2 rounded-full bg-[#8A57C0]"></span>
              <span>Theme Mode</span>
            </div>
            <ThemeToggle variant="pill" />
          </div>
        </div>

        {/* Role Control Panel — Gated strictly to Development / Demo builds */}
        <div className="px-3 pt-2">
          {(!import.meta.env.DEV && import.meta.env.VITE_DEMO_ROLE_SWITCH !== 'true') ? (
            /* Production View — Strictly authenticated session role, no switcher */
            <div className="bg-v2v-charcoal dark:bg-slate-800/60 p-2.5 rounded-xl border border-v2v-secondary/40 dark:border-slate-700/50 text-xs">
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                <span>AUTHENTICATED ROLE:</span>
                <span className="px-1.5 py-0.2 rounded bg-purple-950/80 text-purple-300 border border-purple-500/40 text-[9px] font-bold uppercase">
                  {currentRole}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-[#B890F9] font-bold text-xs">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-xs truncate">{user?.full_name || 'Active User'}</div>
                  <div className="text-[10px] text-v2v-lavender dark:text-purple-300 font-medium capitalize">
                    {currentRole} Access
                  </div>
                </div>
              </div>
            </div>
          ) : currentRole === 'farmer' ? (
            /* Farmer View */
            <div className="bg-v2v-charcoal dark:bg-slate-800/60 p-2.5 rounded-xl border border-v2v-secondary/40 dark:border-slate-700/50 text-xs">
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                <span>AUTHENTICATED ROLE:</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[9px] font-bold">VERIFIED</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs">
                  F
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-xs truncate">{user?.full_name || 'Ganesh V.'}</div>
                  <div className="text-[10px] text-v2v-lavender dark:text-purple-300 font-medium">Farmer · Single Farm Access</div>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-gray-400 flex items-center gap-1 border-t border-white/10 pt-1.5">
                <span className="text-gray-400">Restricted to your registered land</span>
              </div>
            </div>
          ) : (
            /* Demo / Dev Role Switcher */
            <div className="bg-v2v-charcoal dark:bg-slate-800/60 p-2 rounded-xl border border-v2v-secondary/40 dark:border-slate-700/50 text-xs">
              <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                <span>ACTIVE ROLE (DEMO):</span>
                <span className="font-bold text-v2v-lavender dark:text-purple-300 uppercase">{currentRole}</span>
              </div>
              <select
                value={currentRole}
                onChange={(e) => handleRoleSwitch(e.target.value)}
                className="w-full bg-v2v-nearblack dark:bg-slate-900 text-white border border-v2v-secondary/50 dark:border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-v2v-lavender cursor-pointer"
              >
                <option value="admin">Admin (Full Control)</option>
                <option value="verifier">Verifier (Land Verification)</option>
                <option value="land_verifier">Land Verifier</option>
                <option value="farmer">Farmer Portal</option>
                <option value="consumer">Consumer</option>
                <option value="dealer">Dealer</option>
              </select>
            </div>
          )}
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-gray-400 dark:text-slate-400 px-3 uppercase tracking-wider mb-2">
            Platform Navigation
          </div>
          {visibleLinks.map(({ to, label, icon: Icon, badge }) => {
            let unread = 0
            if (badge === 'requests') {
              try {
                unread = changeRequestStorage.getUnreadCount(currentRole, user)
              } catch (e) {}
            }

            return (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all
                  ${isActive
                    ? 'bg-v2v-gradient dark:bg-gradient-to-r dark:from-purple-700 dark:to-indigo-600 text-white shadow-md shadow-v2v-lavender/25'
                    : 'text-gray-300 dark:text-slate-300 hover:bg-v2v-electric/50 dark:hover:bg-slate-800 hover:text-white'}`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0 text-v2v-lavender dark:text-purple-400" />
                <span className="truncate">{label}</span>
                {unread > 0 && (
                  <span className="ml-auto px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-extrabold font-mono shadow-sm">
                    {unread}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        {/* User info footer */}
        <div className="px-4 py-4 border-t border-v2v-secondary/30 dark:border-slate-800 bg-v2v-charcoal/50 dark:bg-slate-900/80">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-v2v-gradient flex items-center justify-center text-xs font-bold text-white shadow-sm">
              {user?.full_name?.[0]?.toUpperCase() ?? 'V'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold truncate text-white">{user?.full_name}</div>
              <div className="text-[10px] text-v2v-lavender dark:text-purple-300 capitalize">{currentRole} portal</div>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <Link to="/" className="text-gray-400 hover:text-white text-[11px]">
              🌐 Landing
            </Link>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-rose-400 text-[11px] transition-colors"
            >
              Sign out →
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (Header with theme toggle) */}
        <header className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-v2v-border dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 h-14 transition-colors duration-200">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-md text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 lg:hidden"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
            <div onClick={() => navigateHome()} className="lg:hidden cursor-pointer">
              <V2VLogo size="sm" onClick={() => navigateHome()} />
            </div>
            <div
              onClick={() => navigateHome()}
              className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-v2v-purple dark:hover:text-purple-300 transition-colors cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>AgriMap DSP Platform</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleGoBack}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-v2v-purple hover:text-white dark:hover:bg-purple-900/60 dark:hover:text-purple-200 border border-slate-200 dark:border-slate-700 transition-all shadow-sm cursor-pointer"
              title="Go to previous page"
            >
              <span className="text-sm font-black">←</span>
              <span>Go Back</span>
            </button>
            <ThemeToggle variant="default" />
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/80 text-v2v-deep dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50 capitalize">
              {currentRole}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-v2v-softwhite dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// ── Inline SVG icons ──
function MapIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  )
}
function EditIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  )
}
function HomeIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}
function ChipIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H7a2 2 0 00-2 2v2M9 3h6M9 3v2m6-2h2a2 2 0 012 2v2m0 0v6m0-6H3m18 0H3m0 6v2a2 2 0 002 2h2m0 0h6m-6 0v2m6-2h2a2 2 0 002-2v-2m0 0V9" />
    </svg>
  )
}
function UploadIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  )
}
function UsersIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}
function KeyIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  )
}
function MenuIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}
function StoreIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
}

function InboxIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
    </svg>
  )
}

function ChartIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}


