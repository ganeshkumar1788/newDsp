import React, { useEffect, useRef, useState, useCallback } from 'react'

/**
 * Google Maps Dark Theme JSON Style
 * Designed for V2V Tech dark theme palette (#0B0F14, #111823, #172030, #2A0C58, #3C1775)
 */
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0b0f19' }, { weight: 3 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#cbd5e1' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#e2e8f0' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#a78bfa' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#062816' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4ade80' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3c1775' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#2a0c58' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#f1f5f9' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#091528' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#38bdf8' }],
  },
]

/**
 * Creates custom themed SVG marker icon for Google Maps
 */
function createSvgMarker(svgContent, bg = '#2A0C58', border = '#8A57C0', size = 36) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.4"/>
        </filter>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${bg}" stroke="${border}" stroke-width="2.5" filter="url(#shadow)"/>
      <g transform="translate(${(size - 18) / 2}, ${(size - 18) / 2})">
        ${svgContent}
      </g>
    </svg>
  `
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: window.google ? new window.google.maps.Size(size, size) : null,
    anchor: window.google ? new window.google.maps.Point(size / 2, size / 2) : null,
  }
}

// SVGs for marker types
const SVGS = {
  water: '<path fill="#FFFFFF" d="M9 2.5C9 2.5 4.5 8 4.5 11.5a4.5 4.5 0 0 0 9 0C13.5 8 9 2.5 9 2.5z"/>',
  camera: '<path fill="#FFFFFF" d="M3 6h3l1.5-2h3L12 6h3a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 15 16H3a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 3 6zm6 7.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>',
  sensor: '<path fill="#FFFFFF" d="M9 1a8 8 0 0 1 8 8h-2a6 6 0 0 0-6-6V1zm0 4a4 4 0 0 1 4 4h-2a2 2 0 0 0-2-2V5zm-1 5a2 2 0 1 0 2 2 2 2 0 0 0-2-2v7H7v-7z"/>',
  power: '<path fill="#FFFFFF" d="M10 2 3 11h5l-2 7 8-9h-5l3-7z"/>',
  farmer: '<path fill="#FFFFFF" d="M9 2a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm-6 13c0-2.5 3-4 6-4s6 1.5 6 4v1H3v-1z"/>',
  reference_point: '<path fill="#FFFFFF" d="M9 2a3.5 3.5 0 0 0-3.5 3.5C5.5 8.5 9 14 9 14s3.5-5.5 3.5-8.5A3.5 3.5 0 0 0 9 2zm0 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>',
  observation: '<path fill="#FFFFFF" d="M9 3C5 3 1.7 5.5.5 9c1.2 3.5 4.5 6 8.5 6s7.3-2.5 8.5-6c-1.2-3.5-4.5-6-8.5-6zm0 10a4 4 0 1 1 0-8 4 4 0 0 1 0 8z"/>',
  photo: '<path fill="#FFFFFF" d="M3 6h3l1.5-2h3L12 6h3a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 15 16H3a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 3 6zm6 7.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>',
  device: '<path fill="#FFFFFF" d="M4 4h10v10H4zM2 6h2v2H2zm0 4h2v2H2zm12-4h2v2h-2zm0 4h2v2h-2zm-8-8h2v2H6zm4 0h2v2h-2zm-4 12h2v2H6zm4 0h2v2h-2z"/>',
}

/**
 * GoogleLandMap
 * Premium Google Maps replacement for V2V AgriMap DSP.
 * Renders farmland boundary, crop zones, linear infrastructure, and interactive SVG markers.
 * Strictly reads existing coordinates and skips missing coordinates without modifying saved data.
 */
export default function GoogleLandMap({
  center = [10.6585, 77.0125],
  zoom = 16,
  mapType = 'hybrid', // 'hybrid' | 'roadmap' | 'satellite'
  geojson = null,
  activeLayers = {
    boundary: true,
    zones: true,
    borewells: true,
    cctv: true,
    pipelines: true,
    sensors: true,
    power: true,
  },
  onMarkerClick = () => {},
  farmers = null, // Optional list of farmers for directory view
  className = 'w-full h-full',
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const infoWindowRef = useRef(null)
  const markersRef = useRef([])
  const polygonsRef = useRef([])
  const polylinesRef = useRef([])

  const [apiReady, setApiReady] = useState(false)
  const [loadError, setLoadError] = useState(null)

  // 1. Wait for / check Google Maps API
  useEffect(() => {
    let checkInterval = null
    let timeoutTimer = null

    if (window.google && window.google.maps) {
      setApiReady(true)
      return
    }

    checkInterval = setInterval(() => {
      if (window.google && window.google.maps) {
        setApiReady(true)
        clearInterval(checkInterval)
        clearTimeout(timeoutTimer)
      }
    }, 200)

    timeoutTimer = setTimeout(() => {
      clearInterval(checkInterval)
      if (!window.google || !window.google.maps) {
        setLoadError('Google Maps API is taking longer to load. Please verify your internet or API key.')
      }
    }, 10000)

    return () => {
      if (checkInterval) clearInterval(checkInterval)
      if (timeoutTimer) clearTimeout(timeoutTimer)
    }
  }, [])

  // 2. Initialize Map Instance
  useEffect(() => {
    if (!apiReady || !mapContainerRef.current) return

    try {
      const isDark = document.documentElement.classList.contains('dark')
      const [initLat, initLng] = center

      const mapOptions = {
        center: { lat: initLat, lng: initLng },
        zoom: zoom,
        mapTypeId: mapType,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        rotateControl: true,
        scaleControl: true,
        styles: isDark && mapType === 'roadmap' ? DARK_MAP_STYLE : undefined,
      }

      const map = new window.google.maps.Map(mapContainerRef.current, mapOptions)
      mapInstanceRef.current = map
      infoWindowRef.current = new window.google.maps.InfoWindow({ maxWidth: 320 })
    } catch (err) {
      console.error('[GoogleLandMap] Error initializing Google Map:', err)
      setLoadError(err.message)
    }

    return () => {
      // Cleanup markers & shapes
      markersRef.current.forEach(m => m.setMap(null))
      markersRef.current = []
      polygonsRef.current.forEach(p => p.setMap(null))
      polygonsRef.current = []
      polylinesRef.current.forEach(l => l.setMap(null))
      polylinesRef.current = []
    }
  }, [apiReady, mapType])

  // Helper to open styled InfoWindow
  const openInfoWindow = useCallback((position, contentHtml) => {
    if (!infoWindowRef.current || !mapInstanceRef.current) return
    infoWindowRef.current.setContent(contentHtml)
    infoWindowRef.current.setPosition(position)
    infoWindowRef.current.open(mapInstanceRef.current)
  }, [])

  // 3. Render Features (Boundary, Zones, Lines, Markers)
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map || !apiReady) return

    // Clear previous shapes
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
    polygonsRef.current.forEach(p => p.setMap(null))
    polygonsRef.current = []
    polylinesRef.current.forEach(l => l.setMap(null))
    polylinesRef.current = []

    const bounds = new window.google.maps.LatLngBounds()
    let hasCoordsForBounds = false

    // ── Case A: Farmers Directory Markers ──
    if (Array.isArray(farmers) && farmers.length > 0) {
      farmers.forEach(farmer => {
        // STRICT RULE: Only read existing coordinates. If missing, skip without modifying record!
        let lat = null
        let lng = null

        if (Array.isArray(farmer.coordinates) && farmer.coordinates.length >= 2) {
          lat = farmer.coordinates[0]
          lng = farmer.coordinates[1]
        } else if (farmer.lat && farmer.lng) {
          lat = Number(farmer.lat)
          lng = Number(farmer.lng)
        }

        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
          return // Skip safely!
        }

        const pos = { lat, lng }
        bounds.extend(pos)
        hasCoordsForBounds = true

        const marker = new window.google.maps.Marker({
          position: pos,
          map,
          title: farmer.full_name || farmer.name || 'Verified Farmer',
          icon: createSvgMarker(SVGS.farmer, '#2A0C58', '#8A57C0', 36),
        })

        marker.addListener('click', () => {
          const content = `
            <div style="font-family: inherit; padding: 4px; min-width: 180px;">
              <h4 style="margin: 0 0 4px; font-weight: 800; font-size: 14px; color: #2A0C58;">${farmer.full_name || farmer.name}</h4>
              <p style="margin: 0 0 4px; font-size: 11px; color: #4b5563;">${farmer.village || farmer.address || 'Verified Farm'}</p>
              <div style="font-size: 11px; margin-bottom: 6px;">
                <strong>Khata:</strong> #${farmer.khata_number || 'N/A'}<br/>
                <strong>Acres:</strong> ${farmer.total_acres || 'N/A'} Ac
              </div>
              <button id="info-btn-${farmer.id}" style="background: #3C1775; color: white; border: none; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
                View Farm Map →
              </button>
            </div>
          `
          openInfoWindow(pos, content)
          setTimeout(() => {
            const btn = document.getElementById(`info-btn-${farmer.id}`)
            if (btn) btn.onclick = () => onMarkerClick({ type: 'farmer', data: farmer })
          }, 100)
        })

        markersRef.current.push(marker)
      })
    }

    // ── Case B: Farmland GeoJSON Features ──
    const features = geojson?.features || []

    features.forEach((feat, idx) => {
      const p = feat.properties || {}
      const geom = feat.geometry
      if (!geom) return

      const entityType = p.entity_type
      const resourceClass = p.resource_class
      const deviceType = p.device_type
      const resourceType = p.resource_type

      // 1. Boundary Polygon
      if (activeLayers.boundary && (entityType === 'field' || geom.type === 'Polygon' || geom.type === 'MultiPolygon')) {
        if (entityType === 'field') {
          const rings = geom.type === 'Polygon' ? geom.coordinates : (geom.coordinates[0] || [])
          if (rings && rings.length > 0) {
            const path = rings[0].map(([lng, lat]) => {
              const pt = { lat, lng }
              bounds.extend(pt)
              hasCoordsForBounds = true
              return pt
            })

            const poly = new window.google.maps.Polygon({
              paths: path,
              strokeColor: '#10B981',
              strokeOpacity: 0.9,
              strokeWeight: 2.5,
              fillColor: '#10B981',
              fillOpacity: 0.08,
              map,
            })

            poly.addListener('click', () => {
              onMarkerClick({ type: 'field', data: p })
            })

            polygonsRef.current.push(poly)
            return
          }
        }
      }

      // 2. Crop Zones Polygon
      if (activeLayers.zones && entityType === 'zone' && (geom.type === 'Polygon' || geom.type === 'MultiPolygon')) {
        const rings = geom.type === 'Polygon' ? geom.coordinates : (geom.coordinates[0] || [])
        if (rings && rings.length > 0) {
          const zColor = p.shade_color || '#8A57C0'
          const path = rings[0].map(([lng, lat]) => {
            const pt = { lat, lng }
            bounds.extend(pt)
            hasCoordsForBounds = true
            return pt
          })

          const poly = new window.google.maps.Polygon({
            paths: path,
            strokeColor: zColor,
            strokeOpacity: 0.95,
            strokeWeight: 2,
            fillColor: zColor,
            fillOpacity: 0.35,
            map,
          })

          poly.addListener('click', () => {
            onMarkerClick({ type: 'zone', data: p })
          })

          polygonsRef.current.push(poly)
          return
        }
      }

      // 3. Lines (Pipelines, Roads)
      if (activeLayers.pipelines && (geom.type === 'LineString' || entityType === 'line')) {
        const coords = geom.coordinates || []
        if (coords.length >= 2) {
          const strokeColor = p.color || (resourceType === 'internal_path' ? '#F59E0B' : '#0284C7')
          const path = coords.map(([lng, lat]) => {
            const pt = { lat, lng }
            bounds.extend(pt)
            hasCoordsForBounds = true
            return pt
          })

          const line = new window.google.maps.Polyline({
            path,
            strokeColor,
            strokeOpacity: 0.95,
            strokeWeight: p.weight || 4,
            map,
          })

          line.addListener('click', () => {
            onMarkerClick({ type: 'line_inspector', data: p })
          })

          polylinesRef.current.push(line)
          return
        }
      }

      // 4. Point Markers (Borewell, CCTV, Sensor, Power)
      if (geom.type === 'Point' && Array.isArray(geom.coordinates) && geom.coordinates.length >= 2) {
        const [lng, lat] = geom.coordinates
        if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return

        const pos = { lat, lng }
        bounds.extend(pos)
        hasCoordsForBounds = true

        let iconObj = null
        let modalType = null
        let title = p.name || 'Farmland Asset'

        if (activeLayers.borewells && (resourceType === 'borewell_pump' || resourceClass === 'WATER')) {
          const isRunning = p.status === 'ACTIVE_RUNNING'
          iconObj = createSvgMarker(SVGS.water, isRunning ? '#059669' : '#2E0D5E', isRunning ? '#34D399' : '#8A57C0', 36)
          modalType = 'borewell'
        } else if (activeLayers.cctv && (deviceType === 'cctv_camera' || p.cctv_id)) {
          iconObj = createSvgMarker(SVGS.camera, '#3C1775', '#A78BFA', 36)
          modalType = 'cctv'
        } else if (activeLayers.sensors && (deviceType === 'soil_sensor' || deviceType === 'weather_station')) {
          iconObj = createSvgMarker(SVGS.sensor, '#5E4678', '#C084FC', 36)
          modalType = 'sensor'
        } else if (activeLayers.power && (resourceClass === 'POWER' || p.voltage)) {
          iconObj = createSvgMarker(SVGS.power, '#D97706', '#FBBF24', 36)
          modalType = 'power'
        } else if (entityType === 'reference_point') {
          iconObj = createSvgMarker(SVGS.reference_point, '#DC2626', '#F87171', 34)
          modalType = 'reference_point'
        } else if (entityType === 'observation') {
          iconObj = createSvgMarker(SVGS.observation, '#7C3AED', '#C084FC', 34)
          modalType = 'observation'
        } else if (entityType === 'photo') {
          iconObj = createSvgMarker(SVGS.photo, '#D97706', '#FBBF24', 34)
          modalType = 'photo'
        } else if (entityType === 'device') {
          iconObj = createSvgMarker(SVGS.device, '#0F172A', '#38BDF8', 34)
          modalType = 'device'
        }

        if (iconObj && modalType) {
          const marker = new window.google.maps.Marker({
            position: pos,
            map,
            title,
            icon: iconObj,
          })

          marker.addListener('click', () => {
            const popupContent = `
              <div style="font-family: inherit; padding: 4px; min-width: 170px;">
                <div style="font-weight: 800; font-size: 13px; color: #2A0C58;">${title}</div>
                <div style="font-size: 11px; color: #6b7280; margin: 3px 0 6px;">
                  Status: <strong>${p.status || 'Active'}</strong>
                </div>
                <button id="marker-popup-btn-${idx}" style="background: #3C1775; color: white; border: none; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: bold; cursor: pointer;">
                  View Diagnostics →
                </button>
              </div>
            `
            openInfoWindow(pos, popupContent)
            setTimeout(() => {
              const btn = document.getElementById(`marker-popup-btn-${idx}`)
              if (btn) btn.onclick = () => onMarkerClick({ type: modalType, data: p })
            }, 100)
          })

          markersRef.current.push(marker)
        }
      }
    })

    // Fit bounds automatically
    if (hasCoordsForBounds && !bounds.isEmpty()) {
      map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 })
    }
  }, [geojson, farmers, activeLayers, apiReady, openInfoWindow, onMarkerClick])

  // Center update if changed
  useEffect(() => {
    if (mapInstanceRef.current && center && isValidCoord(center[0]) && isValidCoord(center[1])) {
      mapInstanceRef.current.panTo({ lat: center[0], lng: center[1] })
    }
  }, [center])

  if (loadError) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-900 text-white p-6 rounded-2xl border border-slate-800 ${className}`}>
        <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center text-xl mb-3">
          ⚠️
        </div>
        <h4 className="font-bold text-base mb-1">Google Maps Initialization Notice</h4>
        <p className="text-xs text-gray-400 text-center max-w-sm mb-4">
          {loadError}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-1.5 bg-v2v-purple hover:bg-v2v-violet text-white text-xs font-semibold rounded-xl transition-all cursor-pointer"
        >
          Reload Page
        </button>
      </div>
    )
  }

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {!apiReady && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 text-white backdrop-blur-sm">
          <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mb-3" />
          <span className="text-xs font-medium text-slate-300">Loading Google Satellite & Cadastral Twin...</span>
        </div>
      )}
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  )
}

function isValidCoord(num) {
  return typeof num === 'number' && !isNaN(num) && num !== 0
}
