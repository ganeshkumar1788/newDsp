/**
 * ExactLocationPanel.jsx — Admin Exact Location & Geocoding Studio
 *
 * Exclusively visible to Administrators and Surveyors on the Farmland Digital Twin (/farmer).
 * Farmers never see this panel.
 *
 * Displays:
 * 1. Overview Tab:
 *    - Farm & Farmer name, stored address
 *    - Render-time centroid coordinates in Decimal and DMS
 *    - Boundary Bounding Box (N, S, E, W) and corner vertex count
 *    - Location source indicator ("Surveyed boundary" vs "Address, approximate")
 *    - Registered vs Mapped area comparison with mismatch alert (> 2%)
 *    - Action buttons: Copy coordinates, Center on farm, Open in Google Maps,
 *      Toggle Farm Center Target reticle on map, and "My Location" browser geolocation.
 * 2. Find Tab:
 *    - Universal LocationFinder with coordinates, pincode, and address ladder
 *    - Point-in-polygon verification, distance and bearing to farm centroid
 *    - "Which farm is here?" nearest cadastral lookup
 *    - Direct hand-off to Land & Drawing Editor for draft placement
 */
import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin,
  Crosshair,
  Navigation,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Layers,
  AlertTriangle,
  Compass,
  Shield,
  X,
  Radio,
  Eye,
  EyeOff,
  LocateFixed,
} from 'lucide-react'
import LocationFinder from './LocationFinder'
import {
  calculatePolygonCentroid,
  calculatePolygonArea,
  extractBoundaryLatLngs,
  getDistanceMeters,
} from '../../lib/geoUtils'
import { toDms } from '../../lib/coordinateParser'

