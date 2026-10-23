/**
 * AgriMap.jsx — Unified Shared Cadastral Map for Farmer, Admin & Surveyor Portals
 *
 * Implements Google Maps Platform with hardened zero-dialog error suppression,
 * instant automatic fallback to Leaflet satellite backup (Esri World Imagery),
 * and clean satellite styling matching the reference design.
 *
 * All roles (Farmer, Admin, Surveyor) use this single component.
 * Permissions, toolbars, and capabilities are strictly governed by src/lib/mapPermissions.js.
 */
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import {
  loadGoogleMaps,
  getGoogleMapsConfig,
  getGoogleMapsErrorMessage,
  getDetectedApiErrorCode,
} from './googleMapsLoader'
import {
  geoJsonToGooglePaths,
  googlePathsToGeoJson,
  lineGeoJsonToGooglePath,
  pointGeoJsonToGoogleLatLng,
} from './mapAdapters'
import {
  V2V_COLORS,
  CLEAN_MAP_STYLE,
  DARK_MAP_STYLE,
} from './mapStyles'
import {
  createAdvancedMarkerElement,
  createPinMarkerIcon,
  nudgeOverlappingPositions,
  getDeviceStyle,
} from './mapMarkers'
import { hasMapPermission, MAP_CAPABILITIES } from '../../lib/mapPermissions'
import MapToolbar from './MapToolbar'
import MapLegend from './MapLegend'
import CropDistributionPanel from './CropDistributionPanel'
import MapDrawingStudio from './MapDrawingStudio'
import AdminCoordinateStudio from './AdminCoordinateStudio'
import DiagnosticsModal from '../common/DiagnosticsModal'
import LeafletBackupMap from './LeafletBackupMap'
import { classifyFeature, LEGEND_ITEMS } from './legendTypes'
import { farmStorage } from '../../lib/farmStorage'
import { Lock, Info, X, AlertTriangle, Sparkles, RefreshCw, WifiOff } from 'lucide-react'

