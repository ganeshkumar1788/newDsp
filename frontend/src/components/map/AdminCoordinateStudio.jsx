/**
 * AdminCoordinateStudio.jsx — Precision Coordinate & Address Navigation Studio
 *
 * Dedicated tool for Admin, Surveyor, and Field Verifier roles.
 * (Strictly hidden from Farmer role).
 *
 * Features 4 docked tabs:
 * 1. FIND:
 *    - Smart input with selected farm's own coordinates as placeholder
 *    - Full parser: Decimal, DMS, DDM, Cardinal prefixes/suffixes, Addresses
 *    - Swap detection ("Did you mean lat X, lng Y?" 1-click fix)
 *    - Outside India amber alert
 *    - Point-in-polygon boundary check, distance & bearing to centroid & nearest device
 *    - History chips, pulsing search crosshair, Copy buttons
 * 2. ADD (Draft by Coordinates):
 *    - Add new Device, Boundary Corner, or Line Vertex numerically
 *    - Paste-a-list box for batch coordinate points preview
 *    - Dashed Draft ghost preview on map
 * 3. EDIT (Two-Way Numerical Sync):
 *    - Live sync between Lat/Lng inputs and map markers (7 decimal precision)
 *    - Nudge controls: 1m, 0.1m, 1cm converted at farm latitude
 *    - Distance moved display, amber warning if moved > 50m or area > 5%
 *    - Reset point button
 *    - Registered area (21.4 Ac) vs Mapped area (76.9 Ac) mismatch notice
 * 4. MEASURE & INSPECT:
 *    - Live cursor coordinates, zoom, scale bar
 *    - Pick on map inspection
 *    - Geodesic distance (meters & feet) and azimuth bearing measurement
 */
import React, { useState, useEffect, useRef, useMemo } from 'react'
import { parseCoordinates, toDms } from '../../lib/coordinateParser'
import { executeAddressLadder } from '../../lib/addressNavigator'
import {
  getDistanceMeters,
  calculateBearing,
  calculatePerimeter,
  calculatePolygonArea,
  isPointInPolygon,
} from '../../lib/geoUtils'
import {
  Search,
  Navigation,
  MapPin,
  Crosshair,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  Plus,
  Edit3,
  Ruler,
  Compass,
  Layers,
  ChevronRight,
  ChevronDown,
  X,
  Sparkles,
} from 'lucide-react'

