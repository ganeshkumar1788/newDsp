/**
 * addressResolver.js — Intelligent Address Ladder & Geocoding Resolver
 *
 * Implements:
 * - Smart token stripping: Survey numbers, Khata, Patta, SF, and Plot tokens are never sent to geocoder
 * - Address ladder fallback:
 *     1. Stored boundary centroid (when querying farm's own registered address)
 *     2. Full clean text
 *     3. Locality / Village
 *     4. Taluk / District
 *     5. Pincode area
 * - Indian 6-digit Pincode detection (e.g. "642001" -> "Pincode area, approximate")
 * - Specific error responses: ZERO_RESULTS ("No match; try the village or pincode"),
 *   OVER_QUERY_LIMIT, REQUEST_DENIED ("Geocoding API is not enabled. Please enable Geocoding API in Google Cloud Console."), offline
 * - 30 lookups/hour session rate limiter with user-friendly alert
 * - In-memory session cache
 * - Zero write to farm data
 */

// In-memory cache for session duration
const sessionCache = new Map()

// Rate limit: 30 address lookups per hour
const MAX_LOOKUPS_PER_HOUR = 30
const RATE_LIMIT_KEY = 'agrimap.addressResolver.rateLimit.v1'

/**
 * Checks and records rate limit quota.
 */
function checkRateLimit() {
  try {
    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000
    const raw = sessionStorage.getItem(RATE_LIMIT_KEY)
    let timestamps = raw ? JSON.parse(raw) : []
    // Filter timestamps within last 1 hour
    timestamps = timestamps.filter((t) => t > oneHourAgo)

    if (timestamps.length >= MAX_LOOKUPS_PER_HOUR) {
      return {
        allowed: false,
        message: 'Address search limit reached (30 lookups per hour). You can still enter coordinates or drop a pin.',
      }
    }

    timestamps.push(now)
    sessionStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(timestamps))
    return { allowed: true }
  } catch (e) {
    // If sessionStorage is unavailable, allow the call
    return { allowed: true }
  }
}

/**
 * Strips survey, khata, patta, plot, and SF numbers from address query.
 * Google Geocoder cannot resolve internal revenue cadastral tokens.
 */
