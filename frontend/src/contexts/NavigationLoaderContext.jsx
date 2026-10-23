import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

const NavigationLoaderContext = createContext(null)

/**
 * DotsRingLoader
 * High-performance, brand-aligned loading spinner using V2V Tech purple and violet palette:
 * #2A0C58, #3C1775, #8A57C0, #B890F9, #D9C7FF.
 * Features 8 orbiting circular dots arranged radially around a glowing brand core.
 */
export function DotsRingLoader({ size = 'md', className = '' }) {
  const sizeMap = {
    sm: { container: 'w-10 h-10', dotSize: 'w-2 h-2', radius: 14 },
    md: { container: 'w-16 h-16', dotSize: 'w-2.5 h-2.5', radius: 24 },
    lg: { container: 'w-24 h-24', dotSize: 'w-3.5 h-3.5', radius: 36 },
    xl: { container: 'w-32 h-32', dotSize: 'w-4 h-4', radius: 48 },
  }
  const s = sizeMap[size] || sizeMap.md

  // 8 dots arranged at 45 degree intervals around the circle
  const dots = [0, 45, 90, 135, 180, 225, 270, 315]
  const colors = [
    '#2A0C58', '#3C1775', '#5E4678', '#8A57C0',
    '#B890F9', '#D9C7FF', '#8A57C0', '#3C1775',
  ]

  return (
    <div
      role="status"
      aria-label="Loading..."
      className={`relative inline-flex items-center justify-center ${s.container} ${className}`}
    >
      {/* 8 Radial Orbiting Dots */}
      <div className="absolute inset-0 animate-spin motion-reduce:animate-none duration-[2000ms] ease-linear">
        {dots.map((deg, i) => {
          const rad = (deg * Math.PI) / 180
          const x = Math.round(s.radius * Math.cos(rad))
          const y = Math.round(s.radius * Math.sin(rad))
          return (
            <div
              key={deg}
              className={`absolute rounded-full shadow-md ${s.dotSize}`}
              style={{
                backgroundColor: colors[i % colors.length],
                left: `calc(50% + ${x}px)`,
                top: `calc(50% + ${y}px)`,
                transform: 'translate(-50%, -50%)',
                boxShadow: `0 0 8px ${colors[i % colors.length]}aa`,
              }}
            />
          )
        })}
      </div>

      {/* Pulsing central core */}
      <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-[#2A0C58] to-[#8A57C0] shadow-[0_0_12px_rgba(138,87,192,0.9)] animate-ping opacity-75" />
      <div className="w-2.5 h-2.5 rounded-full bg-white dark:bg-purple-200 z-10" />

      <span className="sr-only">Loading...</span>
    </div>
  )
}

/**
 * PageTransitionLoader
 * Fullscreen modal overlay displaying the 8-dot DotsRingLoader with V2V Tech styling.
 */
export function PageTransitionLoader({ isLoading, message = 'Loading workspace...' }) {
  if (!isLoading) return null

  return (
    <div
      role="alert"
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-sm transition-all duration-300"
    >
      <div className="bg-white/95 dark:bg-[#131313]/95 border border-[#8A57C0]/40 rounded-3xl p-8 flex flex-col items-center gap-5 shadow-2xl shadow-purple-950/50 text-center max-w-sm mx-4 animate-fadeIn">
        <DotsRingLoader size="lg" />
        <div className="flex flex-col items-center gap-1.5 mt-2">
          <p className="text-base font-bold text-slate-900 dark:text-white font-sans tracking-wide">
            {message}
          </p>
          <span className="text-xs text-[#8A57C0] dark:text-[#B890F9] font-medium font-mono">
            V2V Tech · Vision To Value
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * NavigationLoaderProvider
 * Context provider managing navigation state, 5s timeout, double-click prevention, and cleanup.
 */
export function NavigationLoaderProvider({ children }) {
  const [loadingState, setLoadingState] = useState({
    active: false,
    message: 'Loading...',
  })
  const isNavigatingRef = useRef(false)
  const timerRef = useRef(null)
  const navigate = useNavigate()
  const { user } = useAuth()

  // Compute starting page / dashboard according to active role or current portal
  const getStartingPage = useCallback(() => {
    const pathname = window.location.pathname || ''
    if (pathname.startsWith('/dealer')) return '/dealer'
    if (pathname.startsWith('/consumer') || pathname === '/marketplace') return '/marketplace'

    if (!user) return '/marketplace'
    const role = user.role || 'farmer'
    if (role === 'farmer') return '/farmer'
    if (role === 'consumer') return '/marketplace'
    if (role === 'dealer') return '/dealer'
    if (role === 'admin') return '/admin/farmers'
    if (role === 'verifier' || role === 'land_verifier' || role === 'surveyor') return '/admin/editor/field-1'
    return '/farmer'
  }, [user])

  // Stop loader helper with cleanup
  const stopLoader = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    isNavigatingRef.current = false
    setLoadingState({ active: false, message: '' })
  }, [])

  /**
   * navigateHome:
   * Instant, smooth navigation to the role/portal hub with NO loading delay.
   * Perfect for logo clicks so users are not blocked by loading screens.
   */
  const navigateHome = useCallback(
    (targetPath) => {
      stopLoader()
      const homePath =
        typeof targetPath === 'string' && targetPath.startsWith('/')
          ? targetPath
          : getStartingPage()
      window.scrollTo({ top: 0, behavior: 'smooth' })
      navigate(homePath)
    },
    [getStartingPage, navigate, stopLoader]
  )

  /**
   * navigateWithLoader:
   * Displays the 8-dot DotsRingLoader for durationMs (< 3 seconds, default 1200ms),
   * blocks duplicate clicks, executes navigation, and cleans up timers.
   */
  const navigateWithLoader = useCallback(
    (to, options = {}, message = 'Transitioning...', durationMs = 1200) => {
      // Prevent double-clicks during active navigation transition
      if (isNavigatingRef.current) return
      isNavigatingRef.current = true

      if (timerRef.current) clearTimeout(timerRef.current)
      setLoadingState({ active: true, message })

      timerRef.current = setTimeout(() => {
        isNavigatingRef.current = false
        setLoadingState({ active: false, message: '' })
        if (typeof to === 'number') {
          navigate(to)
        } else {
          navigate(to, options)
        }
      }, durationMs)
    },
    [navigate]
  )

  /**
   * navigateBackWithLoader:
   * Returns to previous page (history -1) with fast <3s loader; falls back to role/portal hub.
   */
  const navigateBackWithLoader = useCallback(
    (fallbackPath, message = 'Returning to previous screen...', durationMs = 1200) => {
      const pathname = window.location.pathname || ''
      let defaultFallback = getStartingPage()
      if (pathname.startsWith('/dealer')) defaultFallback = '/dealer'
      else if (pathname.startsWith('/consumer') || pathname === '/marketplace') defaultFallback = '/marketplace'

      const targetFallback = fallbackPath || defaultFallback
      const hasHistory =
        window.history.state &&
        typeof window.history.state.idx === 'number' &&
        window.history.state.idx > 0

      if (hasHistory) {
        navigateWithLoader(-1, {}, message, durationMs)
      } else {
        navigateWithLoader(targetFallback, { replace: true }, message, durationMs)
      }
    },
    [getStartingPage, navigateWithLoader]
  )

  /**
   * navigateHomeWithLoader:
   * Fast navigation with loader (< 3s, default 1200ms).
   */
  const navigateHomeWithLoader = useCallback(
    (targetPathOrMessage, maybeMessage = 'Opening Dashboard...', durationMs = 1200) => {
      let homePath = getStartingPage()
      let message = maybeMessage
      if (typeof targetPathOrMessage === 'string') {
        if (targetPathOrMessage.startsWith('/')) {
          homePath = targetPathOrMessage
        } else {
          message = targetPathOrMessage
        }
      }
      navigateWithLoader(homePath, {}, message, durationMs)
    },
    [getStartingPage, navigateWithLoader]
  )

  return (
    <NavigationLoaderContext.Provider
      value={{
        isLoading: loadingState.active,
        loadingMessage: loadingState.message,
        stopLoader,
        navigateHome,
        navigateWithLoader,
        navigateBackWithLoader,
        navigateHomeWithLoader,
        getStartingPage,
      }}
    >
      {children}
      <PageTransitionLoader
        isLoading={loadingState.active}
        message={loadingState.message}
      />
    </NavigationLoaderContext.Provider>
  )
}

export function useNavigateWithLoader() {
  const context = useContext(NavigationLoaderContext)
  if (!context) {
    throw new Error('useNavigateWithLoader must be used within NavigationLoaderProvider')
  }
  return context
}
