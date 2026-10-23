/**
 * LeafletBackupMap.jsx — Automatic Zero-Key Fallback Map
 *
 * Implements an identical satellite view using Leaflet and Esri World Imagery basemap.
 * Displays identical farm boundaries, crop zones, infrastructure lines, and
 * circular badge markers with full detail cards and diagnostics modal interactions.
 * Fully responsive, keyboard accessible, with Esri legal attribution.
 */
import React, { useEffect, useRef, useMemo, useState } from 'react'
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  Marker,
  Circle,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { V2V_COLORS } from './mapStyles.js'
import {
  getDeviceStyle,
  nudgeOverlappingPositions,
} from './mapMarkers.js'
import { classifyFeature, LEGEND_ITEMS } from './legendTypes.js'
import { extractBoundaryLatLngs } from '../../lib/geoUtils.js'

// Helper component to auto-fit farm bounds with UI padding
function AutoFitBounds({ bounds, padding }) {
  const map = useMap()

  const fit = () => {
    if (!map || !bounds || bounds.length === 0) return
    try {
      map.invalidateSize()
      map.fitBounds(bounds, {
        paddingTopLeft: [padding.left || 20, padding.top || 80],
        paddingBottomRight: [padding.right || 20, padding.bottom || 90],
        maxZoom: 20,
      })
    } catch (e) {}
  }

  useEffect(() => {
    fit()
    const timer = setTimeout(fit, 100)
    return () => clearTimeout(timer)
  }, [map, bounds, padding])

  useEffect(() => {
    const handleRecenter = () => fit()
    const handleResize = () => {
      if (map) {
        map.invalidateSize()
        fit()
      }
    }
    window.addEventListener('agrimap:recenter-farm', handleRecenter)
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('agrimap:recenter-farm', handleRecenter)
      window.removeEventListener('resize', handleResize)
    }
  }, [map, bounds, padding])

  return null
}

// Convert GeoJSON coordinates [lng, lat] to Leaflet [lat, lng]
function geoJsonCoordsToLeaflet(coords) {
  if (!coords) return []
  if (typeof coords[0] === 'number') {
    return [coords[1], coords[0]]
  }
  return coords.map((c) => geoJsonCoordsToLeaflet(c))
}