export default function AgriMap({
  role = 'farmer',
  farm = null,
  geojson = null,
  onSaveGeoJson = null,
  onRequestChange = null,
  ghostGeometry = null,
  readOnly = false,
  height = '620px',
  className = '',
  user = null,
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const googleRef = useRef(null)

  // Map lifecycle & backup state
  const [useBackupMap, setUseBackupMap] = useState(false)
  const [backupReason, setBackupReason] = useState(null)
  const [isTilesLoaded, setIsTilesLoaded] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine)
  const [currentZoom, setCurrentZoom] = useState(16)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  // Layer toggles with persistence
  const [activeLayers, setActiveLayers] = useState(() => {
    try {
      const saved = localStorage.getItem('agrimap.layerPrefs.v1')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return {
      boundary: true,
      zones: true,
      borewells: true,
      valves: true,
      cctv: true,
      sensors: true,
      power: true,
      lines: true,
    }
  })

  // Map style with persistence (default 'satellite' for clean satellite imagery)
  const [mapStyle, setMapStyle] = useState(() => {
    try {
      const saved = localStorage.getItem('agrimap.mapStylePref.v1')
      if (saved) return saved === 'hybrid' ? 'satellite' : saved
    } catch (e) {}
    return 'satellite'
  })

  // Optional labels overlay (off by default)
  const [showLabels, setShowLabels] = useState(false)

  // Farmer first-visit hint state
  const [showFarmerHint, setShowFarmerHint] = useState(() => {
    if (role !== 'farmer') return false
    try {
      return !localStorage.getItem('agrimap.farmerHintDismissed.v1')
    } catch (e) {
      return true
    }
  })

  // Diagnostics modal state for clicked symbols
  const [diagnosticModal, setDiagnosticModal] = useState({
    isOpen: false,
    type: 'borewell',
    data: null,
  })

  // Overlays references for Google Maps
  const overlaysRef = useRef({
    polygons: [],
    polylines: [],
    markers: [],
    labels: [],
    ghosts: [],
  })

  // Effective farm data
  const effectiveFarm = farm || {
    id: 'farmer-1',
    full_name: 'Ganesh V.',
    field_id: 'field-1',
    total_acres: 21.4,
    total_hectares: 8.66,
  }

  const effectiveGeoJson = useMemo(() => {
    if (geojson && geojson.features) return geojson
    return farmStorage.getFieldGeoJSON(effectiveFarm.field_id || 'field-1')
  }, [geojson, effectiveFarm.field_id])

  // Permission checks
  const canEdit = hasMapPermission(role, MAP_CAPABILITIES.EDIT_GEOMETRY) && !readOnly
  const canNavigate = hasMapPermission(role, MAP_CAPABILITIES.COORDINATE_NAVIGATOR) || hasMapPermission(role, 'canUseCoordinateTools')

  // Extract features with strict distinction
  const {
    fieldFeature,
    cropZones,
    borewells,
    valves,
    cctvCameras,
    sensors,
    powerUnits,
    linearFeatures,
  } = useMemo(() => {
    const feats = effectiveGeoJson?.features || []
    const fieldFeat = feats.find((f) => f.properties?.entity_type === 'field')
    const zones = feats.filter((f) => f.properties?.entity_type === 'crop_zone' || f.properties?.crop)

    // Borewells
    const bws = feats.filter(
      (f) =>
        f.properties?.resource_class === 'WATER' ||
        f.properties?.resource_type === 'borewell_pump' ||
        (f.properties?.name || '').toLowerCase().includes('borewell') ||
        (f.properties?.name || '').toLowerCase().includes('tube well')
    )

    // Irrigation Valves 1-8
    const valvs = feats.filter(
      (f) =>
        f.properties?.resource_type === 'irrigation_valve' ||
        f.properties?.resource_type === 'valve' ||
        (f.properties?.name || '').toLowerCase().includes('valve')
    )

    // CCTV Cameras
    const cctvs = feats.filter(
      (f) =>
        f.properties?.device_type === 'cctv_camera' ||
        f.properties?.device_type === 'camera' ||
        (f.properties?.device_name || '').toLowerCase().includes('cctv')
    )

    // Power & Solar Stations
    const power = feats.filter(
      (f) =>
        f.properties?.entity_type === 'power_source' ||
        f.properties?.resource_class === 'POWER' ||
        (f.properties?.name || '').toLowerCase().includes('power') ||
        (f.properties?.name || '').toLowerCase().includes('solar') ||
        (f.properties?.name || '').toLowerCase().includes('feeder')
    )

    // IoT Sensors
    const sens = feats.filter(
      (f) =>
        (f.properties?.device_type === 'soil_sensor' ||
          f.properties?.device_type === 'sensor' ||
          (f.properties?.device_name || '').toLowerCase().includes('sensor') ||
          (f.properties?.device_name || '').toLowerCase().includes('soilsense')) &&
        !bws.includes(f) &&
        !cctvs.includes(f) &&
        !power.includes(f) &&
        !valvs.includes(f)
    )

    // Pipelines, roads, fences
    const lines = feats.filter((f) => f.geometry?.type === 'LineString')

    return {
      fieldFeature: fieldFeat,
      cropZones: zones,
      borewells: bws,
      valves: valvs,
      cctvCameras: cctvs,
      sensors: sens,
      powerUnits: power,
      linearFeatures: lines,
    }
  }, [effectiveGeoJson])

  const counts = useMemo(
    () => ({
      zonesCount: cropZones.length,
      borewellsCount: borewells.length,
      valvesCount: valves.length,
      cctvCount: cctvCameras.length,
      sensorsCount: sensors.length,
      powerCount: powerUnits.length,
      linesCount: linearFeatures.length,
    }),
    [cropZones, borewells, valves, cctvCameras, sensors, powerUnits, linearFeatures]
  )

  // Calculate dynamic fit padding based on viewport and overlays
  const getFitPadding = useCallback(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    if (isMobile) {
      return { top: 90, right: 20, bottom: 80, left: 20 }
    }
    // Desktop: Toolbar at top (80px), Legend on right (260px), CropHUD bottom-left (320px)
    return { top: 80, right: 260, bottom: 80, left: 320 }
  }, [])

  // Dismiss farmer hint
  const handleDismissFarmerHint = () => {
    setShowFarmerHint(false)
    try {
      localStorage.setItem('agrimap.farmerHintDismissed.v1', 'true')
    } catch (e) {}
  }

  // Toggle single layer
  const handleToggleLayer = (key) => {
    setActiveLayers((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem('agrimap.layerPrefs.v1', JSON.stringify(next))
      } catch (e) {}
      return next
    })
  }

  // Set all layers
  const handleSetAllLayers = (enable) => {
    const next = {
      boundary: enable,
      zones: enable,
      borewells: enable,
      valves: enable,
      cctv: enable,
      sensors: enable,
      power: enable,
      lines: enable,
    }
    setActiveLayers(next)
    try {
      localStorage.setItem('agrimap.layerPrefs.v1', JSON.stringify(next))
    } catch (e) {}
  }

  // Fit map bounds to specific legend features and pulse them
  const handleFitToSymbols = useCallback(
    (itemId, features) => {
      if (!features || features.length === 0) return

      // Ensure relevant layer is turned ON if currently off
      const layerMapping = {
        boundary: 'boundary',
        crop_zone: 'zones',
        solar_borewell: 'borewells',
        aux_borewell: 'borewells',
        control_valve: 'valves',
        power_feeder: 'power',
        cctv_camera: 'cctv',
        soilsense_probe: 'sensors',
        main_conduit: 'lines',
        sub_lateral: 'lines',
        farm_track: 'lines',
      }
      const targetLayer = layerMapping[itemId]
      if (targetLayer && !activeLayers[targetLayer]) {
        setActiveLayers((prev) => {
          const next = { ...prev, [targetLayer]: true }
          try {
            localStorage.setItem('agrimap.layerPrefs.v1', JSON.stringify(next))
          } catch (e) {}
          return next
        })
      }

      // Google Maps fit
      if (mapInstanceRef.current && googleRef.current) {
        const bounds = new googleRef.current.maps.LatLngBounds()
        let count = 0

        features.forEach((feat) => {
          if (!feat.geometry) return
          if (feat.geometry.type === 'Point' && Array.isArray(feat.geometry.coordinates)) {
            bounds.extend({ lat: feat.geometry.coordinates[1], lng: feat.geometry.coordinates[0] })
            count++
          } else if (feat.geometry.type === 'LineString' && Array.isArray(feat.geometry.coordinates)) {
            feat.geometry.coordinates.forEach((c) => {
              bounds.extend({ lat: c[1], lng: c[0] })
              count++
            })
          } else if (feat.geometry.type === 'Polygon' && Array.isArray(feat.geometry.coordinates)) {
            const ring = feat.geometry.coordinates[0] || []
            ring.forEach((c) => {
              bounds.extend({ lat: c[1], lng: c[0] })
              count++
            })
          }
        })

        if (count > 0 && !bounds.isEmpty()) {
          mapInstanceRef.current.fitBounds(bounds, getFitPadding())
          if (features.length === 1 && features[0].geometry.type === 'Point') {
            googleRef.current.maps.event.addListenerOnce(mapInstanceRef.current, 'idle', () => {
              if (mapInstanceRef.current && mapInstanceRef.current.getZoom() > 18) {
                mapInstanceRef.current.setZoom(18)
              }
            })
          }
        }
      }
    },
    [activeLayers, getFitPadding]
  )

  // Change Map Style
  const handleChangeMapStyle = (newStyle) => {
    setMapStyle(newStyle)
    try {
      localStorage.setItem('agrimap.mapStylePref.v1', newStyle)
    } catch (e) {}

    const map = mapInstanceRef.current
    if (!map) return

    if (newStyle === 'clean') {
      map.setMapTypeId('roadmap')
      map.setOptions({ styles: CLEAN_MAP_STYLE })
    } else if (newStyle === 'roadmap') {
      map.setMapTypeId('roadmap')
      map.setOptions({ styles: DARK_MAP_STYLE })
    } else if (newStyle === 'terrain') {
      map.setMapTypeId('terrain')
      map.setOptions({ styles: [] })
    } else {
      // Default Satellite: pure satellite without labels unless showLabels is active
      map.setMapTypeId(showLabels ? 'hybrid' : 'satellite')
      map.setOptions({ styles: [] })
    }
  }

  // Toggle labels overlay
  const handleToggleLabels = () => {
    const next = !showLabels
    setShowLabels(next)
    const map = mapInstanceRef.current
    if (map && mapStyle === 'satellite') {
      map.setMapTypeId(next ? 'hybrid' : 'satellite')
    }
  }

  // Compute farm center & bounds
  const getFarmCenterAndBounds = useCallback(() => {
    if (!fieldFeature?.geometry) {
      return { center: { lat: 10.6585, lng: 77.0125 }, bounds: null }
    }
    const paths = geoJsonToGooglePaths(fieldFeature.geometry)
    if (paths.length === 0 || paths[0].length === 0) {
      return { center: { lat: 10.6585, lng: 77.0125 }, bounds: null }
    }

    if (!googleRef.current?.maps?.LatLngBounds) {
      return { center: { lat: 10.6585, lng: 77.0125 }, bounds: null }
    }

    const bounds = new googleRef.current.maps.LatLngBounds()
    paths[0].forEach((pt) => bounds.extend(pt))
    const center = {
      lat: bounds.getCenter().lat(),
      lng: bounds.getCenter().lng(),
    }
    return { center, bounds }
  }, [fieldFeature])

  // Recenter map
  const handleRecenter = useCallback(() => {
    const map = mapInstanceRef.current
    if (!map || !googleRef.current) return
    const { center, bounds } = getFarmCenterAndBounds()
    if (bounds) {
      map.fitBounds(bounds, getFitPadding())
    } else {
      map.panTo(center)
      map.setZoom(16)
    }
  }, [getFarmCenterAndBounds, getFitPadding])

  // Admin farm center reticle and user location marker refs
  const farmCenterMarkerRef = useRef(null)
  const userLocationMarkerRef = useRef(null)
  const userLocationCircleRef = useRef(null)

  // Listen for external recenter events
  useEffect(() => {
    const handleRecenterEvent = () => handleRecenter()
    window.addEventListener('agrimap:recenter-farm', handleRecenterEvent)
    return () => window.removeEventListener('agrimap:recenter-farm', handleRecenterEvent)
  }, [handleRecenter])

  // Listen for admin exact location events (farm center marker & my location)
  useEffect(() => {
    const handleToggleCenterMarker = (e) => {
      const { show, center } = e.detail || {}
      const map = mapInstanceRef.current
      const google = googleRef.current
      if (!map || !google || !google.maps) return

      if (farmCenterMarkerRef.current) {
        farmCenterMarkerRef.current.setMap(null)
        farmCenterMarkerRef.current = null
      }

      if (show && center) {
        const svg = `
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="#8A57C0" fill-opacity="0.9" stroke="#FFFFFF" stroke-width="2.5" />
            <circle cx="18" cy="18" r="5" fill="#FFFFFF" />
            <line x1="18" y1="2" x2="18" y2="10" stroke="#FFFFFF" stroke-width="2" />
            <line x1="18" y1="26" x2="18" y2="34" stroke="#FFFFFF" stroke-width="2" />
            <line x1="2" y1="18" x2="10" y2="18" stroke="#FFFFFF" stroke-width="2" />
            <line x1="26" y1="18" x2="34" y2="18" stroke="#FFFFFF" stroke-width="2" />
          </svg>
        `
        const iconUrl = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg)
        farmCenterMarkerRef.current = new google.maps.Marker({
          position: { lat: center.lat, lng: center.lng },
          map,
          title: 'Farm Center Reticle',
          zIndex: 500,
          icon: {
            url: iconUrl,
            scaledSize: new google.maps.Size(36, 36),
            anchor: new google.maps.Point(18, 18),
          },
        })
      }
    }

    const handleShowUserLocation = (e) => {
      const { lat, lng, accuracy } = e.detail || {}
      const map = mapInstanceRef.current
      const google = googleRef.current
      if (!map || !google || !google.maps) return

      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.setMap(null)
        userLocationMarkerRef.current = null
      }
      if (userLocationCircleRef.current) {
        userLocationCircleRef.current.setMap(null)
        userLocationCircleRef.current = null
      }

      if (lat && lng) {
        map.panTo({ lat, lng })
        userLocationMarkerRef.current = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: 'Your Location (Admin)',
          zIndex: 510,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#2563EB',
            fillOpacity: 1.0,
            strokeColor: '#FFFFFF',
            strokeWeight: 2.5,
          },
        })

        userLocationCircleRef.current = new google.maps.Circle({
          strokeColor: '#3B82F6',
          strokeOpacity: 0.6,
          strokeWeight: 1.5,
          fillColor: '#3B82F6',
          fillOpacity: 0.15,
          map,
          center: { lat, lng },
          radius: accuracy || 25,
          zIndex: 505,
        })
      }
    }

    const handleClearUserLocation = () => {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.setMap(null)
        userLocationMarkerRef.current = null
      }
      if (userLocationCircleRef.current) {
        userLocationCircleRef.current.setMap(null)
        userLocationCircleRef.current = null
      }
    }

    window.addEventListener('agrimap:toggle-farm-center-marker', handleToggleCenterMarker)
    window.addEventListener('agrimap:show-user-location', handleShowUserLocation)
    window.addEventListener('agrimap:clear-user-location', handleClearUserLocation)

    return () => {
      window.removeEventListener('agrimap:toggle-farm-center-marker', handleToggleCenterMarker)
      window.removeEventListener('agrimap:show-user-location', handleShowUserLocation)
      window.removeEventListener('agrimap:clear-user-location', handleClearUserLocation)
      if (farmCenterMarkerRef.current) farmCenterMarkerRef.current.setMap(null)
      if (userLocationMarkerRef.current) userLocationMarkerRef.current.setMap(null)
      if (userLocationCircleRef.current) userLocationCircleRef.current.setMap(null)
    }
  }, [])

  // Refit on window resize
  useEffect(() => {
    let resizeTimer
    const handleResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (mapInstanceRef.current && googleRef.current) {
          const { bounds } = getFarmCenterAndBounds()
          if (bounds) {
            mapInstanceRef.current.fitBounds(bounds, getFitPadding())
          }
        }
      }, 200)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', handleResize)
    }
  }, [getFarmCenterAndBounds, getFitPadding])

  // Zoom handlers
  const handleZoomIn = () => mapInstanceRef.current && mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() + 1)
  const handleZoomOut = () => mapInstanceRef.current && mapInstanceRef.current.setZoom(mapInstanceRef.current.getZoom() - 1)

  // Fullscreen handler
  const handleToggleFullscreen = () => {
    const elem = mapContainerRef.current?.parentElement || mapContainerRef.current
    if (!document.fullscreenElement) {
      elem?.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {})
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {})
    }
  }

  // Network online/offline listener
  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Initialize Map with 8s Timeout & Error Proofing
  useEffect(() => {
    let isCancelled = false

    // Treat no tiles loaded within 8 seconds as failure -> auto-switch to Leaflet backup
    const tileTimeout = setTimeout(() => {
      if (!isCancelled && !isTilesLoaded) {
        console.warn('[AgriMap] Google Maps tile load timeout (8s) reached. Switching to satellite backup.')
        setUseBackupMap(true)
        setBackupReason('Google Maps tile load timeout (8s)')
        setIsLoaded(true)
      }
    }, 8000)

    loadGoogleMaps()
      .then((google) => {
        if (isCancelled || !mapContainerRef.current) return
        googleRef.current = google

        const { mapId } = getGoogleMapsConfig()
        const { center, bounds } = getFarmCenterAndBounds()

        const map = new google.maps.Map(mapContainerRef.current, {
          center,
          zoom: 16,
          // Pure satellite by default (no POI/street text)
          mapTypeId: mapStyle === 'clean' ? 'roadmap' : mapStyle === 'roadmap' ? 'roadmap' : mapStyle === 'terrain' ? 'terrain' : (showLabels ? 'hybrid' : 'satellite'),
          mapId: mapId || (import.meta.env.DEV ? 'DEMO_MAP_ID' : undefined),
          disableDefaultUI: true,
          gestureHandling: 'greedy',
          styles: mapStyle === 'clean' ? CLEAN_MAP_STYLE : mapStyle === 'roadmap' ? DARK_MAP_STYLE : [],
          maxZoom: 20,
        })

        mapInstanceRef.current = map

        map.addListener('zoom_changed', () => {
          setCurrentZoom(map.getZoom())
        })

        // On tilesloaded, confirm Google success and reveal map
        google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
          clearTimeout(tileTimeout)
          if (!isCancelled) {
            setIsTilesLoaded(true)
            setIsLoaded(true)
          }
        })

        if (bounds) {
          map.fitBounds(bounds, getFitPadding())
        }
      })
      .catch((err) => {
        clearTimeout(tileTimeout)
        if (isCancelled) return
        setUseBackupMap(true)
        setBackupReason(err.message || 'BillingNotEnabledMapError')
        setIsLoaded(true)
      })

    const handleAuthFailure = (e) => {
      clearTimeout(tileTimeout)
      const code = e?.detail?.errorCode || 'BillingNotEnabledMapError'
      setUseBackupMap(true)
      setBackupReason(`Google Maps: ${code}`)
      setIsLoaded(true)
    }
    window.addEventListener('agrimap:google-maps-auth-failure', handleAuthFailure)

    return () => {
      isCancelled = true
      clearTimeout(tileTimeout)
      window.removeEventListener('agrimap:google-maps-auth-failure', handleAuthFailure)
    }
  }, [])

  // Clear existing map overlays
  const clearOverlays = useCallback(() => {
    overlaysRef.current.polygons.forEach((p) => p.setMap(null))
    overlaysRef.current.polylines.forEach((p) => p.setMap(null))
    overlaysRef.current.markers.forEach((m) => {
      if (typeof m.setMap === 'function') m.setMap(null)
      else if (m.map) m.map = null
    })
    overlaysRef.current.labels.forEach((l) => l.setMap && l.setMap(null))
    overlaysRef.current.ghosts.forEach((g) => g.setMap && g.setMap(null))

    overlaysRef.current = {
      polygons: [],
      polylines: [],
      markers: [],
      labels: [],
      ghosts: [],
    }
  }, [])

  // Render Overlays: Boundary, Zones, Devices, Lines, Ghost Geometry
  useEffect(() => {
    const map = mapInstanceRef.current
    const google = googleRef.current
    if (!map || !google || !isLoaded || isEditMode || useBackupMap) return

    clearOverlays()

    // 1. Boundary: Bold dashed violet (#8A57C0), ~4px, drawn above the zones
    if (activeLayers.boundary && fieldFeature?.geometry) {
      const paths = geoJsonToGooglePaths(fieldFeature.geometry)
      paths.forEach((path) => {
        // Base polygon with low fill for click detection & slight tint
        const poly = new google.maps.Polygon({
          paths: path,
          strokeOpacity: 0,
          strokeWeight: 0,
          fillColor: '#8A57C0',
          fillOpacity: 0.05,
          map,
          zIndex: 20,
        })

        // Bold dashed perimeter polyline (closed loop)
        const lineSymbol = {
          path: 'M 0,-1 0,1',
          strokeOpacity: 1,
          strokeColor: '#8A57C0',
          scale: 4,
        }
        const dashedBorder = new google.maps.Polyline({
          path: [...path, path[0]],
          strokeOpacity: 0,
          icons: [
            {
              icon: lineSymbol,
              offset: '0',
              repeat: '16px',
            },
          ],
          map,
          zIndex: 22,
        })

        // Click on boundary opens cadastral field diagnostics
        const openFieldDiag = () => {
          setDiagnosticModal({
            isOpen: true,
            type: 'field',
            data: {
              ...fieldFeature.properties,
              name: effectiveFarm.full_name ? `${effectiveFarm.full_name}'s Farmland Twin` : "Ganesh V.'s Smart Farmland Twin",
              total_acres: effectiveFarm.total_acres || 21.4,
              total_hectares: effectiveFarm.total_hectares || 8.66,
              khata_number: effectiveFarm.khata_number || 'TN-POL-4820',
              village: effectiveFarm.village || 'Pollachi Rural',
              district: effectiveFarm.district || 'Coimbatore',
            },
          })
        }

        poly.addListener('click', openFieldDiag)
        dashedBorder.addListener('click', openFieldDiag)

        overlaysRef.current.polygons.push(poly)
        overlaysRef.current.polylines.push(dashedBorder)
      })
    }

    // 2. Crop Zones: stored colour, fill opacity ~0.35, solid 2.5px outline at full opacity
    if (activeLayers.zones && cropZones.length > 0) {
      cropZones.forEach((zone, idx) => {
        const paths = geoJsonToGooglePaths(zone.geometry)
        const fillCol = zone.properties?.shade_color || zone.properties?.fill_color || (idx === 0 ? '#10B981' : idx === 1 ? '#F59E0B' : '#8B5CF6')
        const strokeCol = zone.properties?.stroke_color || fillCol

        paths.forEach((path) => {
          const poly = new google.maps.Polygon({
            paths: path,
            strokeColor: strokeCol,
            strokeOpacity: 1.0,
            strokeWeight: 2.5,
            fillColor: fillCol,
            fillOpacity: 0.35,
            map,
            zIndex: 15,
          })

          // Click on Crop Zone opens Zone Diagnostics
          poly.addListener('click', () => {
            setDiagnosticModal({
              isOpen: true,
              type: 'zone',
              data: {
                ...zone.properties,
                crop: zone.properties?.crop || zone.properties?.name,
                area_hectares: zone.properties?.area_hectares || zone.properties?.calculated_area_hectares || (idx === 0 ? 3.85 : idx === 1 ? 2.55 : 2.26),
                shade_color: fillCol,
              },
            })
          })

          overlaysRef.current.polygons.push(poly)

          // Small label chip: ONLY shown if "Labels" chip is ON and zoom is 18 or more (NO text by default)
          if (showLabels && currentZoom >= 18 && path.length > 0) {
            const bounds = new google.maps.LatLngBounds()
            path.forEach((pt) => bounds.extend(pt))
            const center = bounds.getCenter()
            const haText = zone.properties?.area_hectares || (idx === 0 ? 3.85 : idx === 1 ? 2.55 : 2.26)

            const labelMarker = new google.maps.Marker({
              position: center,
              map,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 0,
              },
              label: {
                text: `${zone.properties?.crop || zone.properties?.name || 'Crop Zone'} (${haText} Ha)`,
                color: '#FFFFFF',
                fontSize: '11px',
                fontWeight: '600',
                className: 'agrimap-zone-chip-label',
              },
              zIndex: 16,
            })
            overlaysRef.current.labels.push(labelMarker)
          }
        })
      })
    }

    // 3. Conduits & Infrastructure Lines: Main conduit 6px #1E90D6, sub-lateral 3.5px #38BDF8, access track 7px #F59E0B
    if (activeLayers.lines && linearFeatures.length > 0) {
      linearFeatures.forEach((line) => {
        const path = lineGeoJsonToGooglePath(line.geometry)
        const { item } = classifyFeature(line)
        const isPipeline = item.id === LEGEND_ITEMS.MAIN_CONDUIT.id || item.id === LEGEND_ITEMS.SUB_LATERAL.id
        const isTrack = item.id === LEGEND_ITEMS.FARM_TRACK.id

        const color = line.properties?.color || item.color || (isPipeline ? '#1E90D6' : '#F59E0B')
        const weight = line.properties?.weight || item.weight || (isPipeline ? 6 : 7)

        // Visual Polyline
        const polyline = new google.maps.Polyline({
          path,
          strokeColor: color,
          strokeOpacity: 1.0,
          strokeWeight: weight,
          map,
          zIndex: item.zIndex || 22,
        })

        // Invisible 20px Hit Area Polyline (so thin lines easily receive clicks)
        const hitArea = new google.maps.Polyline({
          path,
          strokeColor: '#FFFFFF',
          strokeOpacity: 0.001,
          strokeWeight: 20,
          map,
          zIndex: 26,
        })

        const handleLineClick = () => {
          setDiagnosticModal({
            isOpen: true,
            type: isTrack ? 'track' : 'pipeline',
            data: {
              ...line.properties,
              name: line.properties?.name || item.label,
              lineCategory: isTrack ? 'track' : isPipeline ? 'conduit' : 'other',
              length_meters: line.properties?.length_meters || 180,
              working_pressure_bar: line.properties?.working_pressure_bar || (isPipeline ? 2.4 : null),
              diameter_mm: line.properties?.diameter_mm || (item.id === LEGEND_ITEMS.MAIN_CONDUIT.id ? 90 : 50),
            },
          })
        }

        polyline.addListener('click', handleLineClick)
        hitArea.addListener('click', handleLineClick)

        overlaysRef.current.polylines.push(polyline)
        overlaysRef.current.polylines.push(hitArea)
      })
    }

    // 4. Device & Asset Markers: Large circular badges 40px, solid type color, white icon & ring, soft shadow
    const deviceItems = []
    if (activeLayers.power) powerUnits.forEach((f) => deviceItems.push(f))
    if (activeLayers.cctv) cctvCameras.forEach((f) => deviceItems.push(f))
    if (activeLayers.sensors) sensors.forEach((f) => deviceItems.push(f))
    if (activeLayers.valves) valves.forEach((f) => deviceItems.push(f))
    if (activeLayers.borewells) borewells.forEach((f) => deviceItems.push(f))

    const mappedDevices = deviceItems
      .map((feat) => {
        const pos = pointGeoJsonToGoogleLatLng(feat.geometry)
        if (!pos) return null
        return { feature: feat, position: pos }
      })
      .filter(Boolean)

    // Apply render-time nudging so no markers overlap
    const nudgedDevices = nudgeOverlappingPositions(mappedDevices, currentZoom)

    nudgedDevices.forEach(({ feature, position }) => {
      const handleMarkerClick = (feat) => {
        const style = getDeviceStyle(feat)
        setDiagnosticModal({
          isOpen: true,
          type: style.type,
          data: feat.properties || {},
        })
      }

      const style = getDeviceStyle(feature)

      if (google.maps.marker && google.maps.marker.AdvancedMarkerElement) {
        const { container } = createAdvancedMarkerElement({
          feature,
          onClick: handleMarkerClick,
          zoom: currentZoom,
        })

        const advancedMarker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position,
          content: container,
          title: style.label,
          zIndex: style.zIndex,
          gmpClickable: true,
        })
        overlaysRef.current.markers.push(advancedMarker)
      } else {
        const marker = new google.maps.Marker({
          position,
          map,
          icon: createPinMarkerIcon(google, style, currentZoom),
          title: style.label,
          zIndex: style.zIndex,
        })
        marker.addListener('click', () => handleMarkerClick(feature))
        overlaysRef.current.markers.push(marker)
      }
    })

    // 5. Ghost Geometry (e.g. from change request review)
    if (ghostGeometry) {
      if (ghostGeometry.type === 'Point' && ghostGeometry.coordinates) {
        const pos = { lat: ghostGeometry.coordinates[1], lng: ghostGeometry.coordinates[0] }
        const ghostMarker = new google.maps.Marker({
          position: pos,
          map,
          title: 'Proposed Location (Pending Approval)',
          zIndex: 300,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#8A57C0',
            fillOpacity: 0.85,
            strokeColor: '#FFFFFF',
            strokeWeight: 2.5,
          },
        })
        overlaysRef.current.ghosts.push(ghostMarker)
      } else if (ghostGeometry.type === 'LineString' && ghostGeometry.coordinates) {
        const path = ghostGeometry.coordinates.map((c) => ({ lat: c[1], lng: c[0] }))
        const ghostLine = new google.maps.Polyline({
          path,
          strokeColor: '#8A57C0',
          strokeOpacity: 0.9,
          strokeWeight: 4,
          map,
          zIndex: 300,
        })
        overlaysRef.current.ghosts.push(ghostLine)
      }
    }
  }, [
    isLoaded,
    isEditMode,
    useBackupMap,
    activeLayers,
    currentZoom,
    showLabels,
    fieldFeature,
    cropZones,
    borewells,
    valves,
    cctvCameras,
    sensors,
    powerUnits,
    linearFeatures,
    ghostGeometry,
    clearOverlays,
  ])

  // Save revision handler from Drawing Studio
  const handleSaveRevision = (newPoints, auditEntry) => {
    setIsEditMode(false)
    if (typeof onSaveGeoJson === 'function') {
      const updatedPaths = [newPoints]
      const updatedBoundaryGeoJson = googlePathsToGeoJson(updatedPaths, true)

      const updatedGeo = JSON.parse(JSON.stringify(effectiveGeoJson))
      const fIdx = updatedGeo.features.findIndex((f) => f.properties?.entity_type === 'field')
      if (fIdx !== -1) {
        updatedGeo.features[fIdx].geometry = updatedBoundaryGeoJson
      }
      onSaveGeoJson(updatedGeo, auditEntry)
    }
  }

  // Pre-fill change request from device modal "Report an issue" button
  const handleReportIssueFromDevice = (deviceData, deviceType) => {
    if (typeof onRequestChange === 'function') {
      onRequestChange({
        type: 'report_device_problem',
        targetType: 'device',
        targetId: deviceData.id || null,
        targetName: deviceData.name || deviceData.device_name || `${deviceType} device`,
      })
    }
  }

  // Initial vertex points for Drawing Studio
  const boundaryInitialPoints = useMemo(() => {
    if (!fieldFeature?.geometry) return []
    const paths = geoJsonToGooglePaths(fieldFeature.geometry)
    return paths.length > 0 ? paths[0] : []
  }, [fieldFeature])

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden bg-[#131313] border border-[#B890F9]/20 shadow-2xl ${className}`}
      style={{ height }}
    >
      {/* ── Active Map Engine: Backup Map (Leaflet) OR Google Maps Canvas ── */}
      {useBackupMap ? (
        <LeafletBackupMap
          effectiveFarm={effectiveFarm}
          effectiveGeoJson={effectiveGeoJson}
          activeLayers={activeLayers}
          mapStyle={mapStyle}
          showLabels={showLabels}
          fieldFeature={fieldFeature}
          cropZones={cropZones}
          borewells={borewells}
          valves={valves}
          cctvCameras={cctvCameras}
          sensors={sensors}
          powerUnits={powerUnits}
          linearFeatures={linearFeatures}
          ghostGeometry={ghostGeometry}
          fitPadding={getFitPadding()}
          onSelectFeature={(type, data) => setDiagnosticModal({ isOpen: true, type, data })}
        />
      ) : (
        <div
          ref={mapContainerRef}
          className={`w-full h-full transition-opacity duration-300 ${
            isTilesLoaded ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />
      )}

      {/* ── Offline Fallback State (if neither map can load) ── */}
      {isOffline && (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-[#131313]/90 backdrop-blur-md">
          <div className="max-w-sm w-full p-5 rounded-2xl bg-[#1B1233] border border-[#8A57C0]/40 text-center shadow-2xl space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/50 flex items-center justify-center text-purple-300 mx-auto">
              <WifiOff size={24} />
            </div>
            <h3 className="text-sm font-bold text-white">Network Connection Offline</h3>
            <p className="text-xs text-[#C9BDE6] leading-relaxed">
              Unable to reach map tile servers. Your farm records, crop zones, and pending change requests remain saved and ready.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsOffline(typeof navigator !== 'undefined' && !navigator.onLine)
                if (typeof window !== 'undefined') window.location.reload()
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8A57C0] hover:bg-[#A879E0] text-white font-bold text-xs transition-colors cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Retry Connection</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Calm Skeleton Loader State (shown while Google Maps is initializing) ── */}
      {!isLoaded && !useBackupMap && !isOffline && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#131313]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-[#8A57C0] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-[#C9BDE6] font-medium tracking-wide">
              Initializing Satellite Cadastral Digital Twin...
            </span>
          </div>
        </div>
      )}

      {/* ── Toolbar & Segmented Layer Controls ── */}
      {(isLoaded || useBackupMap) && (
        <>
          <MapToolbar
            role={role}
            activeLayers={activeLayers}
            onToggleLayer={handleToggleLayer}
            onSetAllLayers={handleSetAllLayers}
            counts={counts}
            mapStyle={mapStyle}
            onChangeMapStyle={handleChangeMapStyle}
            showLabels={showLabels}
            onToggleLabels={handleToggleLabels}
            isBackupMap={useBackupMap}
            backupReason={backupReason}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onRecenter={handleRecenter}
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            onRequestChange={() => onRequestChange && onRequestChange()}
            isEditMode={isEditMode}
            onToggleEditMode={() => setIsEditMode(!isEditMode)}
            canEdit={canEdit}
          />

          {/* Admin Precision Coordinate Studio (Admin / Surveyor / Verifier only) */}
          {canNavigate && !isEditMode && !useBackupMap && (
            <div className="absolute bottom-4 left-3 z-20">
              <AdminCoordinateStudio
                map={mapInstanceRef.current}
                google={googleRef.current}
                farm={effectiveFarm}
                farmBoundaryCoords={boundaryInitialPoints.map((p) => [p.lat, p.lng])}
                devices={[
                  ...powerUnits,
                  ...cctvCameras,
                  ...sensors,
                  ...valves,
                  ...borewells,
                ]}
                onAddDraftPoint={(draft) => {
                  if (mapInstanceRef.current && googleRef.current) {
                    const ghost = new googleRef.current.maps.Marker({
                      position: { lat: draft.lat, lng: draft.lng },
                      map: mapInstanceRef.current,
                      title: `Draft: ${draft.name}`,
                      icon: {
                        path: googleRef.current.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: '#8A57C0',
                        fillOpacity: 0.85,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 2.5,
                      },
                      zIndex: 350,
                    })
                    overlaysRef.current.ghosts.push(ghost)
                  }
                }}
              />
            </div>
          )}

          {/* Drawing Studio (Active when in Edit Mode on Google Maps) */}
          {canEdit && isEditMode && !useBackupMap && (
            <MapDrawingStudio
              map={mapInstanceRef.current}
              google={googleRef.current}
              isActive={isEditMode}
              initialPoints={boundaryInitialPoints}
              onSave={handleSaveRevision}
              onCancel={() => setIsEditMode(false)}
              farmId={effectiveFarm.field_id || 'field-1'}
              farmerName={effectiveFarm.full_name || 'Ganesh V.'}
              user={user}
            />
          )}

          {/* Dynamic Map Legend with Real Zone Colors & Live Inventory */}
          <MapLegend
            geojson={effectiveGeoJson}
            role={role}
            activeLayers={activeLayers}
            onToggleLayer={handleToggleLayer}
            onFitToSymbols={handleFitToSymbols}
            onDrawInEditor={() => {
              if (canEdit) setIsEditMode(true)
            }}
            zones={cropZones.map((z, idx) => ({
              id: z.properties?.id,
              crop: z.properties?.crop || z.properties?.name,
              hectares: z.properties?.area_hectares || z.properties?.calculated_area_hectares || (idx === 0 ? 3.85 : idx === 1 ? 2.55 : 2.26),
              fill_color: z.properties?.shade_color || z.properties?.fill_color || (idx === 0 ? '#10B981' : idx === 1 ? '#F59E0B' : '#8B5CF6'),
              stroke_color: z.properties?.stroke_color || z.properties?.shade_color,
            }))}
            hasBorewells={borewells.length > 0}
            hasValves={valves.length > 0}
            hasCctv={cctvCameras.length > 0}
            hasSensors={sensors.length > 0}
            hasPower={powerUnits.length > 0}
            hasLines={linearFeatures.length > 0}
          />

          {/* Crop & Plot Distribution Panel (Farmer view / non-admin navigation) */}
          {role === 'farmer' && (
            <CropDistributionPanel
              zones={cropZones.map((z, idx) => ({
                id: z.properties?.id,
                name: z.properties?.crop || z.properties?.name,
                hectares: z.properties?.area_hectares || z.properties?.calculated_area_hectares || (idx === 0 ? 3.85 : idx === 1 ? 2.55 : 2.26),
                color: z.properties?.shade_color || z.properties?.fill_color || (idx === 0 ? '#10B981' : idx === 1 ? '#F59E0B' : '#8B5CF6'),
              }))}
              totalHectares={effectiveFarm.total_hectares || 8.66}
              totalAcres={effectiveFarm.total_acres || 21.4}
            />
          )}

          {/* Farmer First-Visit Dismissible Hint */}
          {showFarmerHint && (
            <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-30 pointer-events-auto max-w-md w-full px-4">
              <div className="bg-[#131313]/95 backdrop-blur-md border border-[#B890F9]/50 rounded-2xl p-3.5 shadow-2xl flex items-center justify-between gap-3 text-xs text-[#F4F3F9]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#8A57C0]/30 border border-[#8A57C0]/60 flex items-center justify-center text-[#B890F9] shrink-0">
                    <Info size={16} />
                  </div>
                  <div>
                    <span className="font-semibold text-white block">This map is view-only.</span>
                    <span className="text-[#C9BDE6] text-[11px]">
                      To add or change anything, send a request to your admin.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      handleDismissFarmerHint()
                      onRequestChange && onRequestChange()
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#8A57C0] hover:bg-[#B890F9] text-white text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    Request
                  </button>
                  <button
                    type="button"
                    onClick={handleDismissFarmerHint}
                    className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title="Dismiss hint"
                    aria-label="Dismiss hint"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Floating Action Button (FAB) for Farmer "Request a change" */}
          {role === 'farmer' && (
            <div className="md:hidden absolute bottom-6 right-4 z-30 pointer-events-auto">
              <button
                type="button"
                onClick={() => onRequestChange && onRequestChange()}
                className="w-12 h-12 rounded-full bg-gradient-to-r from-[#8A57C0] to-[#3C1775] text-white flex items-center justify-center shadow-2xl shadow-[#8A57C0]/50 border border-white/20 active:scale-95 transition-all cursor-pointer"
                title="Request a change"
                aria-label="Request a change"
              >
                <Sparkles size={20} className="text-[#F4F3F9]" />
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Unified Diagnostics Modal for Device / Feature Click ── */}
      <DiagnosticsModal
        isOpen={diagnosticModal.isOpen}
        type={diagnosticModal.type}
        data={diagnosticModal.data}
        onClose={() => setDiagnosticModal({ isOpen: false, type: 'borewell', data: null })}
        onReportIssue={handleReportIssueFromDevice}
      />
    </div>
  )
}
