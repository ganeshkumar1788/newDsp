/**
 * LocationPickerMiniMap.jsx — Reusable Satellite Location Form Picker
 *
 * Implements:
 * - LocationFinder input on top of interactive clean satellite mini map
 * - "Pick on map" mode: click or drag to position pin
 * - "Use my current location" button with browser geolocation
 * - Chosen point display: Decimal + DMS, match level & Approximate tag, Reset button
 * - Clean satellite imagery with role marker icons (Sprout for Farmer, User for Customer, Store for Dealer)
 * - Maximum 7 decimals precision on new coordinates
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MapPin,
  Crosshair,
  LocateFixed,
  RotateCcw,
  Copy,
  Check,
  AlertTriangle,
  Compass,
  Info,
} from 'lucide-react'
import LocationFinder from './LocationFinder'
import { toDms } from '../../lib/coordinateParser'

export default function LocationPickerMiniMap({
  location = null,
  onChange = null,
  label = 'Location',
  hint = null,
  role = 'farmer',
  allowCurrentLocation = true,
  className = '',
}) {
  const [selectedPoint, setSelectedPoint] = useState(location || null)
  const [isPickingOnMap, setIsPickingOnMap] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [geoError, setGeoError] = useState(null)
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)

  // Sync external location prop if changed
  useEffect(() => {
    if (location && (!selectedPoint || location.lat !== selectedPoint.lat || location.lng !== selectedPoint.lng)) {
      setSelectedPoint(location)
    }
  }, [location])

  const initialLat = selectedPoint?.lat || 10.6585
  const initialLng = selectedPoint?.lng || 77.0125

  // Initialize mini map (Leaflet or Google Maps)
  useEffect(() => {
    let map = null
    let marker = null

    // Check if Leaflet is available in bundle
    const initLeaflet = async () => {
      try {
        const L = (await import('leaflet')).default
        if (!mapContainerRef.current) return

        map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: selectedPoint ? 16 : 14,
          zoomControl: true,
          attributionControl: false,
        })

        // Esri World Imagery (Clean Satellite)
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19 }
        ).addTo(map)

        // Custom marker icon based on role
        const getMarkerColor = () => {
          if (role === 'farmer') return '#10B981' // Emerald
          if (role === 'consumer') return '#3B82F6' // Blue
          if (role === 'dealer') return '#F59E0B' // Amber
          return '#8A57C0'
        }

        const createDivIcon = () => {
          const color = getMarkerColor()
          return L.divIcon({
            className: 'agrimap-custom-picker-pin',
            html: `
              <div style="
                width: 34px;
                height: 34px;
                border-radius: 50%;
                background: ${color};
                border: 2.5px solid #FFFFFF;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                color: #FFFFFF;
                font-size: 16px;
                cursor: grab;
              ">
                ${role === 'farmer' ? '🌱' : role === 'consumer' ? '👤' : '🏪'}
              </div>
            `,
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          })
        }

        if (selectedPoint) {
          marker = L.marker([selectedPoint.lat, selectedPoint.lng], {
            draggable: true,
            icon: createDivIcon(),
          }).addTo(map)

          marker.on('dragend', (e) => {
            const pos = e.target.getLatLng()
            handleUpdateCoords(pos.lat, pos.lng, 'map-pick')
          })
          markerRef.current = marker
        }

        // Map Click to drop/move pin
        map.on('click', (e) => {
          const { lat, lng } = e.latlng
          handleUpdateCoords(lat, lng, 'map-pick')
          setIsPickingOnMap(false)

          if (!marker) {
            marker = L.marker([lat, lng], {
              draggable: true,
              icon: createDivIcon(),
            }).addTo(map)

            marker.on('dragend', (ev) => {
              const p = ev.target.getLatLng()
              handleUpdateCoords(p.lat, p.lng, 'map-pick')
            })
            markerRef.current = marker
          } else {
            marker.setLatLng([lat, lng])
          }
        })

        mapInstanceRef.current = map
      } catch (err) {
        console.warn('[LocationPickerMiniMap] Failed to load Leaflet:', err)
      }
    }

    initLeaflet()

    return () => {
      if (map) {
        map.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  // Update coordinates handler (rounds to max 7 decimal places)
  const handleUpdateCoords = useCallback(
    (lat, lng, source = 'coordinates', extra = {}) => {
      const roundedLat = Number(lat.toFixed(7))
      const roundedLng = Number(lng.toFixed(7))

      const newLoc = {
        lat: roundedLat,
        lng: roundedLng,
        source: source || 'coordinates',
        query: extra.query || `${roundedLat}, ${roundedLng}`,
        matchLevel: extra.matchedLevel || 'Exact',
        approximate: Boolean(extra.approximate),
        address: extra.address || extra.matchedText || '',
        pincode: extra.pincode || null,
        savedAt: new Date().toISOString(),
        savedBy: 'admin',
      }

      setSelectedPoint(newLoc)
      if (typeof onChange === 'function') {
        onChange(newLoc)
      }

      // Pan map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.panTo([roundedLat, roundedLng])
        if (markerRef.current) {
          markerRef.current.setLatLng([roundedLat, roundedLng])
        }
      }
    },
    [onChange]
  )

  // Reset location
  const handleReset = () => {
    setSelectedPoint(null)
    setIsPickingOnMap(false)
    if (markerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(markerRef.current)
      markerRef.current = null
    }
    if (typeof onChange === 'function') {
      onChange(null)
    }
  }

  // Use current browser location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.')
      return
    }

    setIsLocating(true)
    setGeoError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        handleUpdateCoords(pos.coords.latitude, pos.coords.longitude, 'device', {
          matchedLevel: 'Exact',
          approximate: false,
        })
      },
      (err) => {
        setIsLocating(false)
        if (err.code === 1) {
          setGeoError('Location access denied. Please allow location permissions in your browser.')
        } else {
          setGeoError('Unable to determine location. Check your GPS / internet connection.')
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // Copy coordinates
  const handleCopy = (text) => {
    try {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {}
  }

  const decString = selectedPoint ? `${selectedPoint.lat.toFixed(6)}, ${selectedPoint.lng.toFixed(6)}` : ''
  const dmsString = selectedPoint
    ? `${toDms(selectedPoint.lat, selectedPoint.lat >= 0 ? 'N' : 'S')} ${toDms(selectedPoint.lng, selectedPoint.lng >= 0 ? 'E' : 'W')}`
    : ''

  return (
    <div className={`space-y-2.5 p-3.5 rounded-2xl bg-white dark:bg-[#1A1429] border border-gray-200 dark:border-purple-900/40 shadow-sm text-xs ${className}`}>
      {/* Header & Label */}
      <div className="flex items-center justify-between">
        <div>
          <label className="font-bold text-gray-900 dark:text-white text-xs flex items-center gap-1.5">
            <MapPin size={14} className="text-[#8A57C0]" />
            <span>{label}</span>
            <span className="text-[10px] text-gray-400 font-normal">(Optional)</span>
          </label>
          {hint && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{hint}</p>}
        </div>

        {selectedPoint && (
          <button
            type="button"
            onClick={handleReset}
            className="px-2 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            title="Remove chosen location"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Embedded LocationFinder */}
      <LocationFinder
        role="admin"
        placeholder={`Search ${label.toLowerCase()} (coordinates, pincode, village)...`}
        onLocationSelect={(res) => {
          handleUpdateCoords(res.lat, res.lng, res.type, res)
        }}
        onPickOnMap={() => setIsPickingOnMap(!isPickingOnMap)}
        isPickingOnMap={isPickingOnMap}
      />

      {/* Action Bar: Pick on Map & Use Current Location */}
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => setIsPickingOnMap(!isPickingOnMap)}
          className={`flex-1 py-1.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            isPickingOnMap
              ? 'bg-amber-500 text-black border-amber-400 shadow-sm animate-pulse'
              : 'bg-gray-50 dark:bg-purple-950/40 hover:bg-gray-100 dark:hover:bg-purple-950/70 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-purple-800/60'
          }`}
        >
          <Crosshair size={13} className={isPickingOnMap ? 'text-black' : 'text-[#8A57C0]'} />
          <span>{isPickingOnMap ? 'Click mini-map to drop pin' : 'Pick on map'}</span>
        </button>

        {allowCurrentLocation && (
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="py-1.5 px-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            title="Use current GPS location"
          >
            <LocateFixed size={13} className="text-blue-600 dark:text-blue-400" />
            <span>{isLocating ? 'Locating...' : 'My location'}</span>
          </button>
        )}
      </div>

      {geoError && (
        <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-1.5">
          <AlertTriangle size={13} className="shrink-0 text-rose-500" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Mini Satellite Map Canvas */}
      <div className="relative w-full h-[180px] rounded-xl overflow-hidden border border-gray-200 dark:border-purple-900/60 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full" style={{ background: '#131313' }} />

        {isPickingOnMap && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-[1000] bg-black/80 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1 rounded-full border border-amber-400/60 shadow-lg pointer-events-none flex items-center gap-1.5">
            <Crosshair size={12} className="text-amber-400 animate-spin" />
            <span>Click anywhere to position marker</span>
          </div>
        )}
      </div>

      {/* Chosen Coordinates & Level Display */}
      {selectedPoint ? (
        <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#140D26] border border-gray-200 dark:border-[#B890F9]/30 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-[#8A57C0] tracking-wider">
              Selected Point
            </span>
            <span
              className={`text-[9px] px-2 py-0.2 rounded-full font-bold border ${
                selectedPoint.approximate
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300'
              }`}
            >
              {selectedPoint.matchLevel || 'Exact'}{' '}
              {selectedPoint.approximate ? '(Approximate)' : ''}
            </span>
          </div>

          <div className="flex items-center justify-between font-mono text-[11px]">
            <span className="text-gray-900 dark:text-white font-bold">{decString}</span>
            <button
              type="button"
              onClick={() => handleCopy(decString)}
              className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              title="Copy decimal coordinates"
            >
              {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
              <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="text-[10px] text-gray-500 dark:text-[#C9BDE6] font-mono">{dmsString}</div>
        </div>
      ) : (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 italic text-center py-0.5">
          No location pinned yet. Type an address or click "Pick on map".
        </p>
      )}
    </div>
  )
}
