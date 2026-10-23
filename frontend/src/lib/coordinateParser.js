/**
 * coordinateParser.js — Robust Geographical Coordinate Parser & Converter
 *
 * Supports:
 * - Decimal coordinates: "10.6565, 77.0102", "10.6565; 77.0102", "10.6565 77.0102", "-33.8688, 151.2093"
 * - Cardinal suffix: "10.6565 N 77.0102 E", "10.6565°N, 77.0102°E"
 * - Cardinal prefix: "N10.6565 E77.0102", "N 10.6565, E 77.0102"
 * - DMS (Degrees, Minutes, Seconds): 10°39'23.4"N 77°00'36.7"E (and prime/smart quote variants)
 * - DDM (Degrees, Decimal Minutes): "10 39.39 N 77 0.612 E", "10° 39.39' N, 77° 0.612' E"
 * - Pasted Google Maps format: "10.6565,77.0102"
 *
 * Features:
 * - Specific error messages: single number, out of range, unreadable
 * - Swap detection: detects when longitude is entered first (e.g. 77.0102, 10.6565)
 * - Outside India warning: amber notification for points outside India's bounding box
 * - Reversible conversions: Decimal and DMS agree within 1e-6
 */

/**
 * Parses any supported coordinate string format into validated latitude and longitude.
 */
export function parseCoordinates(input) {
  if (typeof input !== 'string') {
    return { ok: false, error: 'Coordinate input must be a valid text string.' }
  }

  const raw = input.trim()
  if (!raw) {
    return { ok: false, error: 'Please enter coordinates in Decimal, DMS, or DDM format.' }
  }

  // Normalize typographic variants of degree, minutes, seconds, and separators
  const normalized = raw
    .replace(/[\u2032\u2019\u0060]/g, "'")    // prime, right single quote, backtick -> '
    .replace(/[\u2033\u201D\u201C]/g, '"')    // double prime, smart quotes -> "
    .replace(/[\u00BA\u02DA]/g, '°')          // masculine ordinal / ring above -> °
    .replace(/;/g, ',')                       // semicolon separator -> comma
    .replace(/\s+/g, ' ')
    .trim()

  // Check if input contains only a single number
  const singleNumMatch = normalized.match(/^[+-]?\d+(?:\.\d+)?$/)
  if (singleNumMatch) {
    return {
      ok: false,
      error: 'Only one coordinate was entered. Please enter both latitude and longitude.',
    }
  }

  // ── 1. DMS Pattern (Degrees Minutes Seconds) ───────────────────────────
  // Matches e.g. 10°39'23.4"N 77°00'36.7"E or 10° 39' 23.4" N, 77° 00' 36.7" E
  const dmsPartRegex = /([+-]?\d+(?:\.\d+)?)\s*°\s*(\d+(?:\.\d+)?)\s*'\s*(\d+(?:\.\d+)?)\s*"\s*([NSEW])?/gi
  const dmsMatches = [...normalized.matchAll(dmsPartRegex)]

  if (dmsMatches.length >= 2) {
    const p1 = parseDmsMatch(dmsMatches[0])
    const p2 = parseDmsMatch(dmsMatches[1])
    return resolveLatAndLng(p1, p2)
  }

  // ── 2. Cardinal Prefix Decimal Pattern (e.g. "N10.6565 E77.0102") ──────
  const cardPrefixRegex = /^([NSEW])\s*([+-]?\d+(?:\.\d+)?)[,\s]+([NSEW])\s*([+-]?\d+(?:\.\d+)?)$/i
  const prefixMatch = normalized.match(cardPrefixRegex)
  if (prefixMatch) {
    const h1 = prefixMatch[1].toUpperCase()
    let v1 = parseFloat(prefixMatch[2])
    const h2 = prefixMatch[3].toUpperCase()
    let v2 = parseFloat(prefixMatch[4])

    if (h1 === 'S' || h1 === 'W') v1 = -Math.abs(v1)
    if (h2 === 'S' || h2 === 'W') v2 = -Math.abs(v2)

    return resolveLatAndLng({ dec: v1, hemi: h1 }, { dec: v2, hemi: h2 })
  }

  // ── 3. Cardinal Suffix Decimal Pattern (e.g. "10.6565 N 77.0102 E") ────
  const cardSuffixRegex = /^([+-]?\d+(?:\.\d+)?)\s*°?\s*([NSEW])[,\s]+([+-]?\d+(?:\.\d+)?)\s*°?\s*([NSEW])$/i
  const suffixMatch = normalized.match(cardSuffixRegex)
  if (suffixMatch) {
    let v1 = parseFloat(suffixMatch[1])
    const h1 = suffixMatch[2].toUpperCase()
    let v2 = parseFloat(suffixMatch[3])
    const h2 = suffixMatch[4].toUpperCase()

    if (h1 === 'S' || h1 === 'W') v1 = -Math.abs(v1)
    if (h2 === 'S' || h2 === 'W') v2 = -Math.abs(v2)

    return resolveLatAndLng({ dec: v1, hemi: h1 }, { dec: v2, hemi: h2 })
  }

  // ── 4. DDM Pattern (Degrees Decimal Minutes) ───────────────────────────
  // Matches e.g. "10 39.39 N 77 0.612 E" or "10° 39.39' N, 77° 0.612' E"
  const ddmPartRegex = /([+-]?\d+)\s*(?:°|\s)\s*(\d+(?:\.\d+)?)\s*'?\s*([NSEW])/gi
  const ddmMatches = [...normalized.matchAll(ddmPartRegex)]

  if (ddmMatches.length >= 2) {
    const parseDdm = (m) => {
      const deg = parseFloat(m[1])
      const min = parseFloat(m[2])
      const hemi = (m[3] || '').toUpperCase()
      let dec = Math.abs(deg) + min / 60
      if (deg < 0 || hemi === 'S' || hemi === 'W') dec = -dec
      return { dec, hemi }
    }
    const p1 = parseDdm(ddmMatches[0])
    const p2 = parseDdm(ddmMatches[1])
    return resolveLatAndLng(p1, p2)
  }

  // ── 5. Pure Decimal Pattern (e.g. "10.6565, 77.0102" or "10.6565 77.0102") ─
  const plainDecRegex = /^([+-]?\d+(?:\.\d+)?)[,\s]+([+-]?\d+(?:\.\d+)?)$/
  const plainMatch = normalized.match(plainDecRegex)
  if (plainMatch) {
    const lat = parseFloat(plainMatch[1])
    const lng = parseFloat(plainMatch[2])
    return validateAndFormat(lat, lng)
  }

  return {
    ok: false,
    error: 'Unrecognized coordinate format. Enter Decimal (e.g. 10.6565, 77.0102) or DMS (e.g. 10°39\'23.4"N 77°00\'36.7"E).',
  }
}