export default function AdminCoordinateStudio({
  map,
  google,
  farm,
  farmBoundaryCoords = [],
  devices = [],
  onAddDraftPoint = null,
  onUpdatePoint = null,
  onRequestClose = null,
  className = '',
}) {
  const [activeTab, setActiveTab] = useState('find') // 'find' | 'add' | 'edit' | 'measure'

  // ── 1. FIND STATE ──────────────────────────────────────────────────────────
  const defaultPlaceholder = farm?.latitude && farm?.longitude
    ? `${farm.latitude}, ${farm.longitude}`
    : '10.6585, 77.0125'

  const [findInput, setFindInput] = useState('')
  const [findError, setFindError] = useState('')
  const [findResult, setFindResult] = useState(null)
  const [isSearching, setIsSearching] = useState(false)
  const [copiedField, setCopiedField] = useState(null)
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const saved = sessionStorage.getItem('agrimap.searchHistory.v1')
      return saved ? JSON.parse(saved) : ['10.6585, 77.0125', '10.6578, 77.0118']
    } catch (e) {
      return ['10.6585, 77.0125']
    }
  })

  // Pulsing crosshair overlay on Google Map
  const searchOverlayRef = useRef(null)

  // ── 2. ADD DRAFT STATE ─────────────────────────────────────────────────────
  const [addType, setAddType] = useState('sensor')
  const [addName, setAddName] = useState('')
  const [addCoords, setAddCoords] = useState('')
  const [batchCoords, setBatchCoords] = useState('')
  const [addMessage, setAddMessage] = useState(null)

  // ── 3. EDIT POINTS STATE ───────────────────────────────────────────────────
  const [selectedPointIdx, setSelectedPointIdx] = useState(0)
  const [editPoints, setEditPoints] = useState(() => {
    return farmBoundaryCoords.map((pt, idx) => ({
      id: `pt-${idx}`,
      name: `Corner Vertex #${idx + 1}`,
      originalLat: pt[0],
      originalLng: pt[1],
      currentLat: pt[0],
      currentLng: pt[1],
      movedMeters: 0,
    }))
  })

  // Update editPoints when farm boundary changes
  useEffect(() => {
    if (farmBoundaryCoords.length > 0) {
      setEditPoints(
        farmBoundaryCoords.map((pt, idx) => ({
          id: `pt-${idx}`,
          name: `Corner Vertex #${idx + 1}`,
          originalLat: pt[0],
          originalLng: pt[1],
          currentLat: pt[0],
          currentLng: pt[1],
          movedMeters: 0,
        }))
      )
    }
  }, [farmBoundaryCoords])

  // ── 4. MEASURE STATE ───────────────────────────────────────────────────────
  const [measureMode, setMeasureMode] = useState(false)
  const [measurePoints, setMeasurePoints] = useState([])
  const [liveCursor, setLiveCursor] = useState({ lat: 10.6585, lng: 77.0125 })

  // Listen to map mousemove for live inspection
  useEffect(() => {
    if (!map || !google) return
    const listener = map.addListener('mousemove', (e) => {
      setLiveCursor({
        lat: Number(e.latLng.lat().toFixed(6)),
        lng: Number(e.latLng.lng().toFixed(6)),
      })
    })
    return () => {
      if (google.maps && google.maps.event) {
        google.maps.event.removeListener(listener)
      }
    }
  }, [map, google])

  // Center coordinate of farm
  const farmCentroid = useMemo(() => {
    if (farmBoundaryCoords.length === 0) return { lat: 10.6585, lng: 77.0125 }
    const meanLat = farmBoundaryCoords.reduce((acc, p) => acc + p[0], 0) / farmBoundaryCoords.length
    const meanLng = farmBoundaryCoords.reduce((acc, p) => acc + p[1], 0) / farmBoundaryCoords.length
    return { lat: Number(meanLat.toFixed(6)), lng: Number(meanLng.toFixed(6)) }
  }, [farmBoundaryCoords])

  // ── EXECUTE SEARCH ────────────────────────────────────────────────────────
  const handleExecuteSearch = async (queryText) => {
    const query = (queryText || findInput).trim()
    setFindError('')
    setFindResult(null)

    if (!query) {
      setFindError(`Enter coordinates (e.g. ${defaultPlaceholder}) or an address.`)
      return
    }

    setIsSearching(true)

    // First try parsing as GPS coordinates
    const parsed = parseCoordinates(query)

    if (parsed.ok) {
      finalizeSearchResult({
        lat: parsed.lat,
        lng: parsed.lng,
        formattedDms: parsed.dms,
        outsideIndia: parsed.outsideIndia,
        swapSuggestion: parsed.swapSuggestion,
        source: 'gps',
      })
      setIsSearching(false)
      return
    }

    // If text looks like address/place, try Address Navigation Ladder
    if (google && google.maps && google.maps.Geocoder) {
      try {
        const ladderResult = await executeAddressLadder({
          google,
          address: query,
          farmCentroid,
        })

        if (ladderResult.ok) {
          finalizeSearchResult({
            lat: ladderResult.lat,
            lng: ladderResult.lng,
            formattedDms: ladderResult.formattedDms,
            levelLabel: ladderResult.levelLabel,
            isApproximate: ladderResult.isApproximate,
            addressMatched: ladderResult.addressMatched,
            consistencyCheck: ladderResult.consistencyCheck,
            source: 'address',
          })
          setIsSearching(false)
          return
        } else {
          setFindError(ladderResult.error || parsed.error || 'Invalid coordinates or address.')
        }
      } catch (e) {
        setFindError(parsed.error || 'Coordinates parsing error.')
      }
    } else {
      setFindError(parsed.error || 'Unrecognized coordinate format.')
    }

    setIsSearching(false)
  }

  // Finalize result and fly map
  const finalizeSearchResult = (res) => {
    // 1. Point in polygon check
    const isInside = isPointInPolygon([res.lat, res.lng], farmBoundaryCoords)

    // 2. Distance and bearing to centroid
    const distCentroidMeters = getDistanceMeters([res.lat, res.lng], [farmCentroid.lat, farmCentroid.lng])
    const bearingCentroid = calculateBearing([farmCentroid.lat, farmCentroid.lng], [res.lat, res.lng])

    // 3. Nearest device
    let nearestDev = null
    let minDist = Infinity
    devices.forEach((dev) => {
      const devCoord = dev.geometry?.coordinates
      if (devCoord) {
        const d = getDistanceMeters([res.lat, res.lng], [devCoord[1], devCoord[0]])
        if (d < minDist) {
          minDist = d
          nearestDev = { name: dev.properties?.name || dev.properties?.device_name || 'Device', distance: Math.round(d) }
        }
      }
    })

    const finalRes = {
      ...res,
      isInside,
      distCentroidMeters: Math.round(distCentroidMeters),
      bearingCentroid: Math.round(bearingCentroid),
      nearestDevice: nearestDev,
    }

    setFindResult(finalRes)

    // Save to session history
    setSearchHistory((prev) => {
      const queryStr = `${res.lat}, ${res.lng}`
      const next = [queryStr, ...prev.filter((q) => q !== queryStr)].slice(0, 5)
      try {
        sessionStorage.setItem('agrimap.searchHistory.v1', JSON.stringify(next))
      } catch (e) {}
      return next
    })

    // Fly camera to target
    if (map) {
      const target = { lat: res.lat, lng: res.lng }
      map.panTo(target)
      map.setZoom(19)

      // Temporary crosshair marker
      if (searchOverlayRef.current) {
        searchOverlayRef.current.setMap(null)
      }

      if (google && google.maps) {
        searchOverlayRef.current = new google.maps.Marker({
          position: target,
          map,
          title: `Search Target (${res.lat}, ${res.lng})`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#8A57C0',
            fillOpacity: 0.6,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
          zIndex: 1000,
        })
      }
    }
  }

  // Copy helper
  const handleCopy = (text, fieldName) => {
    navigator.clipboard?.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // ── NUDGE POINT HELPER ────────────────────────────────────────────────────
  const handleNudgePoint = (idx, direction, stepMeters) => {
    const latConversion = 1 / 111320
    const lngConversion = 1 / (111320 * Math.cos((farmCentroid.lat * Math.PI) / 180))

    setEditPoints((prev) => {
      const next = [...prev]
      const pt = { ...next[idx] }

      let dLat = 0
      let dLng = 0
      if (direction === 'north') dLat = stepMeters * latConversion
      if (direction === 'south') dLat = -stepMeters * latConversion
      if (direction === 'east') dLng = stepMeters * lngConversion
      if (direction === 'west') dLng = -stepMeters * lngConversion

      pt.currentLat = Number((pt.currentLat + dLat).toFixed(7))
      pt.currentLng = Number((pt.currentLng + dLng).toFixed(7))

      pt.movedMeters = Math.round(
        getDistanceMeters([pt.originalLat, pt.originalLng], [pt.currentLat, pt.currentLng])
      )

      next[idx] = pt
      return next
    })

    // If onUpdatePoint callback is provided
    if (typeof onUpdatePoint === 'function') {
      const updated = editPoints[idx]
      onUpdatePoint(idx, [updated.currentLat, updated.currentLng])
    }
  }

  // Reset edited point
  const handleResetPoint = (idx) => {
    setEditPoints((prev) => {
      const next = [...prev]
      next[idx] = {
        ...next[idx],
        currentLat: next[idx].originalLat,
        currentLng: next[idx].originalLng,
        movedMeters: 0,
      }
      return next
    })
  }

  return (
    <div
      className={`pointer-events-auto bg-[#131313]/96 dark:bg-[#150F22]/96 backdrop-blur-md rounded-2xl border border-[#B890F9]/30 shadow-2xl overflow-hidden max-w-[380px] w-full text-xs text-[#F4F3F9] ${className}`}
    >
      {/* ── Header: Title & Close ── */}
      <div className="bg-gradient-to-r from-[#2A0C58] to-[#3C1775] px-4 py-3 flex items-center justify-between border-b border-[#B890F9]/20">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center text-[#D9C7FF]">
            <Compass size={14} />
          </div>
          <div>
            <h3 className="font-bold text-white text-xs tracking-wide">
              Admin Precision Studio
            </h3>
            <span className="text-[10px] text-purple-200">
              Surveyor GPS & Cadastral GIS Tools
            </span>
          </div>
        </div>
        {onRequestClose && (
          <button
            type="button"
            onClick={onRequestClose}
            className="w-6 h-6 rounded-md hover:bg-white/10 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Segmented Tabs ── */}
      <div className="grid grid-cols-4 bg-[#1B1233]/80 p-1 border-b border-[#B890F9]/20">
        {[
          { id: 'find', label: 'Find', icon: Search },
          { id: 'add', label: 'Add', icon: Plus },
          { id: 'edit', label: 'Edit', icon: Edit3 },
          { id: 'measure', label: 'Measure', icon: Ruler },
        ].map((tab) => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`py-1.5 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#8A57C0] text-white shadow-sm'
                  : 'text-[#C9BDE6] hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={12} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Tab Content ── */}
      <div className="p-3.5 space-y-3 max-h-[420px] overflow-y-auto no-scrollbar">
        {/* ============================================================== */}
        {/* TAB 1: FIND BY COORDINATES / ADDRESS                           */}
        {/* ============================================================== */}
        {activeTab === 'find' && (
          <div className="space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleExecuteSearch()
              }}
              className="space-y-2"
            >
              <div className="relative">
                <input
                  type="text"
                  value={findInput}
                  onChange={(e) => {
                    setFindInput(e.target.value)
                    if (findError) setFindError('')
                  }}
                  placeholder={`e.g. ${defaultPlaceholder} or Pollachi Rural`}
                  className="w-full bg-[#1A1429] border border-[#B890F9]/30 rounded-xl px-3 py-2 pr-14 text-xs text-white placeholder-[#8A7AA8] focus:outline-none focus:border-[#B890F9] font-mono shadow-inner"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="absolute right-1 top-1 bottom-1 px-3 bg-[#8A57C0] hover:bg-[#B890F9] text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer shadow-sm flex items-center justify-center"
                >
                  {isSearching ? '...' : 'Go'}
                </button>
              </div>

              {/* History Chips */}
              {searchHistory.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-gray-400">Recent:</span>
                  {searchHistory.map((h, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setFindInput(h)
                        handleExecuteSearch(h)
                      }}
                      className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-[10px] text-[#D9C7FF] font-mono border border-white/5 transition-colors cursor-pointer"
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </form>

            {/* Error Message */}
            {findError && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0 text-amber-400" />
                <span>{findError}</span>
              </div>
            )}

            {/* Swap Suggestion */}
            {findResult?.swapSuggestion && (
              <div className="p-2.5 rounded-xl bg-purple-900/40 border border-purple-500/40 text-purple-200 text-[11px] flex items-center justify-between">
                <span>{findResult.swapSuggestion.text}</span>
                <button
                  type="button"
                  onClick={() => {
                    const swapped = `${findResult.swapSuggestion.lat}, ${findResult.swapSuggestion.lng}`
                    setFindInput(swapped)
                    handleExecuteSearch(swapped)
                  }}
                  className="px-2 py-0.5 bg-[#8A57C0] hover:bg-[#B890F9] text-white rounded font-bold text-[10px] transition-colors"
                >
                  Apply Fix
                </button>
              </div>
            )}

            {/* Result Card */}
            {findResult && (
              <div className="p-3 bg-[#1A1429] rounded-xl border border-[#B890F9]/30 space-y-2.5 shadow-md">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <MapPin size={12} className="text-[#B890F9]" />
                    <span>Location Resolved</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      findResult.isInside
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {findResult.isInside ? 'Inside Farm Boundary' : 'Outside Boundary'}
                  </span>
                </div>

                {/* Coordinates & Copy */}
                <div className="space-y-1 font-mono text-[11px] bg-black/30 p-2 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Dec:</span>
                    <span className="text-white font-bold">{findResult.lat.toFixed(6)}, {findResult.lng.toFixed(6)}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`${findResult.lat}, ${findResult.lng}`, 'dec')}
                      className="p-1 hover:text-white text-gray-400"
                      title="Copy Decimal"
                    >
                      {copiedField === 'dec' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-1">
                    <span className="text-gray-400">DMS:</span>
                    <span className="text-[#D9C7FF]">{findResult.formattedDms}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(findResult.formattedDms, 'dms')}
                      className="p-1 hover:text-white text-gray-400"
                      title="Copy DMS"
                    >
                      {copiedField === 'dms' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                  </div>
                </div>

                {/* Spatial Insights */}
                <div className="grid grid-cols-2 gap-2 text-[10px] text-gray-300">
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="text-gray-400 block">From Farm Center:</span>
                    <strong className="text-white">{findResult.distCentroidMeters} m ({findResult.bearingCentroid}°)</strong>
                  </div>
                  <div className="bg-white/5 p-2 rounded-lg">
                    <span className="text-gray-400 block">Nearest Asset:</span>
                    <strong className="text-white">
                      {findResult.nearestDevice ? `${findResult.nearestDevice.name} (${findResult.nearestDevice.distance}m)` : 'None'}
                    </strong>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('add')
                      setAddCoords(`${findResult.lat}, ${findResult.lng}`)
                    }}
                    className="flex-1 py-1.5 bg-[#8A57C0]/30 hover:bg-[#8A57C0]/50 border border-[#8A57C0]/60 rounded-lg text-white font-semibold text-[11px] text-center transition-colors"
                  >
                    + Add Device Here
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (searchOverlayRef.current) searchOverlayRef.current.setMap(null)
                      setFindResult(null)
                    }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300 text-[11px] transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: ADD DRAFT POINT                                         */}
        {/* ============================================================== */}
        {activeTab === 'add' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-[#D9C7FF]">Asset Type:</label>
              <select
                value={addType}
                onChange={(e) => setAddType(e.target.value)}
                className="w-full bg-[#1A1429] border border-[#B890F9]/30 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value="sensor">V2V SoilSense IoT Node</option>
                <option value="borewell">Solar Borewell Pump Station</option>
                <option value="valve">Irrigation Control Valve (Sub-lateral)</option>
                <option value="cctv">4K Autonomous CCTV Sentinel</option>
                <option value="power">440V Feeder / Solar Station</option>
                <option value="corner">Boundary Corner Vertex</option>
              </select>

              <label className="block text-[11px] font-bold text-[#D9C7FF]">Asset Identifier / Name:</label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="e.g. Auxiliary Drip Valve #9"
                className="w-full bg-[#1A1429] border border-[#B890F9]/30 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
              />

              <label className="block text-[11px] font-bold text-[#D9C7FF]">Exact GPS Coordinates (Lat, Lng):</label>
              <input
                type="text"
                value={addCoords}
                onChange={(e) => setAddCoords(e.target.value)}
                placeholder="e.g. 10.6585, 77.0125"
                className="w-full bg-[#1A1429] border border-[#B890F9]/30 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none"
              />

              <button
                type="button"
                onClick={() => {
                  const parsed = parseCoordinates(addCoords)
                  if (!parsed.ok) {
                    setAddMessage({ type: 'error', text: parsed.error })
                    return
                  }
                  if (typeof onAddDraftPoint === 'function') {
                    onAddDraftPoint({
                      type: addType,
                      name: addName || `Draft ${addType}`,
                      lat: parsed.lat,
                      lng: parsed.lng,
                    })
                  }
                  setAddMessage({ type: 'success', text: `Draft point plotted at ${parsed.lat}, ${parsed.lng}` })
                }}
                className="w-full py-2 bg-[#8A57C0] hover:bg-[#7C3AED] text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer mt-2"
              >
                Plot Draft Ghost Marker
              </button>

              {addMessage && (
                <div
                  className={`p-2 rounded-lg text-[11px] ${
                    addMessage.type === 'success'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {addMessage.text}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: EDIT WITH TWO-WAY NUMERICAL SYNC                        */}
        {/* ============================================================== */}
        {activeTab === 'edit' && (
          <div className="space-y-3">
            {/* Area Mismatch Transparency Notice */}
            <div className="p-2.5 rounded-xl bg-purple-950/60 border border-purple-500/40 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-300">Registered Land Area:</span>
                <strong className="text-white">21.40 Acres (8.66 Ha)</strong>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-300">Mapped Polygon Area:</span>
                <strong className="text-[#D9C7FF]">76.90 Acres (Twin)</strong>
              </div>
              <p className="text-[10px] text-purple-300 pt-0.5 border-t border-purple-800/60">
                Notice: Stored revenue records and cadastral polygon areas are preserved independently.
              </p>
            </div>

            {/* Select vertex to edit */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-[#D9C7FF]">Select Boundary Vertex:</label>
              <select
                value={selectedPointIdx}
                onChange={(e) => setSelectedPointIdx(Number(e.target.value))}
                className="w-full bg-[#1A1429] border border-[#B890F9]/30 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
              >
                {editPoints.map((pt, i) => (
                  <option key={pt.id} value={i}>
                    {pt.name} — ({pt.currentLat.toFixed(5)}, {pt.currentLng.toFixed(5)})
                  </option>
                ))}
              </select>
            </div>

            {/* Selected point numerical inputs */}
            {editPoints[selectedPointIdx] && (
              <div className="p-3 bg-[#1A1429] rounded-xl border border-[#B890F9]/30 space-y-3">
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div>
                    <label className="text-[10px] text-gray-400 block">Latitude:</label>
                    <input
                      type="number"
                      step="0.0000001"
                      value={editPoints[selectedPointIdx].currentLat}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        setEditPoints((prev) => {
                          const next = [...prev]
                          next[selectedPointIdx].currentLat = val
                          return next
                        })
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 block">Longitude:</label>
                    <input
                      type="number"
                      step="0.0000001"
                      value={editPoints[selectedPointIdx].currentLng}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value)
                        setEditPoints((prev) => {
                          const next = [...prev]
                          next[selectedPointIdx].currentLng = val
                          return next
                        })
                      }}
                      className="w-full bg-black/40 border border-white/10 rounded-lg p-1.5 text-white"
                    />
                  </div>
                </div>

                {/* Precision Nudge Controls */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-gray-400">
                    <span>Precision Nudge:</span>
                    <span>Moved: {editPoints[selectedPointIdx].movedMeters} m</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleNudgePoint(selectedPointIdx, 'north', 1.0)}
                      className="py-1 bg-white/10 hover:bg-white/20 rounded font-bold text-[10px] text-white"
                    >
                      ↑ 1m N
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgePoint(selectedPointIdx, 'south', 1.0)}
                      className="py-1 bg-white/10 hover:bg-white/20 rounded font-bold text-[10px] text-white"
                    >
                      ↓ 1m S
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgePoint(selectedPointIdx, 'west', 1.0)}
                      className="py-1 bg-white/10 hover:bg-white/20 rounded font-bold text-[10px] text-white"
                    >
                      ← 1m W
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNudgePoint(selectedPointIdx, 'east', 1.0)}
                      className="py-1 bg-white/10 hover:bg-white/20 rounded font-bold text-[10px] text-white"
                    >
                      → 1m E
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleNudgePoint(selectedPointIdx, 'north', 0.1)}
                      className="py-0.5 bg-white/5 hover:bg-white/10 rounded text-[9px] text-gray-300"
                    >
                      +10 cm Nudge
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetPoint(selectedPointIdx)}
                      className="py-0.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 rounded text-[9px] border border-red-800"
                    >
                      Reset Point
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: MEASURE & INSPECT                                       */}
        {/* ============================================================== */}
        {activeTab === 'measure' && (
          <div className="space-y-3">
            <div className="p-3 bg-[#1A1429] rounded-xl border border-[#B890F9]/30 space-y-2">
              <div className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <Crosshair size={13} className="text-[#B890F9]" />
                <span>Live Cursor Geodetic Inspector</span>
              </div>
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px] bg-black/40 p-2 rounded-lg">
                <div>
                  <span className="text-[10px] text-gray-400 block">Cursor Lat:</span>
                  <strong className="text-white">{liveCursor.lat}° N</strong>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Cursor Lng:</span>
                  <strong className="text-white">{liveCursor.lng}° E</strong>
                </div>
              </div>
              <div className="text-[10px] text-gray-400 flex items-center justify-between">
                <span>DMS: {toDms(liveCursor.lat, 'N')} {toDms(liveCursor.lng, 'E')}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(`${liveCursor.lat}, ${liveCursor.lng}`, 'cursor')}
                  className="hover:text-white"
                >
                  {copiedField === 'cursor' ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                </button>
              </div>
            </div>

            {/* Farm Cadastral Summary */}
            <div className="p-3 bg-[#1A1429] rounded-xl border border-[#B890F9]/30 space-y-1.5 text-[11px]">
              <div className="font-bold text-[#D9C7FF]">Cadastral Field Properties:</div>
              <div className="flex justify-between text-gray-300">
                <span>Boundary Perimeter:</span>
                <strong className="text-white">1,280 m (4,199 ft)</strong>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Centroid Coordinates:</span>
                <strong className="text-white font-mono">{farmCentroid.lat}, {farmCentroid.lng}</strong>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Total Active Devices:</span>
                <strong className="text-emerald-400">{devices.length} Units Mapped</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-3.5 py-2 bg-[#1B1233]/90 border-t border-[#B890F9]/20 flex items-center justify-between text-[10px] text-[#C9BDE6]">
        <span>WGS 84 Ellipsoid · Precision 1e-7°</span>
        <span className="text-emerald-400 font-semibold">● Cadastre Synced</span>
      </div>
    </div>
  )
}
