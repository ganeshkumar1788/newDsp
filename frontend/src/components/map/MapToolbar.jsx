/**
 * MapToolbar.jsx — Professional Segmented Layer Toolbar & Map Controls
 *
 * Implements:
 * - Segmented layer chips (Boundary, Zones (n), Borewells (n), CCTV (n), Sensors (n), Power/Solar (n), Paths/Pipes (n))
 * - "All" and "None" shortcuts
 * - Map style switcher: Satellite, Roads, Clean, Terrain
 * - Custom navigation controls: Zoom in/out, Recenter, Fullscreen
 * - Farmer View-only lock badge & prominent "Request a change" CTA
 * - Touch-friendly scrolling on mobile, full WCAG AA contrast, aria-pressed attributes
 */
import React from 'react'
import {
  Shield,
  Sprout,
  Droplets,
  Video,
  Radio,
  Zap,
  Gauge,
  Route,
  Layers,
  Maximize2,
  Minimize2,
  Plus,
  Minus,
  LocateFixed,
  Lock,
  ChevronDown,
  Sparkles,
} from 'lucide-react'

export const LAYER_CONFIG = [
  { key: 'boundary', label: 'Boundary', icon: Shield },
  { key: 'zones', label: 'Zones', icon: Sprout, countKey: 'zonesCount' },
  { key: 'borewells', label: 'Borewells', icon: Droplets, countKey: 'borewellsCount' },
  { key: 'valves', label: 'Valves', icon: Gauge, countKey: 'valvesCount' },
  { key: 'cctv', label: 'CCTV', icon: Video, countKey: 'cctvCount' },
  { key: 'sensors', label: 'Sensors', icon: Radio, countKey: 'sensorsCount' },
  { key: 'power', label: 'Power/Solar', icon: Zap, countKey: 'powerCount' },
  { key: 'lines', label: 'Paths/Pipes', icon: Route, countKey: 'linesCount' },
]

export const MAP_STYLES = [
  { id: 'satellite', label: 'Satellite' },
  { id: 'roadmap', label: 'Roads' },
  { id: 'clean', label: 'Clean' },
  { id: 'terrain', label: 'Terrain' },
]