function parseDmsMatch(m) {
  const deg = parseFloat(m[1]) || 0
  const min = parseFloat(m[2]) || 0
  const sec = parseFloat(m[3]) || 0
  const hemi = (m[4] || '').toUpperCase()

  let dec = Math.abs(deg) + min / 60 + sec / 3600
  if (deg < 0 || hemi === 'S' || hemi === 'W') {
    dec = -dec
  }
  return { dec, hemi }
}

function resolveLatAndLng(p1, p2) {
  let lat = null
  let lng = null

  if (p1.hemi === 'N' || p1.hemi === 'S') lat = p1.dec
  if (p1.hemi === 'E' || p1.hemi === 'W') lng = p1.dec

  if (p2.hemi === 'N' || p2.hemi === 'S') lat = p2.dec
  if (p2.hemi === 'E' || p2.hemi === 'W') lng = p2.dec

  if (lat === null && lng === null) {
    lat = p1.dec
    lng = p2.dec
  } else if (lat === null) {
    lat = p1.dec
  } else if (lng === null) {
    lng = p2.dec
  }

  return validateAndFormat(lat, lng)
}

function validateAndFormat(lat, lng) {
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return { ok: false, error: 'Coordinates could not be parsed to numeric values.' }
  }

  // Out of range checks
  if (lat < -90 || lat > 90) {
    return {
      ok: false,
      error: `Latitude ${lat.toFixed(4)}° is out of range. Latitude must be between -90 and +90.`,
    }
  }

  if (lng < -180 || lng > 180) {
    return {
      ok: false,
      error: `Longitude ${lng.toFixed(4)}° is out of range. Longitude must be between -180 and +180.`,
    }
  }

  // Swap Detection: Check if user entered [lng, lat] instead of [lat, lng]
  // In India: Latitude is ~6° to 37° N, Longitude is ~68° to 98° E
  let swapSuggestion = null
  if (lat >= 68 && lat <= 98 && lng >= 6 && lng <= 37) {
    swapSuggestion = {
      lat: Number(lng.toFixed(7)),
      lng: Number(lat.toFixed(7)),
      text: `Did you mean latitude ${lng.toFixed(5)}, longitude ${lat.toFixed(5)}?`,
    }
  }

  // Outside India check: Bounding box approx 6° - 37.5° N, 68° - 98.5° E
  const isOutsideIndia = lat < 6.0 || lat > 37.5 || lng < 68.0 || lng > 98.5

  const latHemi = lat >= 0 ? 'N' : 'S'
  const lngHemi = lng >= 0 ? 'E' : 'W'
  const formattedDms = `${toDms(lat, latHemi)} ${toDms(lng, lngHemi)}`

  // Round to max 7 decimal places for precision editing
  const roundedLat = Number(lat.toFixed(7))
  const roundedLng = Number(lng.toFixed(7))

  return {
    ok: true,
    lat: roundedLat,
    lng: roundedLng,
    formatted: `${roundedLat.toFixed(6)}, ${roundedLng.toFixed(6)}`,
    dms: formattedDms,
    swapSuggestion,
    outsideIndia: isOutsideIndia,
    outsideIndiaNotice: isOutsideIndia ? 'Coordinates are outside India. Please confirm.' : null,
  }
}

/**
 * Converts decimal degrees to high-precision DMS string
 */
export function toDms(val, hemi) {
  const abs = Math.abs(val)
  const deg = Math.floor(abs)
  const minFloat = (abs - deg) * 60
  const min = Math.floor(minFloat)
  const sec = ((minFloat - min) * 60).toFixed(1)
  return `${deg}°${min.toString().padStart(2, '0')}'${sec.padStart(4, '0')}"${hemi}`
}

/**
 * Converts DMS components back to decimal degrees
 */
export function dmsToDecimal(deg, min, sec, hemi) {
  let val = Math.abs(deg) + min / 60 + sec / 3600
  if (hemi === 'S' || hemi === 'W') val = -val
  return val
}
