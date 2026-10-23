/**
 * ViewLocationModal.jsx — Admin Map Modal to View Pinned Locations
 *
 * Displays:
 * - Role-based marker (🌱 Sprout for Farmer, 👤 User for Customer, 🏪 Store for Dealer)
 * - Clean satellite map view
 * - Decimal and DMS coordinates with 1-click Copy
 * - Match level (Exact vs Approximate)
 * - Stored address and timestamp
 */
import React, { useEffect, useRef, useState } from 'react'
import { X, Copy, Check, MapPin, ExternalLink, Calendar, User, Shield } from 'lucide-react'
import { toDms } from '../../lib/coordinateParser'

export default function ViewLocationModal({ isOpen, onClose, item = null }) {
  const [copied, setCopied] = useState(false)
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)

  const location = item?.location || null

  useEffect(() => {
    if (!isOpen || !location) return

    let map = null
    const initMap = async () => {
      try {
        const L = (await import('leaflet')).default
        if (!mapContainerRef.current) return

        const lat = location.lat || 10.6585
        const lng = location.lng || 77.0125

        map = L.map(mapContainerRef.current, {
          center: [lat, lng],
          zoom: 16,
          zoomControl: true,
          attributionControl: false,
        })

        // Esri World Imagery (Clean Satellite)
        L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { maxZoom: 19 }
        ).addTo(map)

        const getMarkerColor = () => {
          if (item?.role === 'dealer') return '#F59E0B'
          if (item?.role === 'consumer') return '#3B82F6'
          return '#10B981'
        }

        const roleIcon = item?.role === 'dealer' ? '🏪' : item?.role === 'consumer' ? '👤' : '🌱'

        const customIcon = L.divIcon({
          className: 'agrimap-view-location-pin',
          html: `
            <div style="
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background: ${getMarkerColor()};
              border: 3px solid #FFFFFF;
              box-shadow: 0 4px 14px rgba(0,0,0,0.6);
              display: flex;
              align-items: center;
              justify-content: center;
              color: #FFFFFF;
              font-size: 18px;
            ">
              ${roleIcon}
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        })

        L.marker([lat, lng], { icon: customIcon }).addTo(map)
        mapInstanceRef.current = map
      } catch (err) {
        console.warn('[ViewLocationModal] Map initialization error:', err)
      }
    }

    initMap()

    return () => {
      if (map) {
        map.remove()
        mapInstanceRef.current = null
      }
    }
  }, [isOpen, location, item])

  if (!isOpen || !item || !location) return null

  const lat = location.lat || 10.6585
  const lng = location.lng || 77.0125
  const decString = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  const dmsString = `${toDms(lat, lat >= 0 ? 'N' : 'S')} ${toDms(lng, lng >= 0 ? 'E' : 'W')}`
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`

  const handleCopy = (text) => {
    try {
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {}
  }

  const roleLabel =
    item.role === 'dealer' ? 'Agri-Dealer' : item.role === 'consumer' ? 'Customer' : 'Farmer'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-[#1E1035] rounded-3xl max-w-lg w-full border border-gray-200 dark:border-purple-800/60 shadow-2xl overflow-hidden flex flex-col text-xs sm:text-sm animate-slide-up">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-purple-50/50 dark:bg-[#160A26]">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 border border-purple-300 dark:border-purple-700 flex items-center justify-center text-xl shadow-sm">
              {item.role === 'dealer' ? '🏪' : item.role === 'consumer' ? '👤' : '🌱'}
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
                  {item.full_name || item.email}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-v2v-deep dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  {roleLabel}
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                <MapPin size={12} className="text-[#8A57C0]" />
                <span>{item.address || item.area_place || location.address || 'Registered Location'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Map Canvas */}
        <div className="relative w-full h-[240px] bg-[#131313]">
          <div ref={mapContainerRef} className="w-full h-full" />
          <div className="absolute bottom-2 left-2 z-[1000] px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md text-white text-[10px] font-bold border border-white/20">
            Satellite View
          </div>
        </div>

        {/* Coordinates Details & Actions */}
        <div className="p-4 sm:p-5 space-y-3">
          <div className="p-3 rounded-2xl bg-gray-50 dark:bg-[#140D26] border border-gray-200 dark:border-purple-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-purple-300 tracking-wider">
                Pinned Coordinates
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                  location.approximate
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300'
                }`}
              >
                {location.matchLevel || 'Exact'} {location.approximate ? '(Approximate)' : ''}
              </span>
            </div>

            <div className="flex items-center justify-between font-mono text-xs sm:text-sm">
              <span className="text-gray-900 dark:text-white font-bold">{decString}</span>
              <button
                type="button"
                onClick={() => handleCopy(decString)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-purple-900/60 hover:bg-gray-100 text-gray-700 dark:text-purple-200 border border-gray-300 dark:border-purple-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="text-xs text-gray-500 dark:text-[#C9BDE6] font-mono">{dmsString}</div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
            <span>Source: <strong className="text-gray-700 dark:text-gray-300 capitalize">{location.source || 'coordinates'}</strong></span>
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8A57C0] dark:text-[#D9C7FF] font-semibold flex items-center gap-1 hover:underline"
            >
              <span>Open in Google Maps</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-gray-50 dark:bg-[#160A26] border-t border-gray-200 dark:border-gray-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