export default function MapToolbar({
  role = 'farmer',
  activeLayers = {},
  onToggleLayer,
  onSetAllLayers,
  counts = {},
  mapStyle = 'satellite',
  onChangeMapStyle,
  showLabels = false,
  onToggleLabels = null,
  isBackupMap = false,
  backupReason = null,
  onZoomIn,
  onZoomOut,
  onRecenter,
  isFullscreen = false,
  onToggleFullscreen,
  onRequestChange,
  isEditMode = false,
  onToggleEditMode,
  canEdit = false,
}) {
  const isFarmer = role === 'farmer'

  return (
    <div className="absolute top-3 inset-x-3 z-20 flex flex-col gap-2 pointer-events-none">
      {/* Top Bar: Role Status / Edit Mode & Primary Actions */}
      <div className="flex items-center justify-between gap-2">
        {/* Left: Map Style & Reset */}
        <div className="flex items-center gap-1.5 bg-[#131313]/90 dark:bg-[#1B1233]/90 backdrop-blur-md p-1 rounded-2xl border border-[#B890F9]/30 shadow-xl pointer-events-auto">
          {MAP_STYLES.map((style) => {
            const isSelected = mapStyle === style.id
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => onChangeMapStyle(style.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#8A57C0] text-white shadow-md shadow-[#8A57C0]/30 font-bold'
                    : 'text-[#C9BDE6] hover:text-white hover:bg-white/10'
                }`}
                aria-pressed={isSelected}
              >
                {style.label}
              </button>
            )
          })}

          {/* Optional Labels Chip (off by default) */}
          {onToggleLabels && (
            <button
              type="button"
              onClick={onToggleLabels}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                showLabels
                  ? 'bg-[#8A57C0]/40 text-[#E4DFEB] border-[#B890F9]/50 font-bold'
                  : 'bg-transparent text-[#9A8BC0] hover:text-white border-white/10 hover:border-white/20'
              }`}
              title="Toggle street and place labels on satellite map"
              aria-pressed={showLabels}
            >
              🏷️ Labels
            </button>
          )}

          {/* Backup Map Status Chip */}
          {isBackupMap && (
            <div
              className="px-2.5 py-1 rounded-xl bg-purple-900/40 border border-purple-500/40 text-[11px] font-medium text-purple-200 flex items-center gap-1.5 shadow-sm"
              title={backupReason || 'Backup map active (Esri World Imagery)'}
            >
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span>Backup map</span>
            </div>
          )}
        </div>

        {/* Right: Farmer CTA / Lock Badge OR Admin Edit Mode */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {isFarmer ? (
            <>
              {/* Lock Badge */}
              <div
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#131313]/90 backdrop-blur-md border border-[#B890F9]/30 text-xs font-semibold text-[#D9C7FF] shadow-lg"
                title="Your farm map is view-only. Use 'Request a change' to suggest boundary or device adjustments."
              >
                <Lock size={13} className="text-[#B890F9]" />
                <span>View-only</span>
              </div>

              {/* Request a Change CTA */}
              <button
                type="button"
                onClick={onRequestChange}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8A57C0] to-[#3C1775] hover:from-[#B890F9] hover:to-[#5E4678] text-white text-xs font-bold shadow-lg shadow-[#8A57C0]/35 flex items-center gap-2 transition-all transform active:scale-95 cursor-pointer border border-[#B890F9]/40"
                aria-label="Request a change to your farm"
              >
                <Sparkles size={14} className="text-[#F4F3F9] animate-pulse" />
                <span>Request a change</span>
              </button>
            </>
          ) : canEdit ? (
            <button
              type="button"
              onClick={onToggleEditMode}
              className={`px-4 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-2 transition-all cursor-pointer border ${
                isEditMode
                  ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-400/50 ring-2 ring-amber-400/30'
                  : 'bg-[#2A0C58]/95 hover:bg-[#3C1775] text-[#D9C7FF] border-[#B890F9]/30'
              }`}
            >
              <span>{isEditMode ? 'Exit Edit Mode' : '✏️ Enable Edit Mode'}</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Layer Chips Bar: Segmented Toolbar */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 pointer-events-auto">
        <div className="flex items-center gap-1.5 bg-[#131313]/90 dark:bg-[#1B1233]/90 backdrop-blur-md p-1.5 rounded-2xl border border-[#B890F9]/25 shadow-xl">
          {/* Shortcuts: All / None */}
          <div className="flex items-center border-r border-[#B890F9]/20 pr-1 mr-1 gap-1">
            <button
              type="button"
              onClick={() => onSetAllLayers(true)}
              className="px-2 py-1 text-[11px] font-bold text-[#D9C7FF] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Turn on all layers"
            >
              All
            </button>
            <button
              type="button"
              onClick={() => onSetAllLayers(false)}
              className="px-2 py-1 text-[11px] font-bold text-[#9A8BC0] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              title="Turn off all layers"
            >
              None
            </button>
          </div>

          {/* Layer Chips */}
          {LAYER_CONFIG.map(({ key, label, icon: IconComponent, countKey }) => {
            const count = counts[countKey]
            const hasCount = count !== undefined && count !== null
            const isActive = Boolean(activeLayers[key])

            return (
              <button
                key={key}
                type="button"
                onClick={() => onToggleLayer(key)}
                aria-pressed={isActive}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-[#8A57C0] text-white border-[#B890F9] shadow-sm shadow-[#8A57C0]/40'
                    : 'bg-transparent text-[#9A8BC0] hover:text-[#F4F3F9] border-white/10 hover:border-white/20'
                }`}
              >
                <IconComponent size={13} className={isActive ? 'text-white' : 'text-[#9A8BC0]'} />
                <span>{label}</span>
                {hasCount && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-white/25 text-white' : 'bg-white/10 text-[#C9BDE6]'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Floating Custom Map Navigation Controls (Top Right underneath primary actions) */}
      <div className="absolute right-0 top-14 flex flex-col gap-1.5 bg-[#131313]/90 dark:bg-[#1B1233]/90 backdrop-blur-md p-1 rounded-2xl border border-[#B890F9]/30 shadow-xl pointer-events-auto">
        <button
          type="button"
          onClick={onZoomIn}
          className="w-8 h-8 flex items-center justify-center text-[#D9C7FF] hover:text-white hover:bg-white/15 rounded-xl transition-all cursor-pointer"
          title="Zoom in"
          aria-label="Zoom in"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          className="w-8 h-8 flex items-center justify-center text-[#D9C7FF] hover:text-white hover:bg-white/15 rounded-xl transition-all cursor-pointer"
          title="Zoom out"
          aria-label="Zoom out"
        >
          <Minus size={16} />
        </button>
        <div className="h-px bg-white/15 mx-1" />
        <button
          type="button"
          onClick={onRecenter}
          className="w-8 h-8 flex items-center justify-center text-[#D9C7FF] hover:text-white hover:bg-white/15 rounded-xl transition-all cursor-pointer"
          title="Recentre on farm parcel"
          aria-label="Recentre on farm"
        >
          <LocateFixed size={16} />
        </button>
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="w-8 h-8 flex items-center justify-center text-[#D9C7FF] hover:text-white hover:bg-white/15 rounded-xl transition-all cursor-pointer"
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          aria-label="Toggle fullscreen"
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>
    </div>
  )
}
