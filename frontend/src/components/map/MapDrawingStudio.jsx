/**
 * MapDrawingStudio.jsx — Modern Spatial Boundary & Feature Editor (No Deprecated Drawing Library)
 *
 * Implements:
 * - Direct click listeners on Google Maps to collect points
 * - Draggable vertex handles for precise geometric adjustments
 * - Real-time area and perimeter calculations using project's existing geoUtils math
 * - Save confirmation modal showing detailed change summary (before vs after area, points added/removed)
 * - Audit log writer recording (who, when, farm, what changed)
 */
import React, { useState, useEffect, useRef } from 'react'
import {
  calculatePolygonArea,
  calculatePerimeter,
  calculatePathLength,
} from '../../lib/geoUtils'
import {
  Undo,
  Check,
  X,
  AlertTriangle,
  Save,
  Trash2,
  Maximize,
  Compass,
} from 'lucide-react'

export default function MapDrawingStudio({
  map,
  google,
  isActive = false,
  initialPoints = [], // array of [lat, lng] or {lat, lng}
  onSave,
  onCancel,
  farmId = 'field-1',
  farmerName = 'Ganesh V.',
  user = null,
}) {
  const [points, setPoints] = useState([])
  const [history, setHistory] = useState([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [auditNote, setAuditNote] = useState('')

  const markersRef = useRef([])
  const polylineRef = useRef(null)
  const polygonRef = useRef(null)

  // Normalize initial points to { lat, lng }
  useEffect(() => {
    if (!initialPoints || initialPoints.length === 0) return
    const normalized = initialPoints.map((p) => {
      if (Array.isArray(p)) return { lat: p[0], lng: p[1] }
      return { lat: p.lat, lng: p.lng }
    })
    setPoints(normalized)
    setHistory([normalized])
  }, [initialPoints])

  // Setup click listener on map to add points when in drawing mode
  useEffect(() => {
    if (!isActive || !map || !google) return

    const clickListener = map.addListener('click', (e) => {
      const newPt = { lat: e.latLng.lat(), lng: e.latLng.lng() }
      setPoints((prev) => {
        const next = [...prev, newPt]
        setHistory((h) => [...h, next])
        return next
      })
    })

    return () => {
      google.maps.event.removeListener(clickListener)
    }
  }, [isActive, map, google])

  // Render draggable vertex markers and live polygon overlay
  useEffect(() => {
    if (!map || !google) return

    // Clean up previous markers & overlays
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []
    if (polylineRef.current) polylineRef.current.setMap(null)
    if (polygonRef.current) polygonRef.current.setMap(null)

    if (!isActive || points.length === 0) return

    // Draw active polygon or polyline
    if (points.length >= 3) {
      polygonRef.current = new google.maps.Polygon({
        paths: points,
        strokeColor: '#B890F9',
        strokeOpacity: 0.9,
        strokeWeight: 2.5,
        fillColor: '#8A57C0',
        fillOpacity: 0.25,
        map,
        zIndex: 50,
      })
    } else if (points.length >= 2) {
      polylineRef.current = new google.maps.Polyline({
        path: points,
        strokeColor: '#B890F9',
        strokeOpacity: 0.9,
        strokeWeight: 2.5,
        map,
        zIndex: 50,
      })
    }

    // Draggable vertex markers
    points.forEach((pt, idx) => {
      const marker = new google.maps.Marker({
        position: pt,
        map,
        draggable: true,
        title: `Vertex #${idx + 1} (${pt.lat.toFixed(6)}, ${pt.lng.toFixed(6)})`,
        zIndex: 200,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 6,
          fillColor: idx === 0 ? '#10B981' : '#FFFFFF',
          fillOpacity: 1,
          strokeColor: '#3C1775',
          strokeWeight: 2.5,
        },
      })

      marker.addListener('drag', (e) => {
        const updated = [...points]
        updated[idx] = { lat: e.latLng.lat(), lng: e.latLng.lng() }
        setPoints(updated)
      })

      marker.addListener('dragend', (e) => {
        const updated = [...points]
        updated[idx] = { lat: e.latLng.lat(), lng: e.latLng.lng() }
        setPoints(updated)
        setHistory((h) => [...h, updated])
      })

      markersRef.current.push(marker)
    })

    return () => {
      markersRef.current.forEach((m) => m.setMap(null))
      markersRef.current = []
      if (polylineRef.current) polylineRef.current.setMap(null)
      if (polygonRef.current) polygonRef.current.setMap(null)
    }
  }, [isActive, points, map, google])

  if (!isActive) return null

  // Live Area & Perimeter calculations from geoUtils
  const pointPairs = points.map((p) => [p.lat, p.lng])
  const area = calculatePolygonArea(pointPairs)
  const perimeter = calculatePerimeter(pointPairs)

  const initialPairs = (initialPoints || []).map((p) => (Array.isArray(p) ? p : [p.lat, p.lng]))
  const initialArea = calculatePolygonArea(initialPairs)

  const handleUndo = () => {
    if (history.length <= 1) return
    const nextHistory = history.slice(0, -1)
    setHistory(nextHistory)
    setPoints(nextHistory[nextHistory.length - 1] || [])
  }

  const handleClear = () => {
    setPoints([])
    setHistory([[]])
  }

  const handleConfirmSave = () => {
    // Record audit log entry in dedicated localStorage audit log
    const auditEntry = {
      id: `audit-${Date.now()}`,
      timestamp: new Date().toISOString(),
      farmId,
      farmerName,
      actor: user?.full_name || 'Admin',
      role: user?.role || 'admin',
      action: 'BOUNDARY_REVISION',
      beforeAreaAcres: initialArea.acres,
      afterAreaAcres: area.acres,
      beforePointsCount: initialPairs.length,
      afterPointsCount: points.length,
      note: auditNote || 'Manual boundary vertex adjustment via Land & Boundary Studio.',
    }

    try {
      const existingRaw = localStorage.getItem('agrimap.auditLog.v1')
      const existing = existingRaw ? JSON.parse(existingRaw) : []
      localStorage.setItem('agrimap.auditLog.v1', JSON.stringify([auditEntry, ...existing]))
    } catch (e) {
      console.warn('[MapDrawingStudio] Failed to write audit log:', e)
    }

    setShowConfirmModal(false)
    if (typeof onSave === 'function') {
      onSave(points, auditEntry)
    }
  }

  return (
    <>
      {/* Floating Drawing Studio Control Card (Top Center) */}
      <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-30 pointer-events-auto">
        <div className="bg-[#131313]/95 dark:bg-[#1B1233]/95 backdrop-blur-md px-4 py-3 rounded-2xl border border-amber-500/50 shadow-2xl flex flex-wrap items-center gap-4 text-white">
          <div className="flex items-center gap-2 border-r border-white/20 pr-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Drawing Studio Active
            </span>
          </div>

          {/* Live Geodesic Stats */}
          <div className="flex items-center gap-3 text-xs font-mono">
            <div>
              <span className="text-gray-400 text-[10px] block">MAPPED AREA:</span>
              <strong className="text-white text-xs">{area.acres} ac ({area.hectares} ha)</strong>
            </div>
            <div className="h-6 w-px bg-white/15" />
            <div>
              <span className="text-gray-400 text-[10px] block">PERIMETER:</span>
              <strong className="text-white text-xs">{perimeter.meters} m</strong>
            </div>
            <div className="h-6 w-px bg-white/15" />
            <div>
              <span className="text-gray-400 text-[10px] block">VERTICES:</span>
              <strong className="text-[#D9C7FF] text-xs">{points.length} pts</strong>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length <= 1}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#D9C7FF] disabled:opacity-40 transition-colors cursor-pointer"
              title="Undo last vertex"
            >
              <Undo size={14} />
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 transition-colors cursor-pointer"
              title="Clear all vertices"
            >
              <Trash2 size={14} />
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={points.length < 3}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Save size={13} />
              <span>Save Changes</span>
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 transition-colors cursor-pointer"
              title="Cancel drawing"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Save Confirmation & Audit Summary Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-[#131313] dark:bg-[#1B1233] border border-[#B890F9]/30 rounded-2xl p-6 max-w-md w-full shadow-2xl text-white space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Boundary Revision</h3>
                <p className="text-xs text-[#C9BDE6]">
                  A permanent audit log entry will be created for this spatial adjustment.
                </p>
              </div>
            </div>

            {/* Change Summary Table */}
            <div className="bg-[#241845] rounded-xl p-3 border border-[#B890F9]/20 text-xs space-y-2">
              <div className="flex justify-between items-center pb-1.5 border-b border-white/10">
                <span className="text-[#C9BDE6]">Target Parcel:</span>
                <span className="font-bold text-white">{farmId} ({farmerName})</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#C9BDE6]">Mapped Area (Before):</span>
                <span className="font-mono text-gray-300">{initialArea.acres} ac ({initialArea.hectares} ha)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#C9BDE6]">Mapped Area (After):</span>
                <span className="font-mono text-emerald-400 font-bold">{area.acres} ac ({area.hectares} ha)</span>
              </div>
              <div className="flex justify-between items-center pt-1.5 border-t border-white/10">
                <span className="text-[#C9BDE6]">Boundary Vertices:</span>
                <span className="font-mono text-[#D9C7FF]">{initialPairs.length} pts → {points.length} pts</span>
              </div>
            </div>

            {/* Audit Note Input */}
            <div>
              <label className="block text-xs font-semibold text-[#D9C7FF] mb-1">
                Audit Reason / Reference Note:
              </label>
              <input
                type="text"
                value={auditNote}
                onChange={(e) => setAuditNote(e.target.value)}
                placeholder="e.g. Field verification survey match with Patta sub-division"
                className="w-full bg-[#1B1233] border border-[#B890F9]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#B890F9]"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                Confirm & Commit Revision
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
