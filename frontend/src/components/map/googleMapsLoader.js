/**
 * googleMapsLoader.js — Centralized Singleton Google Maps API Loader
 *
 * Loads Google Maps JavaScript API exactly ONCE across the application.
 * Utilizes @googlemaps/js-api-loader functional API (setOptions and importLibrary)
 * with required libraries (maps, marker, places, geometry).
 * Handles missing key, rejection (gm_authFailure), and graceful fallback states.
 */
import { setOptions, importLibrary } from '@googlemaps/js-api-loader'

let loadPromise = null
let authFailureDetected = false
let detectedApiErrorCode = null

// Intercept Google Maps errors and gm_authFailure callback
if (typeof window !== 'undefined') {
  const dismissGoogleErrorModals = () => {
    try {
      const errNodes = document.querySelectorAll(
        '.gm-err-container, .gm-err-content, div[class*="gm-err"], .degraded-map-dialog-view, div[class*="degraded-map"], div[role="alertdialog"]'
      )
      errNodes.forEach((node) => {
        node.style.display = 'none'
        node.style.visibility = 'hidden'
        node.style.opacity = '0'
        node.style.pointerEvents = 'none'
        node.remove()
      })
    } catch (e) {}
  }

  // Monitor DOM insertions to instantly remove any Google error dialog
  try {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const added of mutation.addedNodes) {
          if (added.nodeType === 1) {
            const isError =
              added.classList?.contains('gm-err-container') ||
              added.classList?.contains('gm-err-content') ||
              added.classList?.contains('degraded-map-dialog-view') ||
              added.getAttribute?.('role') === 'alertdialog' ||
              added.querySelector?.('.gm-err-container, .gm-err-content, .degraded-map-dialog-view, div[role="alertdialog"], a[href*="error-messages"]')
            if (isError) {
              added.style.display = 'none'
              added.style.visibility = 'hidden'
              added.style.opacity = '0'
              added.remove()
              dismissGoogleErrorModals()
            }
          }
        }
      }
    })
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true })
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, { childList: true, subtree: true })
      })
    }
  } catch (e) {}

  const originalAuthFailure = window.gm_authFailure
  window.gm_authFailure = () => {
    authFailureDetected = true
    dismissGoogleErrorModals()
    if (!detectedApiErrorCode) {
      detectedApiErrorCode = 'BillingNotEnabledMapError'
    }
    if (typeof originalAuthFailure === 'function') {
      originalAuthFailure()
    }
    window.dispatchEvent(
      new CustomEvent('agrimap:google-maps-auth-failure', {
        detail: { errorCode: detectedApiErrorCode },
      })
    )
  }

  // Intercept console.error for "Google Maps JavaScript API error:"
  const originalConsoleError = console.error
  console.error = function (...args) {
    if (args && args.length > 0 && typeof args[0] === 'string') {
      const match = args[0].match(/Google Maps JavaScript API error: ([A-Za-z0-9_]+)/)
      if (match) {
        detectedApiErrorCode = match[1]
        authFailureDetected = true
        dismissGoogleErrorModals()
        window.dispatchEvent(
          new CustomEvent('agrimap:google-maps-auth-failure', {
            detail: { errorCode: match[1] },
          })
        )
      }
    }
    originalConsoleError.apply(console, args)
  }
}

/**
 * Gets Google Maps API configuration from environment variables
 */
export function getGoogleMapsConfig() {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim()
  let mapId = (import.meta.env.VITE_GOOGLE_MAP_ID || '').trim()
  if (!mapId && import.meta.env.DEV) {
    mapId = 'DEMO_MAP_ID'
  }
  return { apiKey, mapId }
}

/**
 * Gets the detected Google Maps API error code, if any
 */
export function getDetectedApiErrorCode() {
  return detectedApiErrorCode
}

/**
 * Helper to get human-readable description and action steps for Google Maps errors
 */
export function getGoogleMapsErrorMessage(code) {
  switch (code) {
    case 'BillingNotEnabledMapError':
      return {
        title: 'Billing Not Enabled in Google Cloud',
        description:
          'Billing is not enabled on this Google Cloud project. Google Maps Platform requires an active billing account linked to the project to stream satellite imagery and cadastral vector tiles.',
        actionText: 'Enable Billing in Google Cloud',
        actionUrl: 'https://console.cloud.google.com/project/_/billing/enable',
      }
    case 'ApiNotActivatedMapError':
      return {
        title: 'Maps JavaScript API Not Activated',
        description:
          'The Maps JavaScript API has not been activated in the Google Cloud Console for this project.',
        actionText: 'Activate Maps JavaScript API',
        actionUrl: 'https://console.cloud.google.com/apis/library/maps-backend.googleapis.com',
      }
    case 'RefererNotAllowedMapError':
      return {
        title: 'HTTP Referrer Not Allowed',
        description:
          'The current website origin (http://127.0.0.1:5173/* or localhost) is not authorized in the API key restrictions in Google Cloud.',
        actionText: 'Update Key Restrictions',
        actionUrl: 'https://console.cloud.google.com/apis/credentials',
      }
    case 'InvalidKeyMapError':
      return {
        title: 'Invalid Maps API Key',
        description:
          'The API key specified in frontend/.env.local is unrecognized or has expired.',
        actionText: 'Review Google Cloud Credentials',
        actionUrl: 'https://console.cloud.google.com/apis/credentials',
      }
    default:
      return {
        title: 'Google Maps Account Configuration Required',
        description:
          'Google Maps requires billing enabled and active Maps JavaScript API permissions in Google Cloud. The cadastral twin, crop distribution, layer controls, and farmer change requests remain fully usable in offline cadastre mode.',
        actionText: 'Open Google Cloud Console',
        actionUrl: 'https://console.cloud.google.com/google/maps-apis/overview',
      }
  }
}

/**
 * Loads Google Maps API once and caches the promise
 */
export function loadGoogleMaps() {
  if (authFailureDetected) {
    return Promise.reject(new Error(detectedApiErrorCode || 'BillingNotEnabledMapError'))
  }

  if (typeof window !== 'undefined' && window.google?.maps?.Map) {
    return Promise.resolve(window.google)
  }

  if (loadPromise) {
    return loadPromise
  }

  const { apiKey } = getGoogleMapsConfig()
  if (!apiKey) {
    return Promise.reject(new Error('MissingKeyMapError'))
  }

  loadPromise = (async () => {
    try {
      setOptions({
        key: apiKey,
        v: 'weekly',
        loading: 'async',
      })

      await Promise.all([
        importLibrary('maps'),
        importLibrary('marker'),
        importLibrary('geometry'),
      ])

      if (authFailureDetected) {
        throw new Error(detectedApiErrorCode || 'BillingNotEnabledMapError')
      }

      return window.google
    } catch (err) {
      loadPromise = null
      throw new Error(detectedApiErrorCode || err.message || 'BillingNotEnabledMapError')
    }
  })()

  return loadPromise
}