export function stripSurveyTokens(text) {
  if (typeof text !== 'string') return ''

  let clean = text
    // Strip Survey No, SF No, S.F., Khata, Patta, Plot, Door/H.No patterns
    .replace(/\b(?:s\.?f\.?|survey|khata|patta|plot|door|h\.no|d\.no)\s*(?:no\.?|#)?\s*[\d\w\/-]+/gi, '')
    // Strip standalone expressions like "No. 48/2A" or "#482"
    .replace(/(?:no\.?|#)\s*\d+[\w\/-]*/gi, '')
    // Clean up multiple commas and whitespace
    .replace(/,\s*,+/g, ',')
    .replace(/^\s*,\s*|\s*,\s*$/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return clean || text.trim()
}

/**
 * Checks if input is an Indian 6-digit postal pincode
 */
export function isPincode(input) {
  if (typeof input !== 'string') return false
  return /^\s*\d{6}\s*$/.test(input)
}

/**
 * Extracts 6-digit pincode if present in string
 */
export function extractPincode(input) {
  if (typeof input !== 'string') return null
  const m = input.match(/\b(\d{6})\b/)
  return m ? m[1] : null
}

/**
 * Known offline / fallback coordinate database for Tamil Nadu & Coimbatore agricultural belt.
 * Used for offline mode, unit tests, and instant fallback.
 */
const KNOWN_REGIONAL_LOCATIONS = {
  // Pincodes
  '642001': { lat: 10.6609, lng: 77.0048, formatted: 'Pollachi Head Post Office, Coimbatore, Tamil Nadu, 642001', level: 'Pincode area', approximate: true },
  '642002': { lat: 10.6582, lng: 77.0180, formatted: 'Mahalingapuram, Pollachi, Coimbatore, Tamil Nadu, 642002', level: 'Pincode area', approximate: true },
  '642003': { lat: 10.6550, lng: 77.0120, formatted: 'Pollachi Rural, Coimbatore, Tamil Nadu, 642003', level: 'Pincode area', approximate: true },
  '642109': { lat: 10.6585, lng: 77.0125, formatted: 'Jallipatti Post, Pollachi Taluk, Coimbatore, Tamil Nadu, 642109', level: 'Pincode area', approximate: true },
  '641001': { lat: 11.0016, lng: 76.9628, formatted: 'Coimbatore Collectorate, Tamil Nadu, 641001', level: 'Pincode area', approximate: true },
  // Localities & Towns
  'jallipatti': { lat: 10.6585, lng: 77.0125, formatted: 'Jallipatti Village, Pollachi Taluk, Coimbatore, Tamil Nadu', level: 'Locality', approximate: true },
  'pollachi': { lat: 10.6585, lng: 77.0125, formatted: 'Pollachi, Coimbatore District, Tamil Nadu', level: 'Locality', approximate: true },
  'kinathukadavu': { lat: 10.8222, lng: 77.0211, formatted: 'Kinathukadavu, Coimbatore District, Tamil Nadu', level: 'Locality', approximate: true },
  'udumalaipettai': { lat: 10.5833, lng: 77.2500, formatted: 'Udumalaipettai, Tiruppur District, Tamil Nadu', level: 'Locality', approximate: true },
  'coimbatore': { lat: 11.0168, lng: 76.9558, formatted: 'Coimbatore District, Tamil Nadu, India', level: 'District', approximate: true },
  'tamil nadu': { lat: 11.1271, lng: 78.6569, formatted: 'Tamil Nadu, India', level: 'District', approximate: true },
}

/**
 * Builds the fallback address ladder step array.
 */
export function buildAddressLadder(rawQuery, farmData = null) {
  const ladder = []
  const clean = stripSurveyTokens(rawQuery)

  // 1. If searching farm's own registered address and farm has stored centroid/coordinates
  if (farmData && farmData.centroid) {
    const farmAddr = `${farmData.village || ''} ${farmData.district || ''}`.toLowerCase()
    if (rawQuery.toLowerCase().includes(farmData.village?.toLowerCase() || '___')) {
      ladder.push({
        query: clean,
        type: 'stored_boundary',
        coords: farmData.centroid,
        level: 'Exact',
        approximate: false,
      })
    }
  }

  // 2. Full cleaned query without survey tokens
  ladder.push({ query: clean, level: 'Street', approximate: false })

  // 3. Comma-separated components ladder
  const parts = clean.split(',').map((p) => p.trim()).filter(Boolean)
  if (parts.length > 1) {
    // Drop the first/most specific component (e.g. specific lane or plot description)
    ladder.push({ query: parts.slice(1).join(', '), level: 'Locality', approximate: true })
    if (parts.length > 2) {
      // Drop locality, keep taluk / district / pincode / state
      ladder.push({ query: parts.slice(2).join(', '), level: 'District', approximate: true })
    }
  }

  // 4. Pincode standalone if present in query
  const pin = extractPincode(rawQuery)
  if (pin) {
    ladder.push({ query: pin, level: 'Pincode area', approximate: true })
  }

  return ladder
}

/**
 * Primary address resolving function.
 * Respects rate limits, session caching, and the step-by-step address ladder.
 */
export async function resolveAddress(query, options = {}) {
  const { farmData = null, googleMaps = null, skipRateLimit = false } = options

  if (!query || typeof query !== 'string' || !query.trim()) {
    return { ok: false, error: 'Please enter a valid address, village name, or 6-digit pincode.' }
  }

  const trimmed = query.trim()

  // 1. Check in-memory session cache
  const cacheKey = trimmed.toLowerCase()
  if (sessionCache.has(cacheKey)) {
    return sessionCache.get(cacheKey)
  }

  // 2. Enforce 30 lookups/hour rate limiter (unless explicitly bypassed, e.g. for mock tests)
  if (!skipRateLimit) {
    const rateCheck = checkRateLimit()
    if (!rateCheck.allowed) {
      return { ok: false, error: rateCheck.message, rateLimited: true }
    }
  }

  // 3. Check offline navigator state
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    // Attempt offline dictionary match
    const offlineMatch = matchKnownRegional(trimmed)
    if (offlineMatch) {
      return offlineMatch
    }
    return {
      ok: false,
      error: 'You are currently offline. Please enter coordinates or connect to the internet to search addresses.',
      offline: true,
    }
  }

  // 4. Execute Address Ladder
  const ladder = buildAddressLadder(trimmed, farmData)

  for (const step of ladder) {
    // Case A: Stored boundary centroid
    if (step.type === 'stored_boundary' && step.coords) {
      const res = {
        ok: true,
        lat: step.coords[0],
        lng: step.coords[1],
        formatted: `${trimmed} (Farm Boundary)`,
        level: step.level,
        approximate: step.approximate,
        source: 'stored_boundary',
      }
      sessionCache.set(cacheKey, res)
      return res
    }

    // Case B: Google Geocoder if available
    const gmaps = googleMaps || (typeof window !== 'undefined' ? window.google : null)
    if (gmaps && gmaps.maps && gmaps.maps.Geocoder) {
      try {
        const result = await geocodeWithGoogle(step.query, gmaps)
        if (result.ok) {
          const combined = {
            ...result,
            level: step.level,
            approximate: step.approximate,
            ladderQuery: step.query,
          }
          sessionCache.set(cacheKey, combined)
          return combined
        } else if (result.errorType === 'REQUEST_DENIED') {
          return {
            ok: false,
            error: 'Geocoding API is not enabled. Please enable Geocoding API in Google Cloud Console.',
            apiError: true,
          }
        } else if (result.errorType === 'OVER_QUERY_LIMIT') {
          return {
            ok: false,
            error: 'Geocoding query limit exceeded. You can still enter coordinates or drop a pin.',
            apiError: true,
          }
        }
        // If ZERO_RESULTS, continue to next step on ladder
      } catch (err) {
        console.warn('[addressResolver] Geocoding exception:', err)
      }
    }

    // Case C: Known Regional Dictionary match
    const dictMatch = matchKnownRegional(step.query)
    if (dictMatch) {
      sessionCache.set(cacheKey, dictMatch)
      return dictMatch
    }
  }

  // 5. Ladder exhausted with zero results
  return {
    ok: false,
    error: 'No match found; try entering the village name or 6-digit pincode.',
    zeroResults: true,
  }
}

/**
 * Matches against known regional dictionary (Pollachi / Coimbatore belt)
 */
function matchKnownRegional(query) {
  const q = query.toLowerCase().replace(/[^\w\s]/g, '').trim()
  for (const [key, val] of Object.entries(KNOWN_REGIONAL_LOCATIONS)) {
    if (q.includes(key) || key.includes(q)) {
      return {
        ok: true,
        lat: val.lat,
        lng: val.lng,
        formatted: val.formatted,
        level: val.level,
        approximate: val.approximate,
        source: 'regional_index',
      }
    }
  }
  return null
}

/**
 * Google Geocoder Promise wrapper with region 'IN' bias.
 */
function geocodeWithGoogle(address, google) {
  return new Promise((resolve) => {
    const geocoder = new google.maps.Geocoder()
    geocoder.geocode(
      {
        address,
        region: 'IN',
        componentRestrictions: { country: 'IN' },
      },
      (results, status) => {
        if (status === 'OK' && results && results.length > 0) {
          const loc = results[0].geometry.location
          const lat = typeof loc.lat === 'function' ? loc.lat() : loc.lat
          const lng = typeof loc.lng === 'function' ? loc.lng() : loc.lng

          // Extract viewport bounding box if present for dashed accuracy box
          let viewportBounds = null
          if (results[0].geometry.viewport) {
            const vp = results[0].geometry.viewport
            viewportBounds = {
              north: typeof vp.getNorthEast === 'function' ? vp.getNorthEast().lat() : vp.north,
              east: typeof vp.getNorthEast === 'function' ? vp.getNorthEast().lng() : vp.east,
              south: typeof vp.getSouthWest === 'function' ? vp.getSouthWest().lat() : vp.south,
              west: typeof vp.getSouthWest === 'function' ? vp.getSouthWest().lng() : vp.west,
            }
          }

          resolve({
            ok: true,
            lat: Number(lat.toFixed(7)),
            lng: Number(lng.toFixed(7)),
            formatted: results[0].formatted_address,
            viewportBounds,
            source: 'google_geocoder',
          })
        } else {
          resolve({
            ok: false,
            errorType: status,
          })
        }
      }
    )
  })
}