export default function LeafletBackupMap({
  effectiveFarm,
  effectiveGeoJson,
  activeLayers,
  mapStyle = 'satellite',
  showLabels = false,
  fieldFeature,
  cropZones = [],
  borewells = [],
  valves = [],
  cctvCameras = [],
  sensors = [],
  powerUnits = [],
  linearFeatures = [],
  ghostGeometry = null,
  onSelectFeature,
  fitPadding = { top: 80, right: 280, bottom: 90, left: 340 },
}) {
  // Admin Farm Center Target Marker & Geolocation State
  const [farmCenterMarker, setFarmCenterMarker] = useState(null)
  const [userLocation, setUserLocation] = useState(null)

  useEffect(() => {
    const handleToggleCenterMarker = (e) => {
      const { show, center } = e.detail || {}
      if (show && center) {
        setFarmCenterMarker(center)
      } else {
        setFarmCenterMarker(null)
      }
    }

    const handleShowUserLocation = (e) => {
      const { lat, lng, accuracy } = e.detail || {}
      if (lat && lng) {
        setUserLocation({ lat, lng, accuracy: accuracy || 25 })
      }
    }

    const handleClearUserLocation = () => {
      setUserLocation(null)
    }

    window.addEventListener('agrimap:toggle-farm-center-marker', handleToggleCenterMarker)
    window.addEventListener('agrimap:show-user-location', handleShowUserLocation)
    window.addEventListener('agrimap:clear-user-location', handleClearUserLocation)

    return () => {
      window.removeEventListener('agrimap:toggle-farm-center-marker', handleToggleCenterMarker)
      window.removeEventListener('agrimap:show-user-location', handleShowUserLocation)
      window.removeEventListener('agrimap:clear-user-location', handleClearUserLocation)
    }
  }, [])

  // Convert boundary to Leaflet LatLngs
  const boundaryLatLngs = useMemo(() => {
    if (!fieldFeature?.geometry) return []
    return extractBoundaryLatLngs(fieldFeature.geometry)
  }, [fieldFeature])

  // Center coordinate
  const center = useMemo(() => {
    if (boundaryLatLngs.length > 0) {
      const avgLat = boundaryLatLngs.reduce((acc, p) => acc + p[0], 0) / boundaryLatLngs.length
      const avgLng = boundaryLatLngs.reduce((acc, p) => acc + p[1], 0) / boundaryLatLngs.length
      return [avgLat, avgLng]
    }
    return [10.6585, 77.0125]
  }, [boundaryLatLngs])

  // Combine device items for active layers
  const deviceItems = useMemo(() => {
    const items = []
    if (activeLayers.power) powerUnits.forEach((f) => items.push(f))
    if (activeLayers.cctv) cctvCameras.forEach((f) => items.push(f))
    if (activeLayers.sensors) sensors.forEach((f) => items.push(f))
    if (activeLayers.valves) valves.forEach((f) => items.push(f))
    if (activeLayers.borewells) borewells.forEach((f) => items.push(f))
    return items
  }, [activeLayers, powerUnits, cctvCameras, sensors, valves, borewells])

  // Map to format suitable for nudging
  const mappedDevices = useMemo(() => {
    return deviceItems
      .map((feat) => {
        const coords = feat.geometry?.coordinates
        if (!coords) return null
        return {
          feature: feat,
          position: { lat: coords[1], lng: coords[0] },
        }
      })
      .filter(Boolean)
  }, [deviceItems])

  // Nudge overlapping devices at zoom 16
  const nudgedDevices = useMemo(() => {
    return nudgeOverlappingPositions(mappedDevices, 16)
  }, [mappedDevices])

  // Base tile URL based on mapStyle
  const tileConfig = useMemo(() => {
    switch (mapStyle) {
      case 'roadmap':
      case 'clean':
        return {
          url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
          attribution: '&copy; CartoDB &copy; OpenStreetMap',
          maxZoom: 20,
        }
      case 'terrain':
        return {
          url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
          attribution: '&copy; OpenTopoMap &copy; OpenStreetMap',
          maxZoom: 17,
        }
      case 'satellite':
      default:
        return {
          url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          maxZoom: 19,
        }
    }
  }, [mapStyle])

  // Create Leaflet HTML DivIcon for circular badge marker
  const createLeafletDivIcon = (feat) => {
    const style = getDeviceStyle(feat)
    const size = style.size === 32 ? 32 : 40
    const iconSize = Math.round(size * 0.55)

    const html = `
      <div class="agrimap-backup-marker group" style="
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background-color: ${style.bg};
        border: 2.5px solid rgba(255, 255, 255, 0.95);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
        outline: none;
        user-select: none;
      " tabindex="0" role="button" aria-label="${style.label} (${style.statusText}). Open details">
        <svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24">
          ${style.icon}
        </svg>
        ${style.hasSunCorner ? `
          <span style="
            position: absolute;
            top: -4px;
            left: -4px;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background-color: #FEF3C7;
            border: 1.5px solid #F59E0B;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.4);
          ">
            <svg width="10" height="10" viewBox="0 0 12 12"><circle cx="6" cy="6" r="2.5" fill="#F59E0B" stroke="#FFFFFF" stroke-width="1"/><path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11M2.5 2.5l1 1M8.5 8.5l1 1M2.5 9.5l1-1M8.5 3.5l1-1" stroke="#F59E0B" stroke-width="1"/></svg>
          </span>
        ` : ''}
        ${style.hasNumberPill ? `
          <span style="
            position: absolute;
            top: -5px;
            right: -5px;
            min-width: 16px;
            height: 16px;
            padding: 0 4px;
            border-radius: 999px;
            background-color: #38BDF8;
            color: #032136;
            font-size: 10px;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1.5px solid #FFFFFF;
            box-shadow: 0 1px 4px rgba(0,0,0,0.5);
          ">${style.valveNumber || 1}</span>
        ` : ''}
        ${style.statusDot ? `
          <span style="
            position: absolute;
            bottom: 0px;
            right: 0px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: ${style.statusDot};
            border: 2px solid #FFFFFF;
            box-shadow: 0 1px 4px rgba(0,0,0,0.5);
          "></span>
        ` : ''}
      </div>
    `

    return L.divIcon({
      html,
      className: 'custom-agrimap-leaflet-marker',
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    })
  }

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={16}
        zoomControl={false}
        attributionControl={true}
        className="w-full h-full"
        style={{ background: '#131313' }}
      >
        <TileLayer
          key={`${mapStyle}-${tileConfig.url}`}
          url={tileConfig.url}
          attribution={tileConfig.attribution}
          maxZoom={tileConfig.maxZoom}
        />

        {/* Optional Labels Layer */}
        {showLabels && (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
            opacity={0.8}
            zIndex={500}
          />
        )}

        {/* Auto fit bounds */}
        {boundaryLatLngs.length > 0 && (
          <AutoFitBounds bounds={boundaryLatLngs} padding={fitPadding} />
        )}

        {/* 1. Crop Zones (fill opacity ~0.35, 2.5px solid border in stored color) */}
        {activeLayers.zones &&
          cropZones.map((zone, idx) => {
            const raw = zone.geometry?.coordinates
            const positions = geoJsonCoordsToLeaflet(raw)
            const fillCol =
              zone.properties?.shade_color ||
              zone.properties?.fill_color ||
              (idx === 0 ? '#10B981' : idx === 1 ? '#F59E0B' : '#8B5CF6')
            const strokeCol = zone.properties?.stroke_color || fillCol

            return (
              <Polygon
                key={zone.properties?.id || idx}
                positions={positions}
                pathOptions={{
                  color: strokeCol,
                  weight: 2.5,
                  opacity: 1.0,
                  fillColor: fillCol,
                  fillOpacity: 0.35,
                }}
                eventHandlers={{
                  click: () => {
                    onSelectFeature &&
                      onSelectFeature('zone', {
                        ...zone.properties,
                        crop: zone.properties?.crop || zone.properties?.name,
                        area_hectares:
                          zone.properties?.area_hectares ||
                          zone.properties?.calculated_area_hectares ||
                          (idx === 0 ? 3.85 : idx === 1 ? 2.55 : 2.26),
                        shade_color: fillCol,
                      })
                  },
                }}
              />
            )
          })}

        {/* 2. Boundary: Bold dashed violet (#8A57C0), 4px, drawn above zones */}
        {activeLayers.boundary && boundaryLatLngs.length > 0 && (
          <Polygon
            positions={boundaryLatLngs}
            pathOptions={{
              color: '#8A57C0',
              weight: 4,
              dashArray: '8, 8',
              opacity: 1.0,
              fillColor: V2V_COLORS.boundaryFill || '#8A57C0',
              fillOpacity: 0.05,
            }}
            eventHandlers={{
              click: () => {
                onSelectFeature &&
                  onSelectFeature('field', {
                    ...fieldFeature.properties,
                    name: effectiveFarm?.full_name
                      ? `${effectiveFarm.full_name}'s Farmland Twin`
                      : "Ganesh V.'s Smart Farmland Twin",
                    total_acres: effectiveFarm?.total_acres || 21.4,
                    total_hectares: effectiveFarm?.total_hectares || 8.66,
                    khata_number: effectiveFarm?.khata_number || 'TN-POL-4820',
                    village: effectiveFarm?.village || 'Pollachi Rural',
                    district: effectiveFarm?.district || 'Coimbatore',
                  })
              },
            }}
          />
        )}

        {/* 3. Lines: Main conduit 6px #1E90D6, sub-lateral 3.5px #38BDF8, access track 7px #F59E0B */}
        {activeLayers.lines &&
          linearFeatures.map((line, idx) => {
            const raw = line.geometry?.coordinates
            const positions = geoJsonCoordsToLeaflet(raw)
            const { item } = classifyFeature(line)
            const isPipeline = item.id === LEGEND_ITEMS.MAIN_CONDUIT.id || item.id === LEGEND_ITEMS.SUB_LATERAL.id
            const isTrack = item.id === LEGEND_ITEMS.FARM_TRACK.id

            const color = line.properties?.color || item.color || (isPipeline ? '#1E90D6' : '#F59E0B')
            const weight = line.properties?.weight || item.weight || (isPipeline ? 6 : 7)

            return (
              <Polyline
                key={line.properties?.id || idx}
                positions={positions}
                pathOptions={{
                  color,
                  weight,
                  opacity: 1.0,
                }}
                eventHandlers={{
                  click: () => {
                    onSelectFeature &&
                      onSelectFeature(isTrack ? 'track' : 'pipeline', {
                        ...line.properties,
                        name: line.properties?.name || item.label,
                        lineCategory: isTrack ? 'track' : isPipeline ? 'conduit' : 'other',
                        length_meters: line.properties?.length_meters || 180,
                        working_pressure_bar: line.properties?.working_pressure_bar || (isPipeline ? 2.4 : null),
                        diameter_mm: line.properties?.diameter_mm || (item.id === LEGEND_ITEMS.MAIN_CONDUIT.id ? 90 : 50),
                      })
                  },
                }}
              />
            )
          })}

        {/* 4. Circular Badge Markers (Borewells, CCTV, Sensors, Power, Valves) */}
        {nudgedDevices.map(({ feature, position }, idx) => {
          const icon = createLeafletDivIcon(feature)
          const style = getDeviceStyle(feature)

          return (
            <Marker
              key={feature.properties?.id || idx}
              position={[position.lat, position.lng]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  onSelectFeature &&
                    onSelectFeature(style.type, feature.properties || {})
                },
              }}
            />
          )
        })}

        {/* 5. Farm Center Target Marker (Violet ring + crosshair) */}
        {farmCenterMarker && (
          <Marker
            position={[farmCenterMarker.lat, farmCenterMarker.lng]}
            icon={L.divIcon({
              className: 'farm-center-reticle-marker',
              html: `
                <div style="
                  width: 36px;
                  height: 36px;
                  border-radius: 50%;
                  background: rgba(138, 87, 192, 0.9);
                  border: 2.5px solid #FFFFFF;
                  box-shadow: 0 0 16px rgba(138, 87, 192, 0.8), 0 4px 10px rgba(0,0,0,0.5);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  position: relative;
                ">
                  <div style="width: 8px; height: 8px; border-radius: 50%; background: #FFFFFF;"></div>
                  <div style="position: absolute; top: 4px; bottom: 4px; left: 17px; width: 2px; background: #FFFFFF;"></div>
                  <div style="position: absolute; left: 4px; right: 4px; top: 17px; height: 2px; background: #FFFFFF;"></div>
                </div>
              `,
              iconSize: [36, 36],
              iconAnchor: [18, 18],
            })}
            zIndexOffset={1000}
          />
        )}

        {/* 6. Admin User Location (Blue dot with accuracy circle) */}
        {userLocation && (
          <>
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={userLocation.accuracy}
              pathOptions={{
                color: '#3B82F6',
                fillColor: '#3B82F6',
                fillOpacity: 0.15,
                weight: 1.5,
              }}
            />
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={L.divIcon({
                className: 'admin-user-location-marker',
                html: `
                  <div style="
                    width: 18px;
                    height: 18px;
                    border-radius: 50%;
                    background: #2563EB;
                    border: 2.5px solid #FFFFFF;
                    box-shadow: 0 0 10px rgba(37, 99, 235, 0.8);
                  "></div>
                `,
                iconSize: [18, 18],
                iconAnchor: [9, 9],
              })}
              zIndexOffset={1100}
            />
          </>
        )}
      </MapContainer>
    </div>
  )
}
