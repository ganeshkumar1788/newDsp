/**
 * LocationFinder.jsx — Universal Smart Spatial Location Finder
 *
 * Implements:
 * - Smart input auto-detecting:
 *   1. Geographic coordinates (Decimal, DMS, DDM, N/S/E/W, negative, Google Maps)
 *   2. Indian 6-digit pincode (resolves to Pincode area, approximate)
 *   3. Rough address, village, district, landmark
 * - Swap detection ("Did you mean latitude X, longitude Y?") with 1-click fix
 * - Outside India warning ("Outside India, please confirm")
 * - Geocoding ladder via addressResolver.js (strips survey/khata tokens)
 * - Result card: matched level (Exact/Street/Locality/Pincode/District), Decimal + DMS with Copy,
 *   point-in-polygon "Inside farm: Yes/No", distance to centroid
 * - Enter flies/fits to result, Esc clears
 * - Last 5 searches as quick-access chips
 * - Debounce 400ms, geocode only on submit, session caching
 * - Role-governed variants:
 *   - Admin / Surveyor: Places autocomplete, "Which farm is here?", distance & bearing to nearest device,
 *     draft actions ("Add device here", "Add boundary corner here", "Add line point here"), 3km consistency alert.
 *   - Farmer: "Pick on map", "Use my farm", >100m outside boundary warning, no other-farm info, no autocomplete.
 */
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Search,
  MapPin,
  Compass,
  Copy,
  Check,
  AlertTriangle,
  X,
  Crosshair,
  Layers,
  ArrowRight,
  Plus,
  RefreshCw,
  ExternalLink,
  Shield,
  HelpCircle,
} from 'lucide-react'
import { parseCoordinates, toDms } from '../../lib/coordinateParser.js'
import { resolveAddress, isPincode, stripSurveyTokens } from '../../lib/addressResolver.js'
import {
  getDistanceMeters,
  calculateBearing,
  isPointInPolygon,
  calculatePolygonCentroid,
} from '../../lib/geoUtils.js'
import { hasMapPermission, getLocationFinderScope } from '../../lib/mapPermissions.js'

