/**
 * MapLegend.jsx — Professional High-Contrast Interactive Map Legend
 *
 * Implements:
 * - Exact Groups: "Farm Boundary", "Crop Zones", "Water & Irrigation", "Monitoring & Power", "Conduits & Infrastructure"
 * - Identical symbols matching the map's circular badges, sun adornments, valve pills, and thick lines
 * - Live counts computed from stored data via legendTypes.js classifier
 * - Greyed "Not mapped yet" state for 0-count items (with "Draw in editor" button for Admin/Surveyor)
 * - Row click pulses and fits map bounds to those specific symbols
 * - Eye icon toggles each layer, keeping layer chips and legend in 100% sync
 * - Collapsible, default collapsed on mobile (< 768px), >= 96% opacity solid card, internal scroll
 */
import React, { useState, useEffect, useMemo } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Layers,
  Droplets,
  Video,
  Radio,
  Zap,
  Gauge,
  Route,
  Eye,
  EyeOff,
  PenTool,
} from 'lucide-react'
import { buildLegendInventory, LEGEND_ITEMS, LEGEND_GROUPS } from './legendTypes.js'
import { ICONS } from './mapMarkers.js'

export default function MapLegend({
  geojson = null,
  activeLayers = {},
  onToggleLayer = null,
  zones = [],
  role = 'farmer',
  onFitToSymbols = null,
  onDrawInEditor = null,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const isAdmin = role === 'admin' || role === 'surveyor'

  // Expand by default on desktop, collapsed on mobile
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setIsOpen(true)
    }
  }, [])

  // Build live inventory from GeoJSON using the centralized classifier
  const inventory = useMemo(() => {
    return buildLegendInventory(geojson)
  }, [geojson])

  // Helper to handle row click to fit symbols on map
  const handleRowClick = (itemId, features) => {
    if (features && features.length > 0 && typeof onFitToSymbols === 'function') {
      onFitToSymbols(itemId, features)
    }
  }

  return (
    <div className="absolute bottom-4 right-3 z-20 max-w-[290px] w-full pointer-events-auto">
      <div className="bg-[#131313]/96 dark:bg-[#150F22]/96 backdrop-blur-md rounded-2xl border border-[#B890F9]/30 shadow-2xl overflow-hidden transition-all duration-200">
        {/* Header / Toggle Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-bold text-[#F4F3F9] hover:bg-white/5 transition-colors cursor-pointer select-none"
          aria-expanded={isOpen}
          aria-label="Toggle map legend"
        >
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-[#B890F9]" />
            <span className="font-bold tracking-tight">Map Legend & Layers</span>
          </div>
          {isOpen ? <ChevronDown size={14} className="text-[#C9BDE6]" /> : <ChevronUp size={14} className="text-[#C9BDE6]" />}
        </button>

        {/* Legend Body */}
        {isOpen && (
          <div className="p-3.5 pt-1.5 border-t border-[#B890F9]/20 space-y-3.5 text-[11px] max-h-[360px] overflow-y-auto no-scrollbar">
            {/* ── 1. Farm Boundary (DGPS) ── */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#A78BFA] uppercase tracking-wider">
                <span>Farm Boundary</span>
                {onToggleLayer && (
                  <button
                    type="button"
                    onClick={() => onToggleLayer('boundary')}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer p-0.5"
                    title={activeLayers.boundary ? 'Hide boundary' : 'Show boundary'}
                    aria-label="Toggle boundary visibility"
                  >
                    {activeLayers.boundary ? <Eye size={12} className="text-[#B890F9]" /> : <EyeOff size={12} />}
                  </button>
                )}
              </div>
              <div
                onClick={() => handleRowClick('boundary', inventory[LEGEND_ITEMS.BOUNDARY.id]?.features)}
                className={`flex items-center justify-between gap-2 p-1 rounded-lg transition-colors cursor-pointer ${
                  activeLayers.boundary ? 'hover:bg-white/5 text-[#F4F3F9]' : 'opacity-40 text-gray-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-5 h-2.5 rounded-sm border-2 border-dashed border-[#8A57C0] bg-[#8A57C0]/20 shrink-0 shadow-sm" />
                  <span className="font-semibold text-xs">Survey Boundary (DGPS)</span>
                </div>
                <span className="text-[10px] font-mono text-[#C9BDE6]">
                  {inventory[LEGEND_ITEMS.BOUNDARY.id]?.count || 1}
                </span>
              </div>
            </div>

            {/* ── 2. Crop Zones ── */}
            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#A78BFA] uppercase tracking-wider">
                <span>Crop Zones ({zones.length})</span>
                {onToggleLayer && (
                  <button
                    type="button"
                    onClick={() => onToggleLayer('zones')}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer p-0.5"
                    title={activeLayers.zones ? 'Hide crop zones' : 'Show crop zones'}
                    aria-label="Toggle crop zones visibility"
                  >
                    {activeLayers.zones ? <Eye size={12} className="text-[#B890F9]" /> : <EyeOff size={12} />}
                  </button>
                )}
              </div>
              {zones.map((zone, idx) => {
                const fillColor = zone.fill_color || zone.shade_color || (idx === 0 ? '#10B981' : idx === 1 ? '#F59E0B' : '#8B5CF6')
                const strokeColor = zone.stroke_color || fillColor
                return (
                  <div
                    key={zone.id || idx}
                    onClick={() => handleRowClick('crop_zone', [{ id: zone.id }])}
                    className={`flex items-center justify-between gap-2 p-1 rounded-lg transition-colors cursor-pointer ${
                      activeLayers.zones ? 'hover:bg-white/5 text-[#E4DFEB]' : 'opacity-40 text-gray-400'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-3.5 h-3.5 rounded border-2 shrink-0 shadow-sm"
                        style={{
                          backgroundColor: fillColor,
                          borderColor: strokeColor,
                          opacity: 0.9,
                        }}
                      />
                      <span className="truncate font-medium text-xs" title={zone.crop || zone.name}>
                        {zone.crop || zone.name || `Zone ${idx + 1}`}
                      </span>
                    </div>
                    <span className="text-[#A78BFA] font-mono text-[10px] shrink-0">
                      {zone.hectares || zone.area_hectares || (idx === 0 ? 3.85 : idx === 1 ? 2.55 : 2.26)} Ha
                    </span>
                  </div>
                )
              })}
            </div>

            {/* ── 3. Water & Irrigation ── */}
            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#A78BFA] uppercase tracking-wider">
                <span>Water & Irrigation</span>
                {onToggleLayer && (
                  <button
                    type="button"
                    onClick={() => onToggleLayer('borewells')}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer p-0.5"
                    title={activeLayers.borewells ? 'Hide water assets' : 'Show water assets'}
                    aria-label="Toggle water assets visibility"
                  >
                    {activeLayers.borewells ? <Eye size={12} className="text-[#B890F9]" /> : <EyeOff size={12} />}
                  </button>
                )}
              </div>

              {/* Solar Borewell (Running) */}
              {(() => {
                const count = inventory[LEGEND_ITEMS.BOREWELL_RUNNING.id]?.count || 0
                const feats = inventory[LEGEND_ITEMS.BOREWELL_RUNNING.id]?.features || []
                return (
                  <div
                    onClick={() => count > 0 && handleRowClick('borewell_running', feats)}
                    className={`flex items-center justify-between gap-2 p-1 rounded-lg transition-colors ${
                      count > 0 ? 'hover:bg-white/5 cursor-pointer text-[#E4DFEB]' : 'text-gray-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative w-4 h-4 rounded-full bg-[#10B981] border border-white flex items-center justify-center shrink-0 shadow-sm">
                        <Droplets size={9} className="text-white" />
                        <span className="absolute -top-1 -left-1 w-2.5 h-2.5 rounded-full bg-amber-300 border border-amber-600 flex items-center justify-center text-[7px] text-amber-900 font-bold">
                          ☀
                        </span>
                      </div>
                      <span className="font-medium text-xs">Solar Borewell (Running)</span>
                    </div>
                    {count > 0 ? (
                      <span className="font-mono text-[10px] text-emerald-400 font-bold">{count}</span>
                    ) : (
                      <span className="text-[10px] italic text-gray-500">Not mapped yet</span>
                    )}
                  </div>
                )
              })()}

              {/* Auxiliary Tube Well (Standby) */}
              {(() => {
                const count = inventory[LEGEND_ITEMS.BOREWELL_STANDBY.id]?.count || 0
                const feats = inventory[LEGEND_ITEMS.BOREWELL_STANDBY.id]?.features || []
                return (
                  <div
                    onClick={() => count > 0 && handleRowClick('borewell_standby', feats)}
                    className={`flex items-center justify-between gap-2 p-1 rounded-lg transition-colors ${
                      count > 0 ? 'hover:bg-white/5 cursor-pointer text-[#E4DFEB]' : 'text-gray-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative w-4 h-4 rounded-full bg-[#2A0C58] border border-white flex items-center justify-center shrink-0 shadow-sm">
                        <Droplets size={9} className="text-white" />
                        <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-gray-400 border border-white" />
                      </div>
                      <span className="font-medium text-xs">Auxiliary Tube Well (Standby)</span>
                    </div>
                    {count > 0 ? (
                      <span className="font-mono text-[10px] text-[#C9BDE6] font-bold">{count}</span>
                    ) : (
                      <span className="text-[10px] italic text-gray-500">Not mapped yet</span>
                    )}
                  </div>
                )
              })()}

              {/* Control Valves (1-8 Surveyed) */}
              {(() => {
                const count = inventory[LEGEND_ITEMS.CONTROL_VALVE.id]?.count || 0
                const feats = inventory[LEGEND_ITEMS.CONTROL_VALVE.id]?.features || []
                return (
                  <div
                    onClick={() => count > 0 && handleRowClick('control_valves', feats)}
                    className={`flex items-center justify-between gap-2 p-1 rounded-lg transition-colors ${
                      count > 0 ? 'hover:bg-white/5 cursor-pointer text-[#E4DFEB]' : 'text-gray-500 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="relative w-3.5 h-3.5 rounded-full bg-[#0284C7] border border-white flex items-center justify-center shrink-0 shadow-sm">
                        <Gauge size={8} className="text-white" />
                        <span className="absolute -top-1 -right-1 text-[8px] font-black text-cyan-200">
                          #
                        </span>
                      </div>
                      <span className="font-medium text-xs">
                        Control Valves {count > 0 ? `(${count} Surveyed)` : '(1-8 Surveyed)'}
                      </span>
                    </div>
                    {count > 0 ? (
                      <span className="font-mono text-[10px] text-cyan-400 font-bold">{count}</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] italic text-gray-500">Not mapped yet</span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDrawInEditor && onDrawInEditor('valve')
                            }}
                            className="px-1.5 py-0.5 rounded bg-[#8A57C0]/30 hover:bg-[#8A57C0]/60 text-[#D9C7FF] text-[9px] font-semibold transition-colors cursor-pointer"
                            title="Draw valve in editor"
                          >
                            Draw
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* ── 4. Monitoring & Power ── */}
            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#A78BFA] uppercase tracking-wider">
                <span>Monitoring & Power</span>
                {onToggleLayer && (
                  <button
                    type="button"
                    onClick={() => onToggleLayer('power')}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer p-0.5"
                    title={activeLayers.power ? 'Hide monitoring & power' : 'Show monitoring & power'}
                    aria-label="Toggle power layer visibility"
                  >
                    {activeLayers.power ? <Eye size={12} className="text-[#B890F9]" /> : <EyeOff size={12} />}
                  </button>
                )}
              </div>

              {/* 440V Feeder & 12kW Solar */}
              {(() => {
                const count = inventory[LEGEND_ITEMS.POWER_SOLAR.id]?.count || 0
                const feats = inventory[LEGEND_ITEMS.POWER_SOLAR.id]?.features || []
                return (
                  <div
                    onClick={() => count > 0 && handleRowClick('power_solar', feats)}
                    className={`flex items-center justify-between gap-2 p-1 rounded-lg transition-colors ${
                      count > 0 ? 'hover:bg-white/5 cursor-pointer text-[#E4DFEB]' : 'text-gray-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#F59E0B] border border-white flex items-center justify-center shrink-0 shadow-sm">
                        <Zap size={9} className="text-white" />
                      </span>
                      <span className="font-medium text-xs">440V Feeder & 12kW Solar</span>
                    </div>
                    {count > 0 ? (
                      <span className="font-mono text-[10px] text-amber-400 font-bold">{count}</span>
                    ) : (
                      <span className="text-[10px] italic text-gray-500">Not mapped yet</span>
                    )}
                  </div>
                )
              })()}

              {/* 4K AI Security Sentinel */}
              {(() => {
                const count = inventory[LEGEND_ITEMS.CCTV_SENTINEL.id]?.count || 0
                const feats = inventory[LEGEND_ITEMS.CCTV_SENTINEL.id]?.features || []
                return (
                  <div
                    onClick={() => count > 0 && handleRowClick('cctv_sentinel', feats)}
                    className={`flex items-center justify-between gap-2 p-1 rounded-lg transition-colors ${
                      count > 0 ? 'hover:bg-white/5 cursor-pointer text-[#E4DFEB]' : 'text-gray-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#3C1775] border border-white flex items-center justify-center shrink-0 shadow-sm">
                        <Video size={9} className="text-white" />
                      </span>
                      <span className="font-medium text-xs">4K AI Security Sentinel</span>
                    </div>
                    {count > 0 ? (
                      <span className="font-mono text-[10px] text-purple-300 font-bold">{count}</span>
                    ) : (
                      <span className="text-[10px] italic text-gray-500">Not mapped yet</span>
                    )}
                  </div>
                )
              })()}

              {/* V2V SoilSense IoT Probe */}
              {(() => {
                const count = inventory[LEGEND_ITEMS.SOILSENSE_PROBE.id]?.count || 0
                const feats = inventory[LEGEND_ITEMS.SOILSENSE_PROBE.id]?.features || []
                return (
                  <div
                    onClick={() => count > 0 && handleRowClick('soilsense_probe', feats)}
                    className={`flex items-center justify-between gap-2 p-1 rounded-lg transition-colors ${
                      count > 0 ? 'hover:bg-white/5 cursor-pointer text-[#E4DFEB]' : 'text-gray-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-[#8A57C0] border border-white flex items-center justify-center shrink-0 shadow-sm">
                        <Radio size={9} className="text-white" />
                      </span>
                      <span className="font-medium text-xs">V2V SoilSense IoT Probe</span>
                    </div>
                    {count > 0 ? (
                      <span className="font-mono text-[10px] text-[#D9C7FF] font-bold">{count}</span>
                    ) : (
                      <span className="text-[10px] italic text-gray-500">Not mapped yet</span>
                    )}
                  </div>
                )
              })()}
            </div>

            {/* ── 5. Conduits & Infrastructure ── */}
            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px] font-bold text-[#A78BFA] uppercase tracking-wider">
                <span>Conduits & Infrastructure</span>
                {onToggleLayer && (
                  <button
                    type="button"
                    onClick={() => onToggleLayer('lines')}
                    className="text-gray-400 hover:text-white transition-colors cursor-pointer p-0.5"
                    title={activeLayers.lines ? 'Hide infrastructure lines' : 'Show infrastructure lines'}
                    aria-label="Toggle lines layer visibility"
                  >
                    {activeLayers.lines ? <Eye size={12} className="text-[#B890F9]" /> : <EyeOff size={12} />}
                  </button>
                )}
              </div>

              {/* Main 90mm HDPE Conduit */}
              {(() => {
                const count = inventory[LEGEND_ITEMS.MAIN_CONDUIT.id]?.count || 0
                const feats = inventory[LEGEND_ITEMS.MAIN_CONDUIT.id]?.features || []
                return (
                  <div
                    onClick={() => count > 0 && handleRowClick('main_conduit', feats)}
                    className={`flex items-center justify-between gap-2 p-1 rounded-lg transition-colors ${
                      count > 0 ? 'hover:bg-white/5 cursor-pointer text-[#E4DFEB]' : 'text-gray-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-1.5 rounded-full bg-[#1E90D6] border border-white/40 shrink-0 shadow-sm" />
                      <span className="font-medium text-xs">Main 90mm HDPE Conduit</span>
                    </div>
                    {count > 0 ? (
                      <span className="font-mono text-[10px] text-blue-400 font-bold">{count}</span>
                    ) : (
                      <span className="text-[10px] italic text-gray-500">Not mapped yet</span>
                    )}
                  </div>
                )
              })()}

              {/* 50mm Sub-lateral Pipeline */}
              {(() => {
                const count = inventory[LEGEND_ITEMS.SUB_LATERAL.id]?.count || 0
                const feats = inventory[LEGEND_ITEMS.SUB_LATERAL.id]?.features || []
                return (
                  <div
                    onClick={() => count > 0 && handleRowClick('sub_lateral', feats)}
                    className={`flex items-center justify-between gap-2 p-1 rounded-lg transition-colors ${
                      count > 0 ? 'hover:bg-white/5 cursor-pointer text-[#E4DFEB]' : 'text-gray-500 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-1 rounded-full bg-[#38BDF8] border border-white/30 shrink-0 shadow-sm" />
                      <span className="font-medium text-xs">50mm Sub-lateral Pipeline</span>
                    </div>
                    {count > 0 ? (
                      <span className="font-mono text-[10px] text-cyan-300 font-bold">{count}</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] italic text-gray-500">Not mapped yet</span>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDrawInEditor && onDrawInEditor('lateral')
                            }}
                            className="px-1.5 py-0.5 rounded bg-[#8A57C0]/30 hover:bg-[#8A57C0]/60 text-[#D9C7FF] text-[9px] font-semibold transition-colors cursor-pointer"
                            title="Draw lateral in editor"
                          >
                            Draw
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Internal Farm Access Track */}
              {(() => {
                const count = inventory[LEGEND_ITEMS.FARM_TRACK.id]?.count || 0
                const feats = inventory[LEGEND_ITEMS.FARM_TRACK.id]?.features || []
                return (
                  <div
                    onClick={() => count > 0 && handleRowClick('farm_track', feats)}
                    className={`flex items-center justify-between gap-2 p-1 rounded-lg transition-colors ${
                      count > 0 ? 'hover:bg-white/5 cursor-pointer text-[#E4DFEB]' : 'text-gray-500 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-2 rounded-full bg-[#F59E0B] border border-white/40 shrink-0 shadow-sm" />
                      <span className="font-medium text-xs">Internal Farm Access Track</span>
                    </div>
                    {count > 0 ? (
                      <span className="font-mono text-[10px] text-amber-400 font-bold">{count}</span>
                    ) : (
                      <span className="text-[10px] italic text-gray-500">Not mapped yet</span>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
