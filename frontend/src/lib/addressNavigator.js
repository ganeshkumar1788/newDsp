/**
 * addressNavigator.js — Resilient Hierarchical Address Navigation Ladder
 *
 * Implements Section D requirements:
 * 1. Address parsing: Extracts survey/khata tokens, village, district, pincode (\b\d{6}\b).
 * 2. Navigation ladder:
 *    Level 1: Stored boundary or coordinates present -> fitBounds to boundary (Exact)
 *    Level 2: Full address without survey/khata tokens -> Geocode (Street / Locality)
 *    Level 3: Drop specific terms step-by-step: Locality -> Village -> District -> Pincode -> State
 * 3. Never sends survey/khata numbers to Google Geocoder.
 * 4. Bias to India (region: 'IN', componentRestrictions: { country: 'IN' }).
 * 5. 3km consistency check against farm centroid.
 * 6. Session cache to eliminate redundant API calls.
 * 7. ZERO_RESULTS and REQUEST_DENIED specific error handling.
 * 8. Never alters or saves any farm data.
 */
import { getDistanceMeters } from './geoUtils'
import { toDms } from './coordinateParser'

// In-memory session cache for geocoded queries
const GEOCODE_CACHE = new Map()

// Survey / Khata token patterns to display in UI but NEVER send to Google
const SURVEY_TOKENS_REGEX = /(?:survey\s*(?:no\.?|number)?|s\.?no\.?|khata\s*(?:no\.?|number)?|gat\s*(?:no\.?|number)?|patta\s*(?:no\.?|number)?|plot\s*(?:no\.?|number)?)\s*[:#\-]?\s*[\w\d\/\-]+/gi

/**
 * Parses raw address string into structured parts without altering stored data.
 */
export function parseAddressTokens(rawAddress = '') {
  if (!rawAddress || typeof rawAddress !== 'string') {
    return {
      raw: '',
      surveyTokens: [],
      cleanQuery: '',
      pincode: null,
      parts: [],
    }
  }

  const raw = rawAddress.trim()

  // 1. Extract survey / khata tokens
  const surveyTokens = [...raw.matchAll(SURVEY_TOKENS_REGEX)].map((m) => m[0].trim())

  // 2. Extract 6-digit Indian pincode
  const pinMatch = raw.match(/\b([1-9]\d{5})\b/)
  const pincode = pinMatch ? pinMatch[1] : null

  // 3. Remove survey tokens to produce clean geocodable string
  let clean = raw.replace(SURVEY_TOKENS_REGEX, '').replace(/\s+/g, ' ').replace(/^[\s,.\-]+|[\s,.\-]+$/g, '')

  // 4. Split clean string into segments (comma / dash)
  const parts = clean
    .split(/[,–—\-]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.match(/^[1-9]\d{5}$/))

  return {
    raw,
    surveyTokens,
    cleanQuery: clean,
    pincode,
    parts,
  }
}

/**
 * Builds the fallback ladder queries:
 * 1. Full clean address (without survey tokens)
 * 2. Village / Town + District + Pincode
 * 3. District + State + Pincode
 * 4. Pincode + India
 */
export function buildAddressLadder(addressData) {
  const ladder = []
  const { raw, cleanQuery, pincode, parts } = parseAddressTokens(
    typeof addressData === 'string' ? addressData : addressData?.address || ''
  )

  const village = addressData?.village || (parts.length > 0 ? parts[0] : null)
  const district = addressData?.district || (parts.length > 1 ? parts[1] : null)
  const state = addressData?.state || 'Tamil Nadu'

  // Level 2: Full clean address
  if (cleanQuery) {
    ladder.push({
      level: 'street',
      label: 'Street / Locality Address',
      isApproximate: false,
      query: cleanQuery,
    })
  }

  // Level 3: Village + District + State
  if (village && district) {
    ladder.push({
      level: 'village',
      label: 'Village / Town Area',
      isApproximate: true,
      query: `${village}, ${district}, ${state}${pincode ? ` ${pincode}` : ''}, India`,
    })
  }

  // Level 4: District + State
  if (district) {
    ladder.push({
      level: 'district',
      label: 'District Area',
      isApproximate: true,
      query: `${district}, ${state}, India`,
    })
  }

  // Level 5: Pincode area
  if (pincode) {
    ladder.push({
      level: 'pincode',
      label: `Postal Area (${pincode})`,
      isApproximate: true,
      query: `${pincode}, India`,
    })
  }

  return ladder
}

/**
 * Executes the hierarchical address navigation ladder using Google Maps Geocoder
 */
export async function executeAddressLadder({
  google,
  address,
  farmCentroid = null,
  farmBounds = null,
}) {
  // Step 1: If farm boundary or centroid is already available, Level 1 is Exact
  if (farmBounds || farmCentroid) {
    const lat = farmCentroid?.lat || (farmBounds ? farmBounds.getCenter().lat() : 10.6585)
    const lng = farmCentroid?.lng || (farmBounds ? farmBounds.getCenter().lng() : 77.0125)
    return {
      ok: true,
      level: 'boundary',
      levelLabel: 'Exact Stored Farm Boundary',
      isApproximate: false,
      lat,
      lng,
      formattedDms: `${toDms(lat, lat >= 0 ? 'N' : 'S')} ${toDms(lng, lng >= 0 ? 'E' : 'W')}`,
      viewport: farmBounds || null,
      addressMatched: 'Cadastral Boundary Centroid',
      consistencyCheck: {
        distanceKm: 0,
        isConsistent: true,
        warning: null,
      },
    }
  }

  if (!google || !google.maps || !google.maps.Geocoder) {
    return {
      ok: false,
      error: 'Google Maps Geocoder is not loaded.',
    }
  }

  const ladder = buildAddressLadder(address)
  if (ladder.length === 0) {
    return {
      ok: false,
      error: 'No address details provided to navigate.',
    }
  }

  const geocoder = new google.maps.Geocoder()

  // Iterate down the ladder until the first working query
  for (const step of ladder) {
    // Check in-memory cache first
    const cached = GEOCODE_CACHE.get(step.query)
    if (cached) {
      return formatGeocodeResult(cached, step, farmCentroid)
    }

    try {
      const response = await new Promise((resolve, reject) => {
        geocoder.geocode(
          {
            address: step.query,
            region: 'IN',
            componentRestrictions: { country: 'IN' },
          },
          (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              resolve(results[0])
            } else if (status === 'ZERO_RESULTS') {
              resolve(null)
            } else {
              reject(new Error(status))
            }
          }
        )
      })

      if (response) {
        // Cache successful response
        GEOCODE_CACHE.set(step.query, response)
        return formatGeocodeResult(response, step, farmCentroid)
      }
    } catch (err) {
      const status = err.message || ''
      if (status === 'OVER_QUERY_LIMIT') {
        return {
          ok: false,
          error: 'Geocoding query limit reached. Please wait a moment and try again.',
        }
      }
      if (status === 'REQUEST_DENIED') {
        return {
          ok: false,
          error:
            'Geocoding API request denied. Please ensure the Geocoding API is enabled on your Google Cloud project.',
        }
      }
    }
  }

  return {
    ok: false,
    error: 'No match found for this address. Try entering the village name or 6-digit PIN code.',
  }
}

