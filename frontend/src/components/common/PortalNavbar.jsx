import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import V2VLogo from './V2VLogo'
import ThemeToggle from './ThemeToggle'
import { useNavigateWithLoader } from '../../contexts/NavigationLoaderContext'
import { useAuth } from '../../contexts/AuthContext'
import { getCart } from '../../lib/consumerData'

/**
 * PortalNavbar
 * Unified top navigation bar for all Consumer and Dealer pages.
 * Supports:
 *  - Instant logo return (Consumer -> /marketplace, Dealer -> /dealer)
 *  - Section links (Products, Bulk Buying, My Orders, Cart with badge)
 *  - Fast <3s "Go Back" button
 *  - Theme mode toggle
 *  - Prominent "Sign Out / Log Out" button
 */
export default function PortalNavbar({ portal = 'consumer', cartCountOverride = null }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { navigateHome, navigateBackWithLoader } = useNavigateWithLoader()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Cart count calculation
  const storeCart = getCart()
  const cartItemsCount =
    typeof cartCountOverride === 'number'
      ? cartCountOverride
      : storeCart.reduce((sum, item) => sum + (item.quantity || item.qty || 1), 0)

  const isDealer = portal === 'dealer'
  const homePath = isDealer ? '/dealer' : '/marketplace'
  const portalName = isDealer ? 'Dealer Portal' : 'Consumer Portal'

  const links = isDealer
    ? [
        { to: '/dealer/products', label: 'Wholesale Products' },
        { to: '/dealer/bulk-buying', label: 'Bulk Buying' },
        { to: '/dealer/orders', label: 'My Orders' },
      ]
    : [
        { to: '/consumer/products', label: 'Products' },
        { to: '/consumer/bulk-buying', label: 'Bulk Buying' },
        { to: '/consumer/orders', label: 'My Orders' },
      ]

  const cartPath = isDealer ? '/dealer/cart' : '/consumer/cart'
  const cartIcon = isDealer ? '📦' : '🛒'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleGoBack = () => {
    navigateBackWithLoader(homePath, 'Returning to previous screen...', 1200)
  }

  const handleLogoClick = () => {
    navigateHome(homePath)
  }

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 px-4 sm:px-6 py-2.5 sticky top-0 z-40 shadow-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* ── Left: Brand Logo & Portal Tag ── */}
        <div className="flex items-center gap-3">
          <div onClick={handleLogoClick} className="cursor-pointer flex items-center gap-2.5">
            <V2VLogo size="sm" onClick={handleLogoClick} />
            <span className="text-xs font-bold text-gray-300 dark:text-slate-700 hidden sm:inline">|</span>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-md hidden sm:inline ${
                isDealer
                  ? 'text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60'
                  : 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60'
              }`}
            >
              {portalName}
            </span>
          </div>
        </div>

        {/* ── Right: Links + Cart + Go Back + Theme + Logout (Matching user screenshot) ── */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <nav className="hidden md:flex items-center gap-4 text-xs font-semibold mr-1">
            {links.map((link) => {
              const isActive = location.pathname === link.to
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`transition-colors py-1 ${
                    isActive
                      ? isDealer
                        ? 'text-indigo-600 dark:text-indigo-400 font-bold border-b-2 border-indigo-600'
                        : 'text-emerald-600 dark:text-emerald-400 font-bold border-b-2 border-emerald-600'
                      : isDealer
                      ? 'text-gray-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400'
                      : 'text-gray-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Cart Button */}
          <Link
            to={cartPath}
            className={`relative px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
              location.pathname === cartPath
                ? isDealer
                  ? 'bg-indigo-600 text-white shadow-indigo-200'
                  : 'bg-emerald-600 text-white shadow-emerald-200'
                : isDealer
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800/60'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800/60'
            }`}
          >
            <span>{cartIcon}</span>
            <span className="hidden sm:inline">Cart</span>
            {cartItemsCount > 0 && (
              <span
                className={`w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-bold ${
                  location.pathname === cartPath
                    ? 'bg-black/30'
                    : isDealer
                    ? 'bg-indigo-600'
                    : 'bg-emerald-600'
                }`}
              >
                {cartItemsCount}
              </span>
            )}
          </Link>

          {/* Go Back Button */}
          <button
            type="button"
            onClick={handleGoBack}
            className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
              isDealer
                ? 'text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-600 hover:text-white border border-indigo-200 dark:border-indigo-800/60'
                : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-600 hover:text-white border border-emerald-200 dark:border-emerald-800/60'
            }`}
            title="Go back to previous screen"
          >
            <span className="text-sm font-black">←</span>
            <span className="hidden sm:inline">Go Back</span>
          </button>

          {/* Theme Toggle */}
          <div className="hidden lg:block">
            <ThemeToggle variant="pill" />
          </div>

          {/* Sign Out / Log Out Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-600 hover:text-white border border-rose-200 dark:border-rose-800/60 transition-all cursor-pointer shadow-sm"
            title="Sign out of platform"
          >
            <span>Log Out</span>
            <span className="text-sm">→</span>
          </button>

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 md:hidden"
            aria-label="Toggle Navigation Menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile Dropdown Menu ── */}
      {mobileMenuOpen && (
        <div className="md:hidden pt-3 pb-2 border-t border-gray-200 dark:border-slate-800 mt-2 space-y-1 animate-fadeIn">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 px-3 flex items-center justify-between">
            <ThemeToggle variant="pill" />
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800/60"
            >
              <span>Log Out</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
