/**
 * CoordinateNavigator.jsx — DMS & Decimal Coordinate Navigator & Spatial Centering
 *
 * Exclusively for Admin and Surveyor roles.
 * Supports:
 * - DMS input (e.g. 9°34'03.0"N 77°40'44.8"E)
 * - Decimal input (e.g. 10.6585, 77.0125)
 * - Places search recentering
 * - Smooth camera fly-to and validation feedback
 */
import React, { useState } from 'react'
import { parseCoordinates } from '../../lib/coordinateParser'
import { Search, MapPin, Navigation, AlertCircle, Check } from 'lucide-react'

export default function CoordinateNavigator({
  map,
  google,
  onNavigate,
  className = '',
}) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleJump = (e) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    const trimmed = input.trim()
    if (!trimmed) {
      setError('Enter coordinates (e.g. 10.6585, 77.0125 or 9°34\'03.0"N 77°40\'44.8"E)')
      return
    }

    const parsed = parseCoordinates(trimmed)
    if (!parsed.ok) {
      setError(parsed.error || 'Invalid coordinates format.')
      return
    }

    if (map) {
      const target = { lat: parsed.lat, lng: parsed.lng }
      map.panTo(target)
      map.setZoom(18)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)

      if (typeof onNavigate === 'function') {
        onNavigate(target)
      }
    }
  }

  return (
    <div className={`pointer-events-auto ${className}`}>
      <form onSubmit={handleJump} className="relative flex items-center">
        <div className="absolute left-3 text-[#B890F9] pointer-events-none">
          <Navigation size={14} />
        </div>
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            if (error) setError('')
          }}
          placeholder="Jump to coords (DMS or Dec, e.g. 10.6585, 77.0125)..."
          className="w-72 bg-[#131313]/90 dark:bg-[#1B1233]/90 backdrop-blur-md border border-[#B890F9]/30 rounded-xl pl-9 pr-16 py-1.5 text-xs text-[#F4F3F9] placeholder-[#9A8BC0] focus:outline-none focus:border-[#B890F9] focus:ring-1 focus:ring-[#B890F9] shadow-xl"
        />
        <button
          type="submit"
          className="absolute right-1 px-2.5 py-1 rounded-lg bg-[#8A57C0] hover:bg-[#B890F9] text-white text-[11px] font-bold transition-all cursor-pointer shadow-sm"
        >
          {success ? <Check size={12} className="text-emerald-300" /> : 'Go'}
        </button>
      </form>
      {error && (
        <div className="mt-1 text-[11px] text-amber-400 bg-[#131313]/90 px-2.5 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1.5 shadow-lg">
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