/**
 * Formats Google Geocoder response with consistency check
 */
function formatGeocodeResult(result, step, farmCentroid) {
  const loc = result.geometry.location
  const lat = loc.lat()
  const lng = loc.lng()
  const latHemi = lat >= 0 ? 'N' : 'S'
  const lngHemi = lng >= 0 ? 'E' : 'W'
  const formattedDms = `${toDms(lat, latHemi)} ${toDms(lng, lngHemi)}`

  // 3km consistency check against stored farm centroid
  let consistency = {
    distanceKm: 0,
    isConsistent: true,
    warning: null,
  }

  if (farmCentroid && typeof farmCentroid.lat === 'number' && typeof farmCentroid.lng === 'number') {
    const distMeters = getDistanceMeters([farmCentroid.lat, farmCentroid.lng], [lat, lng])
    const distKm = +(distMeters / 1000).toFixed(1)
    const isConsistent = distKm <= 3.0
    consistency = {
      distanceKm: distKm,
      isConsistent,
      warning: !isConsistent
        ? `Address and stored map boundary differ by ${distKm} km: please verify.`
        : null,
    }
  }

  return {
    ok: true,
    level: step.level,
    levelLabel: step.label,
    isApproximate: step.isApproximate,
    lat,
    lng,
    formattedDms,
    viewport: result.geometry.viewport || null,
    addressMatched: result.formatted_address || step.query,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    consistencyCheck: consistency,
  }
}