export default function LocationFinder({
  role = 'farmer',
  farm = null,
  farmBoundary = [],
  devices = [],
  allFarms = [],
  map = null,
  google = null,
  onLocationSelect = null,
  onAddDraft = null,
  onPickOnMap = null,
  isPickingOnMap = false,
  className = '',
  placeholder = null,
}) {
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const [recentSearches, setRecentSearches] = useState([])
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef(null)
  const tempMarkerRef = useRef(null)
  const tempBoxRef = useRef(null)

  const isFarmer = role === 'farmer'
  const isAdmin = role === 'admin' || role === 'surveyor' || role === 'land_verifier'

  // Load last 5 recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('agrimap.recentSearches.v1')
      if (saved) setRecentSearches(JSON.parse(saved).slice(0, 5))
    } catch (e) {}
  }, [])

  const saveRecentSearch = (item) => {
    try {
      const updated = [item, ...recentSearches.filter((s) => s.query !== item.query)].slice(0, 5)
      setRecentSearches(updated)
      localStorage.setItem('agrimap.recentSearches.v1', JSON.stringify(updated))
    } catch (e) {}
  }

  // Calculate farm centroid
  const farmCentroid = useMemo(() => {
    if (farmBoundary && farmBoundary.length > 0) {
      return calculatePolygonCentroid(farmBoundary)
    }
    return [10.6585, 77.0125] // Default fallback centroid
  }, [farmBoundary])

  // Clear map temporary markers and overlays
  const clearMapOverlays = useCallback(() => {
    if (tempMarkerRef.current) {
      if (typeof tempMarkerRef.current.setMap === 'function') {
        tempMarkerRef.current.setMap(null)
      } else if (typeof tempMarkerRef.current.remove === 'function') {
        tempMarkerRef.current.remove()
      }
      tempMarkerRef.current = null
    }
    if (tempBoxRef.current) {
      if (typeof tempBoxRef.current.setMap === 'function') {
        tempBoxRef.current.setMap(null)
      } else if (typeof tempBoxRef.current.remove === 'function') {
        tempBoxRef.current.remove()
      }
      tempBoxRef.current = null
    }
  }, [])

  // Clean up overlays on unmount
  useEffect(() => {
    return () => clearMapOverlays()
  }, [clearMapOverlays])

  // Center/Fly to coordinate on map and place temporary pin
  const showOnMap = useCallback(
    (lat, lng, viewportBounds = null, label = 'Search Pin') => {
      clearMapOverlays()

      // 1. Google Maps
      if (map && google && google.maps) {
        map.panTo({ lat, lng })
        map.setZoom(17)

        // Create temporary distinct pin: Cyan/Purple target reticle
        const pin = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: label,
          zIndex: 400,
          animation: google.maps.Animation.DROP,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 9,
            fillColor: '#06B6D4',
            fillOpacity: 0.95,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
          },
        })
        tempMarkerRef.current = pin

        // Accuracy bounding box if viewport available
        if (viewportBounds) {
          const rect = new google.maps.Rectangle({
            strokeColor: '#06B6D4',
            strokeOpacity: 0.8,
            strokeWeight: 1.5,
            strokePattern: [6, 6],
            fillColor: '#06B6D4',
            fillOpacity: 0.08,
            map,
            bounds: viewportBounds,
            zIndex: 390,
          })
          tempBoxRef.current = rect
        }
      }
      // 2. Leaflet fallback
      else if (map && typeof map.flyTo === 'function') {
        map.flyTo([lat, lng], 17)
      }
    },
    [map, google, clearMapOverlays]
  )

  // Execute Search
  const handleSearch = async (overrideQuery = null) => {
    const raw = overrideQuery || query
    if (!raw || !raw.trim()) {
      setError('Please enter coordinates, a 6-digit pincode, or a location.')
      return
    }

    const trimmed = raw.trim()
    setIsSearching(true)
    setError(null)
    setShowSuggestions(false)

    try {
      // ── Step 1: Detect Coordinates ─────────────────────────────────────
      const coordParsed = parseCoordinates(trimmed)
      if (coordParsed.ok) {
        const point = [coordParsed.lat, coordParsed.lng]
        const isInside = isPointInPolygon(point, farmBoundary)
        const distanceM = farmCentroid ? Math.round(getDistanceMeters(point, farmCentroid)) : 0

        const resObj = {
          type: 'coordinate',
          lat: coordParsed.lat,
          lng: coordParsed.lng,
          formattedCoords: coordParsed.formatted,
          dms: coordParsed.dms,
          query: trimmed,
          matchedText: coordParsed.formatted,
          matchedLevel: 'Exact',
          approximate: false,
          insideFarm: isInside,
          distanceToCentroidM: distanceM,
          swapSuggestion: coordParsed.swapSuggestion,
          outsideIndia: coordParsed.outsideIndia,
          outsideIndiaNotice: coordParsed.outsideIndiaNotice,
        }

        setResult(resObj)
        saveRecentSearch({ query: trimmed, label: coordParsed.formatted })
        showOnMap(resObj.lat, resObj.lng, null, 'Coordinate Pin')
        if (typeof onLocationSelect === 'function') onLocationSelect(resObj)
        setIsSearching(false)
        return
      }

      // If user typed only a single number, show specific error
      if (coordParsed.error && coordParsed.error.includes('Only one coordinate')) {
        setError(coordParsed.error)
        setIsSearching(false)
        return
      }

      // ── Step 2: Detect 6-Digit Indian Pincode or Address ────────────────
      const addrRes = await resolveAddress(trimmed, {
        farmData: farm,
        googleMaps: google,
      })

      if (!addrRes.ok) {
        setError(addrRes.error || 'No location match found.')
        setIsSearching(false)
        return
      }

      const point = [addrRes.lat, addrRes.lng]
      const isInside = isPointInPolygon(point, farmBoundary)
      const distanceM = farmCentroid ? Math.round(getDistanceMeters(point, farmCentroid)) : 0

      // Calculate distance to registered boundary centroid for 3km consistency check
      const diffKm = distanceM > 0 ? (distanceM / 1000).toFixed(1) : 0
      const isSignificantDiscrepancy = distanceM > 3000

      const resObj = {
        type: isPincode(trimmed) ? 'pincode' : 'address',
        lat: addrRes.lat,
        lng: addrRes.lng,
        formattedCoords: `${addrRes.lat.toFixed(6)}, ${addrRes.lng.toFixed(6)}`,
        dms: `${toDms(addrRes.lat, addrRes.lat >= 0 ? 'N' : 'S')} ${toDms(addrRes.lng, addrRes.lng >= 0 ? 'E' : 'W')}`,
        query: trimmed,
        matchedText: addrRes.formatted,
        matchedLevel: addrRes.level || (isPincode(trimmed) ? 'Pincode area' : 'Locality'),
        approximate: Boolean(addrRes.approximate),
        insideFarm: isInside,
        distanceToCentroidM: distanceM,
        viewportBounds: addrRes.viewportBounds,
        source: addrRes.source,
        diffKm,
        isSignificantDiscrepancy,
      }

      setResult(resObj)
      saveRecentSearch({ query: trimmed, label: addrRes.formatted })
      showOnMap(resObj.lat, resObj.lng, addrRes.viewportBounds, addrRes.formatted)
      if (typeof onLocationSelect === 'function') onLocationSelect(resObj)
    } catch (err) {
      console.error('[LocationFinder] Search error:', err)
      setError('An unexpected error occurred during location resolution. Please try coordinates.')
    } finally {
      setIsSearching(false)
    }
  }

  // Handle Enter and Esc key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    } else if (e.key === 'Escape') {
      handleClear()
    }
  }

  // Handle Clear
  const handleClear = () => {
    setQuery('')
    setResult(null)
    setError(null)
    clearMapOverlays()
  }

  // Copy coordinates
  const handleCopy = (text) => {
    try {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {}
  }

  // Swap suggestion fix handler
  const handleApplySwap = () => {
    if (result?.swapSuggestion) {
      const swapped = `${result.swapSuggestion.lat}, ${result.swapSuggestion.lng}`
      setQuery(swapped)
      handleSearch(swapped)
    }
  }

  // Admin Feature: "Which farm is here?"
  const whichFarmInfo = useMemo(() => {
    if (!isAdmin || !result || allFarms.length === 0) return null

    const pt = [result.lat, result.lng]
    // Check if inside any farm
    const containingFarm = allFarms.find((f) => {
      const bPoints = f.boundary_points || []
      return isPointInPolygon(pt, bPoints)
    })

    if (containingFarm) {
      return {
        status: 'CONTAINED',
        farm: containingFarm,
        message: `This location is INSIDE registered farm: ${containingFarm.full_name} (${containingFarm.field_id})`,
      }
    }

    // Otherwise calculate 3 nearest farms
    const sorted = [...allFarms]
      .map((f) => {
        const centroid = f.centroid || (f.boundary_points?.length ? calculatePolygonCentroid(f.boundary_points) : null)
        const dist = centroid ? Math.round(getDistanceMeters(pt, centroid)) : Infinity
        return { ...f, distMeters: dist }
      })
      .filter((f) => f.distMeters !== Infinity)
      .sort((a, b) => a.distMeters - b.distMeters)
      .slice(0, 3)

    return {
      status: 'NEAREST',
      nearest: sorted,
    }
  }, [isAdmin, result, allFarms])

  // Admin Feature: Nearest Device Distance and Bearing
  const nearestDeviceInfo = useMemo(() => {
    if (!isAdmin || !result || devices.length === 0) return null
    const pt = [result.lat, result.lng]

    let nearest = null
    let minDist = Infinity

    devices.forEach((dev) => {
      const coords = dev.geometry?.coordinates
      if (coords && coords.length >= 2) {
        const devPt = [coords[1], coords[0]]
        const dist = getDistanceMeters(pt, devPt)
        if (dist < minDist) {
          minDist = dist
          nearest = {
            device: dev,
            distanceM: Math.round(dist),
            bearing: Math.round(calculateBearing(pt, devPt)),
          }
        }
      }
    })

    return nearest
  }, [isAdmin, result, devices])

  return (
    <div className={`space-y-3 ${className}`}>
      {/* ── Input Box ── */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search size={15} className="absolute left-3.5 text-[#9A8BC0] pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (error) setError(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              placeholder ||
              (isAdmin
                ? 'Enter coordinates (10.65, 77.01), 6-digit pincode, or village...'
                : 'Enter coordinates, 6-digit pincode, or village...')
            }
            className="w-full bg-[#131313] dark:bg-[#160E26] text-white text-xs pl-10 pr-20 py-2.5 rounded-xl border border-[#B890F9]/30 focus:outline-none focus:border-[#B890F9] transition-all placeholder-[#8A7EA6]"
          />
          <div className="absolute right-2 flex items-center gap-1">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-gray-400 hover:text-white rounded-md transition-colors"
                title="Clear input (Esc)"
              >
                <X size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSearch()}
              disabled={isSearching}
              className="px-2.5 py-1 bg-[#8A57C0] hover:bg-[#A879E0] disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
            >
              {isSearching ? <RefreshCw size={12} className="animate-spin" /> : <span>Find</span>}
            </button>
          </div>
        </div>

        {/* Recent Search Chips */}
        {recentSearches.length > 0 && !result && (
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <span className="text-[10px] text-gray-400 font-medium">Recent:</span>
            {recentSearches.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(s.query)
                  handleSearch(s.query)
                }}
                className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-[#C9BDE6] hover:text-white border border-white/5 transition-colors cursor-pointer truncate max-w-[140px]"
                title={s.label || s.query}
              >
                {s.label || s.query}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Outside India Warning */}
      {result?.outsideIndia && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
          <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-400" />
          <div>
            <span className="font-bold block">Outside India</span>
            <span className="text-[11px] text-amber-200/90">{result.outsideIndiaNotice}</span>
          </div>
        </div>
      )}

      {/* Swap Suggestion Banner */}
      {result?.swapSuggestion && (
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[#D9C7FF] text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Compass size={15} className="text-[#B890F9] shrink-0" />
            <span className="text-[11px]">{result.swapSuggestion.text}</span>
          </div>
          <button
            type="button"
            onClick={handleApplySwap}
            className="px-2.5 py-1 rounded-lg bg-[#8A57C0] hover:bg-[#A879E0] text-white text-[10px] font-bold transition-colors cursor-pointer shrink-0"
          >
            Fix Swap
          </button>
        </div>
      )}

      {/* ── Result Card ── */}
      {result && (
        <div className="p-3.5 rounded-2xl bg-[#1B1233] border border-[#B890F9]/30 shadow-xl space-y-3 text-xs">
          {/* Header: Matched query & Level */}
          <div className="flex items-start justify-between gap-2 pb-2 border-b border-white/10">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A78BFA] block">
                LOCATION RESULT
              </span>
              <h4 className="font-bold text-white text-xs mt-0.5 leading-snug">
                {result.matchedText}
              </h4>
            </div>
            <div className="shrink-0 text-right">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  result.approximate
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                }`}
              >
                {result.matchedLevel} {result.approximate ? '(Approximate)' : ''}
              </span>
            </div>
          </div>

          {/* Coordinates (Decimal & DMS) */}
          <div className="p-2.5 rounded-xl bg-[#131313] border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 text-[11px]">Decimal:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-white text-xs">{result.formattedCoords}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(result.formattedCoords)}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Copy decimal coordinates"
                >
                  {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400 text-[11px]">DMS:</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-purple-200 text-[11px]">{result.dms}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(result.dms)}
                  className="p-1 text-gray-400 hover:text-white transition-colors"
                  title="Copy DMS coordinates"
                >
                  <Copy size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Spatial Relationship */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-xl bg-[#241845] border border-white/5">
              <span className="text-[10px] text-gray-400 block">Inside Registered Farm:</span>
              <strong className={`font-bold text-xs ${result.insideFarm ? 'text-emerald-400' : 'text-amber-400'}`}>
                {result.insideFarm ? 'YES (Within Boundary)' : 'NO (Outside Boundary)'}
              </strong>
            </div>
            <div className="p-2 rounded-xl bg-[#241845] border border-white/5">
              <span className="text-[10px] text-gray-400 block">Distance to Centroid:</span>
              <strong className="font-bold text-xs text-white">
                {result.distanceToCentroidM} meters
              </strong>
            </div>
          </div>

          {/* Admin-only Consistency Alert (> 3 km) */}
          {isAdmin && result.isSignificantDiscrepancy && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
              <div>
                <span className="font-bold block">Geographic Discrepancy Notice</span>
                <span className="text-[11px] text-amber-200">
                  Address and registered map location differ by {result.diffKm} km: please verify.
                </span>
              </div>
            </div>
          )}

          {/* Farmer-only > 100m outside boundary notice */}
          {isFarmer && !result.insideFarm && result.distanceToCentroidM > 100 && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
              <span className="text-[11px] text-amber-200">
                This location is outside your registered land; your admin will review it.
              </span>
            </div>
          )}

          {/* Admin Feature: "Which farm is here?" */}
          {isAdmin && whichFarmInfo && (
            <div className="p-2.5 rounded-xl bg-[#140D26] border border-[#B890F9]/20 space-y-1.5 text-xs">
              <span className="text-[10px] font-bold text-[#A78BFA] uppercase tracking-wider block">
                Cadastral Farm Lookup
              </span>
              {whichFarmInfo.status === 'CONTAINED' ? (
                <div className="text-emerald-400 font-semibold text-[11px] flex items-center gap-1.5">
                  <Shield size={12} />
                  <span>{whichFarmInfo.message}</span>
                </div>
              ) : (
                <div className="space-y-1 text-[11px] text-[#C9BDE6]">
                  <span className="text-gray-400 block text-[10px]">3 Nearest Registered Farms:</span>
                  {whichFarmInfo.nearest.map((nf, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-white font-medium">{nf.full_name} ({nf.field_id})</span>
                      <span className="font-mono text-[#D9C7FF]">{nf.distMeters} m</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Admin Feature: Nearest Device Distance and Bearing */}
          {isAdmin && nearestDeviceInfo && (
            <div className="p-2.5 rounded-xl bg-[#140D26] border border-[#B890F9]/20 text-xs flex items-center justify-between">
              <div>
                <span className="text-[10px] text-gray-400 block">Nearest Device:</span>
                <span className="text-white font-medium text-[11px]">
                  {nearestDeviceInfo.device.properties?.name || nearestDeviceInfo.device.properties?.device_name}
                </span>
              </div>
              <div className="text-right">
                <span className="font-mono font-bold text-[#D9C7FF] block text-[11px]">
                  {nearestDeviceInfo.distanceM} m
                </span>
                <span className="text-[10px] text-purple-300">Bearing: {nearestDeviceInfo.bearing}°</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
            {isAdmin && onAddDraft && (
              <>
                <button
                  type="button"
                  onClick={() => onAddDraft('device', { lat: result.lat, lng: result.lng, label: result.matchedText })}
                  className="px-2.5 py-1.5 rounded-xl bg-[#8A57C0] hover:bg-[#A879E0] text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Add device here</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAddDraft('boundary', { lat: result.lat, lng: result.lng })}
                  className="px-2.5 py-1.5 rounded-xl bg-purple-900/60 hover:bg-purple-800 text-[#D9C7FF] border border-purple-500/30 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Add boundary corner</span>
                </button>
                <button
                  type="button"
                  onClick={() => onAddDraft('line', { lat: result.lat, lng: result.lng })}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-900/60 hover:bg-blue-800 text-blue-200 border border-blue-500/30 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Add line point</span>
                </button>
              </>
            )}

            {onPickOnMap && (
              <button
                type="button"
                onClick={onPickOnMap}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isPickingOnMap
                    ? 'bg-amber-500 text-black border-amber-400 animate-pulse'
                    : 'bg-white/5 hover:bg-white/10 text-white border-white/20'
                }`}
              >
                <Crosshair size={13} />
                <span>{isPickingOnMap ? 'Click map to place pin' : 'Pick on map'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white text-xs transition-colors cursor-pointer ml-auto"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