export default function ExactLocationPanel({
  role = 'admin',
  farmer = null,
  geojson = null,
  allFarmers = [],
  map = null,
  google = null,
  onToggleFarmCenterMarker = null,
  className = '',
}) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'find'
  const [copied, setCopied] = useState(false)
  const [showCenterMarker, setShowCenterMarker] = useState(false)
  const [myLocation, setMyLocation] = useState(null)
  const [myLocationError, setMyLocationError] = useState(null)
  const [isLocating, setIsLocating] = useState(false)

  // Map overlay refs for temporary admin indicators
  const centerMarkerRef = useRef(null)
  const myLocationMarkerRef = useRef(null)
  const myLocationCircleRef = useRef(null)

  // Only Admins, Surveyors and Land Verifiers can view this panel
  const isAuthorized = role === 'admin' || role === 'surveyor' || role === 'land_verifier'
  if (!isAuthorized) return null

  // Extract boundary coordinates from GeoJSON
  const boundaryPoints = useMemo(() => {
    const fieldFeat = geojson?.features?.find((f) => f.properties?.entity_type === 'field')
    if (fieldFeat?.geometry) {
      return extractBoundaryLatLngs(fieldFeat.geometry)
    }
    return []
  }, [geojson])

  // Compute boundary centroid or fallback to stored approximate location
  const centroid = useMemo(() => {
    if (boundaryPoints.length >= 3) {
      return calculatePolygonCentroid(boundaryPoints)
    }
    // Fallback: If farm has known coordinates or district center
    return [10.6585, 77.0125]
  }, [boundaryPoints])

  const hasSurveyedBoundary = boundaryPoints.length >= 3

  // Compute bounding box
  const boundingBox = useMemo(() => {
    if (boundaryPoints.length < 3) return null
    let minLat = Infinity,
      maxLat = -Infinity,
      minLng = Infinity,
      maxLng = -Infinity
    boundaryPoints.forEach(([lat, lng]) => {
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lng < minLng) minLng = lng
      if (lng > maxLng) maxLng = lng
    })
    return {
      north: maxLat.toFixed(5),
      south: minLat.toFixed(5),
      east: maxLng.toFixed(5),
      west: minLng.toFixed(5),
    }
  }, [boundaryPoints])

  // Area calculation & mismatch check
  const mappedArea = useMemo(() => {
    if (boundaryPoints.length < 3) return { acres: '0.00', hectares: '0.00' }
    return calculatePolygonArea(boundaryPoints)
  }, [boundaryPoints])

  const registeredAcres = parseFloat(farmer?.total_acres || 0)
  const calculatedAcres = parseFloat(mappedArea.acres || 0)
  const areaDiffPercent =
    registeredAcres > 0 && calculatedAcres > 0
      ? Math.abs((calculatedAcres - registeredAcres) / registeredAcres) * 100
      : 0
  const hasAreaMismatch = areaDiffPercent > 2 && calculatedAcres > 0

  // Format centroid in Decimal & DMS
  const centerLat = centroid ? centroid[0] : 10.6585
  const centerLng = centroid ? centroid[1] : 77.0125
  const decimalCoords = `${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`
  const dmsCoords = `${toDms(centerLat, centerLat >= 0 ? 'N' : 'S')} ${toDms(centerLng, centerLng >= 0 ? 'E' : 'W')}`

  // Copy coordinates to clipboard
  const handleCopyCoords = (text) => {
    try {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {}
  }

  // Center map on farm boundary
  const handleCenterOnFarm = () => {
    window.dispatchEvent(new CustomEvent('agrimap:recenter-farm'))
  }

  // Toggle Farm Center Target Marker (Violet ring + crosshair)
  const handleToggleCenterMarker = () => {
    const next = !showCenterMarker
    setShowCenterMarker(next)

    window.dispatchEvent(
      new CustomEvent('agrimap:toggle-farm-center-marker', {
        detail: { show: next, center: { lat: centerLat, lng: centerLng } },
      })
    )

    if (map && google && google.maps) {
      if (next) {
        if (!centerMarkerRef.current) {
          centerMarkerRef.current = new google.maps.Marker({
            position: { lat: centerLat, lng: centerLng },
            map,
            title: `Farm Centroid: ${farmer?.full_name}`,
            zIndex: 350,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#8A57C0',
              fillOpacity: 0.85,
              strokeColor: '#FFFFFF',
              strokeWeight: 3,
            },
          })
        } else {
          centerMarkerRef.current.setMap(map)
          centerMarkerRef.current.setPosition({ lat: centerLat, lng: centerLng })
        }
      } else {
        if (centerMarkerRef.current) {
          centerMarkerRef.current.setMap(null)
        }
      }
    }

    if (typeof onToggleFarmCenterMarker === 'function') {
      onToggleFarmCenterMarker(next, { lat: centerLat, lng: centerLng })
    }
  }

  // Browser Geolocation ("My Location" - Admin Only)
  const handleGetMyLocation = () => {
    if (!navigator.geolocation) {
      setMyLocationError('Geolocation is not supported by your browser.')
      return
    }

    setIsLocating(true)
    setMyLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        const accuracy = pos.coords.accuracy

        setMyLocation({ lat, lng, accuracy })

        window.dispatchEvent(
          new CustomEvent('agrimap:show-user-location', {
            detail: { lat, lng, accuracy },
          })
        )

        if (map && google && google.maps) {
          map.panTo({ lat, lng })

          // Clear existing
          if (myLocationMarkerRef.current) myLocationMarkerRef.current.setMap(null)
          if (myLocationCircleRef.current) myLocationCircleRef.current.setMap(null)

          // Blue Dot Marker
          myLocationMarkerRef.current = new google.maps.Marker({
            position: { lat, lng },
            map,
            title: 'Your Location (Admin)',
            zIndex: 450,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: '#2563EB',
              fillOpacity: 1.0,
              strokeColor: '#FFFFFF',
              strokeWeight: 2.5,
            },
          })

          // Accuracy Circle
          myLocationCircleRef.current = new google.maps.Circle({
            strokeColor: '#3B82F6',
            strokeOpacity: 0.6,
            strokeWeight: 1.5,
            fillColor: '#3B82F6',
            fillOpacity: 0.15,
            map,
            center: { lat, lng },
            radius: accuracy,
            zIndex: 440,
          })
        }
      },
      (err) => {
        setIsLocating(false)
        if (err.code === 1) {
          setMyLocationError('Location permission denied. Please allow location access in your browser settings.')
        } else {
          setMyLocationError('Unable to determine location. Check your GPS / internet connection.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // Clean up markers on unmount
  useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('agrimap:clear-user-location'))
      window.dispatchEvent(new CustomEvent('agrimap:toggle-farm-center-marker', { detail: { show: false } }))
      if (centerMarkerRef.current && typeof centerMarkerRef.current.setMap === 'function') {
        centerMarkerRef.current.setMap(null)
      }
      if (myLocationMarkerRef.current && typeof myLocationMarkerRef.current.setMap === 'function') {
        myLocationMarkerRef.current.setMap(null)
      }
      if (myLocationCircleRef.current && typeof myLocationCircleRef.current.setMap === 'function') {
        myLocationCircleRef.current.setMap(null)
      }
    }
  }, [])

  // Google Maps external query link
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${centerLat},${centerLng}`

  return (
    <div
      className={`absolute z-20 pointer-events-auto transition-all sm:top-16 sm:left-3 sm:max-w-[340px] sm:w-full max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:w-full ${className}`}
    >
      <div className="bg-[#131313]/96 dark:bg-[#150F22]/96 backdrop-blur-md rounded-2xl max-sm:rounded-b-none border border-[#B890F9]/30 shadow-2xl overflow-hidden text-xs">
        {/* ── Card Header (Always Visible / Toggle Button) ── */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3.5 py-2.5 flex items-center justify-between text-white hover:bg-white/5 transition-colors cursor-pointer select-none"
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#8A57C0]/30 border border-[#8A57C0]/60 flex items-center justify-center text-[#B890F9] shrink-0">
              <Compass size={14} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-xs">Exact Location</span>
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-[#D9C7FF] border border-purple-500/30 uppercase font-bold">
                  Admin
                </span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono block truncate max-w-[190px]">
                {decimalCoords}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[#C9BDE6]">
            {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </div>
        </div>

        {/* ── Card Body (Collapsible) ── */}
        {isOpen && (
          <div className="border-t border-white/10 p-3.5 space-y-3 max-h-[460px] overflow-y-auto no-scrollbar">
            {/* Tab Navigation */}
            <div className="flex items-center bg-[#1B1233] p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-[#8A57C0] text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('find')}
                className={`flex-1 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'find'
                    ? 'bg-[#8A57C0] text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Find Location</span>
              </button>
            </div>

            {/* ── TAB 1: OVERVIEW ── */}
            {activeTab === 'overview' && (
              <div className="space-y-3">
                {/* Farm & Farmer Info */}
                <div className="p-2.5 rounded-xl bg-[#1B1233] border border-white/5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">
                      {farmer?.full_name || 'Ganesh V.'}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                        hasSurveyedBoundary
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {hasSurveyedBoundary ? 'Surveyed boundary' : 'Address, approximate'}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-tight">
                    {farmer?.address || 'Jallipatti Village, Pollachi Taluk, Coimbatore, TN'}
                  </p>
                </div>

                {/* Centroid Coordinates (Decimal + DMS) */}
                <div className="p-2.5 rounded-xl bg-[#140D26] border border-[#B890F9]/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#A78BFA] tracking-wider">
                      Farm Center Coordinates
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCopyCoords(decimalCoords)}
                        className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-[#D9C7FF] text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Copy decimal coordinates"
                      >
                        {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        <span>{copied ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between text-white font-bold">
                      <span className="text-gray-400 font-sans text-[10px]">Decimal:</span>
                      <span>{decimalCoords}</span>
                    </div>
                    <div className="flex items-center justify-between text-[#D9C7FF]">
                      <span className="text-gray-400 font-sans text-[10px]">DMS:</span>
                      <span>{dmsCoords}</span>
                    </div>
                  </div>
                </div>

                {/* Boundary Bounding Box & Vertices */}
                {boundingBox && (
                  <div className="p-2.5 rounded-xl bg-[#1B1233] border border-white/5 space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      <span>Boundary Bounding Box</span>
                      <span className="text-white font-mono">{boundaryPoints.length} Corner Vertices</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px] text-[#C9BDE6]">
                      <div className="p-1 rounded bg-black/30 flex justify-between">
                        <span className="text-gray-500">N:</span>
                        <span>{boundingBox.north}°</span>
                      </div>
                      <div className="p-1 rounded bg-black/30 flex justify-between">
                        <span className="text-gray-500">S:</span>
                        <span>{boundingBox.south}°</span>
                      </div>
                      <div className="p-1 rounded bg-black/30 flex justify-between">
                        <span className="text-gray-500">E:</span>
                        <span>{boundingBox.east}°</span>
                      </div>
                      <div className="p-1 rounded bg-black/30 flex justify-between">
                        <span className="text-gray-500">W:</span>
                        <span>{boundingBox.west}°</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Area Comparison & Mismatch Alert */}
                <div className="p-2.5 rounded-xl bg-[#1B1233] border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Registered Area:</span>
                    <strong className="text-white font-bold text-xs">{farmer?.total_acres || 21.4} Acres</strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 block">Mapped Area:</span>
                    <strong className="text-emerald-400 font-bold text-xs">
                      {mappedArea.acres} Acres ({mappedArea.hectares} Ha)
                    </strong>
                  </div>
                </div>

                {hasAreaMismatch && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <span className="font-bold block">Area Mismatch ({areaDiffPercent.toFixed(1)}%)</span>
                      <span className="text-[11px] text-amber-200">
                        Mapped boundary differs from registered revenue records by {areaDiffPercent.toFixed(1)}%.
                      </span>
                    </div>
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCenterOnFarm}
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-white/10"
                  >
                    <Crosshair size={13} className="text-[#B890F9]" />
                    <span>Center on farm</span>
                  </button>

                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/10"
                  >
                    <ExternalLink size={13} className="text-[#B890F9]" />
                    <span>Google Maps</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleToggleCenterMarker}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                      showCenterMarker
                        ? 'bg-[#8A57C0] text-white border-purple-400 shadow-sm'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border-white/10'
                    }`}
                  >
                    {showCenterMarker ? <Eye size={13} /> : <EyeOff size={13} />}
                    <span>Center Target</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleGetMyLocation}
                    disabled={isLocating}
                    className="px-2.5 py-1.5 rounded-xl bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LocateFixed size={13} className="text-blue-400" />
                    <span>{isLocating ? 'Locating...' : 'My location'}</span>
                  </button>
                </div>

                {myLocationError && (
                  <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[11px] flex items-center justify-between">
                    <span>{myLocationError}</span>
                    <button onClick={() => setMyLocationError(null)} className="text-rose-400 ml-2">
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 2: FIND LOCATION ── */}
            {activeTab === 'find' && (
              <div className="space-y-3">
                <LocationFinder
                  role="admin"
                  farm={farmer}
                  farmBoundary={boundaryPoints}
                  devices={geojson?.features?.filter((f) => f.geometry?.type === 'Point') || []}
                  allFarms={allFarmers}
                  map={map}
                  google={google}
                  onAddDraft={(draftType, point) => {
                    // Hand off to Land & Drawing Editor
                    const fieldId = farmer?.field_id || 'field-1'
                    navigate(`/admin/editor/${fieldId}`, {
                      state: { draftPlacement: { draftType, point } },
                    })
                  }}
                  onLocationSelect={(res) => {
                    // Selected result callback
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
