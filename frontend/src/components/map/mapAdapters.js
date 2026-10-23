/**
 * mapAdapters.js — Resilient Coordinate & Geometry Adapters for Google Maps & GeoJSON
 *
 * NON-NEGOTIABLE RULE: Saved farmer data coordinate format is strictly preserved.
 * Converts to Google { lat, lng } only during rendering, and back to GeoJSON on save.
 */

/**
 * Converts a GeoJSON [lng, lat] or [lng, lat, elevation] to Google { lat, lng }
 */
export function geoJsonCoordToGoogle(coord) {
  if (!coord || !Array.isArray(coord) || coord.length < 2) return null
  const [lng, lat] = coord
  return { lat: Number(lat), lng: Number(lng) }
}

/**
 * Converts a Google { lat, lng } or LatLng object to GeoJSON [lng, lat]
 */
export function googleCoordToGeoJson(point) {
  if (!point) return null
  const lat = typeof point.lat === 'function' ? point.lat() : point.lat
  const lng = typeof point.lng === 'function' ? point.lng() : point.lng
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return null
  }
  return [lng, lat]
}

/**
 * Converts any generic coordinate representation to a standard { lat, lng } object.
 * Accepts:
 * - [lat, lng] (standard leaflet format)
 * - { lat, lng }
 * - { latitude, longitude }
 * - Google LatLng instance
 */
export function toLatLng(input, isGeoJson = false) {
  if (!input) return null
  if (Array.isArray(input)) {
    if (input.length < 2) return null
    if (isGeoJson) {
      // GeoJSON is [lng, lat]
      return { lat: Number(input[1]), lng: Number(input[0]) }
    }
    // Leaflet / general array is [lat, lng]
    return { lat: Number(input[0]), lng: Number(input[1]) }
  }
  if (typeof input === 'object') {
    const lat = typeof input.lat === 'function' ? input.lat() : (input.lat ?? input.latitude)
    const lng = typeof input.lng === 'function' ? input.lng() : (input.lng ?? input.longitude)
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng }
    }
  }
  return null
}

/**
 * Converts a { lat, lng } to a [lat, lng] pair (Leaflet format)
 */
export function fromLatLngToPair(point) {
  if (!point) return null
  const lat = typeof point.lat === 'function' ? point.lat() : (point.lat ?? point.latitude)
  const lng = typeof point.lng === 'function' ? point.lng() : (point.lng ?? point.longitude)
  return [Number(lat), Number(lng)]
}

/**
 * Converts GeoJSON Polygon or MultiPolygon geometry into an array of Google path arrays [{lat, lng}, ...]
 */
export function geoJsonToGooglePaths(geometry) {
  if (!geometry || !geometry.coordinates) return []
  const { type, coordinates } = geometry
  const paths = []

  if (type === 'Polygon') {
    // coordinates is Array of LinearRings: [ring0 (outer), ring1 (hole), ...]
    if (Array.isArray(coordinates) && coordinates.length > 0) {
      const outerRing = coordinates[0]
      if (Array.isArray(outerRing)) {
        paths.push(outerRing.map(geoJsonCoordToGoogle).filter(Boolean))
      }
    }
  } else if (type === 'MultiPolygon') {
    // coordinates is Array of Polygons: [ [ring0], [ring1] ]
    if (Array.isArray(coordinates)) {
      for (const polygon of coordinates) {
        if (Array.isArray(polygon) && polygon.length > 0) {
          const outerRing = polygon[0]
          if (Array.isArray(outerRing)) {
            paths.push(outerRing.map(geoJsonCoordToGoogle).filter(Boolean))
          }
        }
      }
    }
  }
  return paths
}

/**
 * Converts an array of Google { lat, lng } paths back to GeoJSON MultiPolygon or Polygon geometry.
 * Ensures the polygon is properly closed (first and last coordinate match).
 */
export function googlePathsToGeoJson(paths, asMultiPolygon = true) {
  if (!paths || !Array.isArray(paths) || paths.length === 0) {
    return asMultiPolygon
      ? { type: 'MultiPolygon', coordinates: [] }
      : { type: 'Polygon', coordinates: [] }
  }

  const rings = paths.map((path) => {
    const ring = path.map(googleCoordToGeoJson).filter(Boolean)
    // GeoJSON linear rings must have >= 4 positions and be closed
    if (ring.length >= 3) {
      const first = ring[0]
      const last = ring[ring.length - 1]
      if (first[0] !== last[0] || first[1] !== last[1]) {
        ring.push([first[0], first[1]])
      }
    }
    return ring
  }).filter((ring) => ring.length >= 4)

  if (asMultiPolygon) {
    return {
      type: 'MultiPolygon',
      coordinates: rings.map((ring) => [ring]),
    }
  }

  return {
    type: 'Polygon',
    coordinates: rings.length > 0 ? rings : [],
  }
}

/**
 * Converts GeoJSON LineString coordinates to Google { lat, lng } array
 */
export function lineGeoJsonToGooglePath(geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates)) return []
  return geometry.coordinates.map(geoJsonCoordToGoogle).filter(Boolean)
}

/**
 * Converts Google { lat, lng } array to GeoJSON LineString geometry
 */
export function googlePathToLineGeoJson(path) {
  if (!path || !Array.isArray(path)) return { type: 'LineString', coordinates: [] }
  const coordinates = path.map(googleCoordToGeoJson).filter(Boolean)
  return {
    type: 'LineString',
    coordinates,
  }
}

/**
 * Converts GeoJSON Point geometry to Google { lat, lng }
 */
export function pointGeoJsonToGoogleLatLng(geometry) {
  if (!geometry || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2) {
    return null
  }
  return geoJsonCoordToGoogle(geometry.coordinates)
}

/**
 * Converts Google { lat, lng } to GeoJSON Point geometry
 */
export function googleLatLngToPointGeoJson(point) {
  const coord = googleCoordToGeoJson(point)
  if (!coord) return null
  return {
    type: 'Point',
    coordinates: coord,
  }
}
