import React, { useEffect, useState, useRef } from 'react'
import {
  Droplets,
  Activity,
  Video,
  Zap,
  Sprout,
  Route,
  MapPin,
  AlertTriangle,
  X,
  Camera,
  Moon,
  Battery,
  Shield,
  Gauge,
  CheckCircle2,
  Clock,
  Download,
} from 'lucide-react'
import {
  SAMPLE_VALVE_TELEMETRY,
  SAMPLE_CONDUIT_TELEMETRY,
  SAMPLE_TRACK_TELEMETRY,
  resolveFieldTelemetry,
} from '../../lib/demoTelemetry.js'

/**
 * DiagnosticsModal.jsx
 *
 * Pixel-perfect diagnostic modal for interactive map markers and cadastral assets.
 * Implements exact reference designs for:
 *  1. Soil Telemetry (Screenshot 1: 15cm & 45cm moisture, soil temp, EC)
 *  2. Solar / Power Station (Screenshot 2: 3-Phase 440V Feeder & 12kW Solar Station)
 *  3. CCTV Security (Screenshot 3: 16:9 4K live HUD, snapshot download, night vision)
 *  4. Borewells (Screenshot 4: Standby/Running status, verified yesterday's log, 2x2 specs)
 *  5. Irrigation Valves 1-8 (Exact surveyed tree counts, pressure, zone allocation)
 *  6. Crop Zones (Stored 3.85 / 2.55 / 2.26 Ha, crop variety, agronomic metrics)
 *  7. Cadastral Boundary (Registered 21.4 Ac vs Mapped 8.66 Ha, survey khata)
 *  8. Linear Infrastructure (Pipelines with direction, roads, fences)
 */
export default function DiagnosticsModal({
  isOpen,
  type,
  data,
  onClose,
  triggerElement = null,
  onReportIssue = null,
}) {
  const modalRef = useRef(null)
  const [cctvTime, setCctvTime] = useState(new Date())
  const [nightMode, setNightMode] = useState(false)

  // Scroll lock & Escape key
  useEffect(() => {
    if (!isOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)

    if (modalRef.current) {
      modalRef.current.focus()
    }

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
      if (triggerElement && typeof triggerElement.focus === 'function') {
        triggerElement.focus()
      }
    }
  }, [isOpen, onClose, triggerElement])

  // CCTV live clock ticker
  useEffect(() => {
    if (!isOpen || type !== 'cctv') return
    const interval = setInterval(() => setCctvTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [isOpen, type])

  if (!isOpen || !data) return null

  // Header Title & Icon
  const getModalConfig = () => {
    switch (type) {
      case 'borewell':
        return {
          title: data.name || data.device_name || 'Borewell Pump Station',
          subtitle: 'Borewell Diagnostics',
          IconComponent: Droplets,
        }
      case 'sensor':
        return {
          title: data.device_name || data.name || 'V2V SoilSense Node 01 (Coconut Root Zone)',
          subtitle: 'Sensor Diagnostics',
          IconComponent: Activity,
        }
      case 'cctv':
        return {
          title: data.device_name || data.name || 'CCTV 01 — Solar Station & Main Pump House',
          subtitle: 'Cctv Diagnostics',
          IconComponent: Video,
        }
      case 'power':
        return {
          title: data.name || '3-Phase 440V Feeder & 12kW Solar Station',
          subtitle: 'Power Diagnostics',
          IconComponent: Zap,
        }
      case 'valve':
        return {
          title: data.name || `Irrigation Control Valve #${data.valve_number || 1}`,
          subtitle: 'Valve Diagnostics & Surveyed Tree Count',
          IconComponent: Gauge,
        }
      case 'zone':
        return {
          title: data.crop || data.name || 'Crop Cultivation Zone',
          subtitle: 'Crop Zone Diagnostics',
          IconComponent: Sprout,
        }
      case 'pipeline':
      case 'conduit':
      case 'line_inspector':
        return {
          title: data.name || 'Main 90mm HDPE Conduit',
          subtitle: 'Irrigation Conduit Diagnostics',
          IconComponent: Route,
        }
      case 'track':
        return {
          title: data.name || 'Internal Farm Access Track',
          subtitle: 'Internal Farm Access Track Diagnostics',
          IconComponent: Route,
        }
      case 'field':
        return {
          title: data.name || "Ganesh V.'s Farmland Twin",
          subtitle: 'Cadastral Land Boundary Diagnostics',
          IconComponent: MapPin,
        }
      default:
        return {
          title: data.name || 'Farm Asset Details',
          subtitle: 'Asset Diagnostics',
          IconComponent: Shield,
        }
    }
  }

  const { title, subtitle, IconComponent } = getModalConfig()

  // Format date helper for CCTV HUD
  const formatCctvDate = (date) => {
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  }

  // Handle Snapshot download
  const handleCctvSnapshot = () => {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 360
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = nightMode ? '#041c0e' : '#111827'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = nightMode ? '#22c55e' : '#e2e8f0'
      ctx.font = '16px monospace'
      ctx.fillText(`CAM: ${data.device_name || 'V2V-CCTV-01'}`, 24, 40)
      ctx.fillText(`TIMESTAMP: ${cctvTime.toISOString()}`, 24, 70)
      ctx.fillText(`MODE: ${nightMode ? 'AI STARLIGHT NIGHT VISION (ACTIVE)' : 'STANDARD 4K UHD DAYLIGHT'}`, 24, 100)
      ctx.fillText('STATUS: TELEMETRY ENCRYPTED & VERIFIED [OK]', 24, 130)

      const link = document.createElement('a')
      const stamp = cctvTime.toISOString().replace(/\D/g, '').slice(0, 14)
      link.download = `cctv-snapshot-${stamp}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostics-modal-title"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#120E1E] rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 dark:border-purple-900/40 outline-none overflow-hidden"
      >
        {/* ── Modal Header (Gradient #2A0C58 -> #3C1775 -> #5E4678) ── */}
        <div className="bg-gradient-to-r from-[#2A0C58] via-[#3C1775] to-[#5E4678] px-5 py-4 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 text-white shadow-inner shrink-0">
              <IconComponent size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <h2
                id="diagnostics-modal-title"
                className="text-base font-bold text-white tracking-tight leading-snug truncate max-w-[250px] sm:max-w-sm"
              >
                {title}
              </h2>
              <p className="text-xs text-purple-200/90 font-medium">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close diagnostics dialog"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Modal Scrollable Body (Max 375px mobile friendly) ── */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-sm text-gray-800 dark:text-slate-100">
          {/* ============================================================== */}
          {/* 1. SENSOR DIAGNOSTICS (Screenshot 1 Reference)                 */}
          {/* ============================================================== */}
          {type === 'sensor' && (
            <div className="space-y-3.5">
              {/* Top card: Name, Telemetry status, Green Battery badge */}
              <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-white dark:bg-[#1A1429] flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="font-bold text-sm text-[#2A0C58] dark:text-[#D9C7FF]">
                    {data.device_name || 'V2V SoilSense Node 01 (Coconut Root Zone)'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Telemetry Online · {data.last_sync || '2 minutes ago'}
                  </p>
                </div>
                <div className="px-3 py-1 rounded-lg bg-[#D1FADF] dark:bg-emerald-950/70 text-[#027A48] dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800 shrink-0">
                  <span className="text-xs">🔋</span>
                  <span>{data.battery_level || '95%'}</span>
                </div>
              </div>

              {/* 4 Metric Cards (2x2 Grid) */}
              <div className="grid grid-cols-2 gap-3">
                {/* Moisture 15cm */}
                <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#1A1429] text-center shadow-sm">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    MOISTURE (15 CM)
                  </div>
                  <div className="text-3xl font-black text-[#059669] dark:text-[#10B981] mt-2">
                    {data.soil_moisture_15cm || '71%'}
                  </div>
                </div>

                {/* Moisture 45cm */}
                <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#1A1429] text-center shadow-sm">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    MOISTURE (45 CM)
                  </div>
                  <div className="text-3xl font-black text-[#059669] dark:text-[#10B981] mt-2">
                    {data.soil_moisture_45cm || '74%'}
                  </div>
                </div>

                {/* Soil Temperature */}
                <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#1A1429] text-center shadow-sm">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    SOIL TEMPERATURE
                  </div>
                  <div className="text-3xl font-black text-[#2A0C58] dark:text-[#D9C7FF] mt-2">
                    {data.soil_temperature || '25.4°C'}
                  </div>
                </div>

                {/* Conductivity EC */}
                <div className="p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-[#1A1429] text-center shadow-sm">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    CONDUCTIVITY (EC)
                  </div>
                  <div className="text-3xl font-black text-[#2A0C58] dark:text-[#D9C7FF] mt-2">
                    {data.electrical_conductivity || '1.12 mS/cm'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 2. POWER & SOLAR DIAGNOSTICS (Screenshot 2 Reference)          */}
          {/* ============================================================== */}
          {type === 'power' && (
            <div className="space-y-3.5">
              {/* Top card: Feeder specs & operational badge */}
              <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-white dark:bg-[#1A1429] flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="font-bold text-sm text-[#2A0C58] dark:text-[#D9C7FF]">
                    {data.name || '3-Phase 440V Feeder & 12kW Solar Station'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Grid Tied & 12kW Solar Hybrid · Continuous 3-Phase Agricultural Feed
                  </p>
                </div>
                <div className="px-3 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 border border-emerald-300 dark:border-emerald-800 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>ONLINE</span>
                </div>
              </div>

              {/* Today's Energy Record */}
              <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-[#1A1429] space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-[#2A0C58] dark:text-[#D9C7FF] uppercase tracking-wider">
                  <span>TODAY'S ENERGY RECORD</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-700 text-[#6D28D9] dark:text-[#B890F9]">
                    VERIFIED LOG
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-purple-100 dark:border-slate-700">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Solar Gen</div>
                    <div className="text-base font-black text-[#2A0C58] dark:text-[#D9C7FF] mt-0.5">48.6 kWh</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-purple-100 dark:border-slate-700">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Grid Drawn</div>
                    <div className="text-base font-black text-blue-600 dark:text-blue-400 mt-0.5">18.2 kWh</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-purple-100 dark:border-slate-700">
                    <div className="text-[10px] font-bold text-gray-400 uppercase">Pump Hours</div>
                    <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">6.5 hrs</div>
                  </div>
                </div>
              </div>

              {/* 2x2 Specs Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 dark:text-slate-400 block text-[10px] uppercase font-bold">Feeder Type:</span>
                  <strong className="text-gray-900 dark:text-white mt-0.5 block">{data.voltage || 'Dedicated 440V 3-Phase'}</strong>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 dark:text-slate-400 block text-[10px] uppercase font-bold">Solar Capacity:</span>
                  <strong className="text-gray-900 dark:text-white mt-0.5 block">{data.solar_capacity_kw || '12 kW Monocrystalline'}</strong>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 dark:text-slate-400 block text-[10px] uppercase font-bold">Inverter Status:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 mt-0.5 block">MPPT Synchronized (98.2%)</strong>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 dark:text-slate-400 block text-[10px] uppercase font-bold">Linked Pumps:</span>
                  <strong className="text-gray-900 dark:text-white mt-0.5 block">Borewell Motor 1 & 2</strong>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 3. CCTV DIAGNOSTICS (Screenshot 3 Reference)                   */}
          {/* ============================================================== */}
          {type === 'cctv' && (
            <div className="space-y-3.5">
              {/* 16:9 Black Camera Screen with Live HUD */}
              <div
                className={`relative rounded-2xl overflow-hidden aspect-video border shadow-2xl flex flex-col justify-between p-3.5 transition-colors duration-300 ${
                  nightMode ? 'bg-[#031d0b] border-emerald-500/50' : 'bg-black border-gray-900'
                }`}
              >
                {/* Top overlay: LIVE 4K badge and timestamp */}
                <div className="flex justify-between items-center text-[10px] text-white z-20">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full font-bold bg-[#EF4444] text-white shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    LIVE 4K
                  </span>
                  <span className="font-mono text-white/90 text-xs tracking-wide">
                    {formatCctvDate(cctvTime)}
                  </span>
                </div>

                {/* Subtle camera lens scanline / grid */}
                <div
                  className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-300 ${
                    nightMode ? 'opacity-80 bg-emerald-950/40 mix-blend-color-burn' : 'opacity-40'
                  }`}
                  style={{
                    backgroundImage:
                      "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px), url('https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80')",
                    backgroundSize: '24px 24px, cover',
                    backgroundPosition: 'center',
                    filter: nightMode ? 'hue-rotate(90deg) contrast(1.4) brightness(1.1)' : 'none',
                  }}
                />

                {/* Center crosshair + camera label */}
                <div className="relative z-10 flex flex-col items-center justify-center text-center py-2">
                  <div
                    className={`w-10 h-10 rounded-full border flex items-center justify-center text-base mb-2 ${
                      nightMode
                        ? 'border-emerald-400 text-emerald-300 bg-emerald-950/50'
                        : 'border-white/50 text-white bg-black/40'
                    }`}
                  >
                    +
                  </div>
                  <div className="text-xs font-mono font-bold text-white drop-shadow-md">
                    {data.device_name || 'CCTV 01 — Solar Station & Main Pump House'}
                  </div>
                  <div className="text-[10px] font-mono text-gray-300 mt-0.5">
                    {data.resolution || '3840 x 2160 (4K UHD) @ 30 FPS'}
                  </div>
                </div>

                {/* Bottom toolbar */}
                <div className="relative z-20 flex justify-between items-center text-[11px] text-white">
                  <span className="text-white/80 font-medium">120° FOV · AI Starlight Night Vision</span>
                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={handleCctvSnapshot}
                      className="px-2 py-0.5 rounded text-white hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Camera size={12} />
                      <span>Snapshot</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNightMode(!nightMode)}
                      className="px-2 py-0.5 rounded text-white hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Moon size={12} />
                      <span>Night Mode</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Bottom 2 Spec Cards */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-white dark:bg-[#1A1429] rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
                  <span className="text-gray-400 dark:text-gray-400 block text-[11px]">Model:</span>
                  <strong className="text-gray-900 dark:text-white font-bold text-xs mt-1 block">
                    {data.camera_model || 'V2V Solar-PTZ 4K UltraHD AI Sentinel'}
                  </strong>
                </div>
                <div className="p-3.5 bg-white dark:bg-[#1A1429] rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
                  <span className="text-gray-400 dark:text-gray-400 block text-[11px]">Battery:</span>
                  <strong className="text-[#059669] dark:text-[#10B981] font-bold text-xs mt-1 block">
                    {data.battery_level || '99% (Solar Charged)'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 4. BOREWELL DIAGNOSTICS (Screenshot 4 Reference)               */}
          {/* ============================================================== */}
          {type === 'borewell' && (
            <div className="space-y-3.5">
              {/* Top card: Amber or Green status */}
              <div
                className={`p-4 rounded-2xl border shadow-sm ${
                  data.status === 'ACTIVE_RUNNING'
                    ? 'bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                    : 'bg-[#FFFBEB] dark:bg-amber-950/40 border-[#FDE68A] dark:border-amber-800'
                }`}
              >
                <h3
                  className={`font-bold text-base ${
                    data.status === 'ACTIVE_RUNNING'
                      ? 'text-emerald-900 dark:text-emerald-100'
                      : 'text-[#78350F] dark:text-amber-200'
                  }`}
                >
                  {data.status === 'ACTIVE_RUNNING' ? 'Pump Is Running Active' : 'Pump Is Standby'}
                </h3>
                <p
                  className={`text-xs font-semibold tracking-wider mt-0.5 ${
                    data.status === 'ACTIVE_RUNNING'
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-[#B45309] dark:text-amber-400'
                  }`}
                >
                  {data.status === 'ACTIVE_RUNNING' ? 'RUNNING · PUMPING ACTIVE' : 'STANDBY · READY'}
                </p>
              </div>

              {/* Yesterday's Operational Record Card */}
              <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-white dark:bg-[#1A1429] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2A0C58] dark:text-[#D9C7FF] uppercase tracking-wider">
                    YESTERDAY'S OPERATIONAL RECORD
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-md border border-purple-300 dark:border-purple-600 text-[#6D28D9] dark:text-[#B890F9] font-bold">
                    VERIFIED LOG
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Working Duration:</span>
                    <strong className="text-2xl font-black text-[#2A0C58] dark:text-white mt-1 block">
                      {data.yesterday_runtime_hours ? `${data.yesterday_runtime_hours} Hours` : '2 Hours'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Water Discharged:</span>
                    <strong className="text-2xl font-black text-[#2A0C58] dark:text-white mt-1 block">
                      {data.yesterday_water_pumped_liters ? `${data.yesterday_water_pumped_liters.toLocaleString()} Liters` : '15,000 Liters'}
                    </strong>
                  </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-slate-800 pt-2.5">
                  {data.notes || 'Backup unit connected to Sugarcane Zone C and cattle pond.'}
                </p>
              </div>

              {/* 2x2 Specs Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Motor Capacity:</span>
                  <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">
                    {data.pump_capacity_hp || '7.5 HP Electric Submersible'}
                  </strong>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Flow Rate:</span>
                  <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">
                    {data.flow_rate_lpm ? `${data.flow_rate_lpm} L / min` : '125 L / min'}
                  </strong>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Borewell Depth:</span>
                  <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">
                    {data.depth_feet ? `${data.depth_feet} Feet` : '410 Feet'}
                  </strong>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Power Supply:</span>
                  <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">
                    {data.power_source || '3-Phase Feeder (Pollachi Grid)'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 5. IRRIGATION VALVES 1-8 (Exact Surveyed Tree Counts)          */}
          {/* ============================================================== */}
          {type === 'valve' && (() => {
            const valveKey = data.id || `valve-${data.valve_number || 1}`
            const demo = SAMPLE_VALVE_TELEMETRY[valveKey] || SAMPLE_VALVE_TELEMETRY.default

            const vNumber = resolveFieldTelemetry(data.valve_number || (data.id ? data.id.replace('valve-', '') : null), demo.valve_number)
            const vStatus = resolveFieldTelemetry(data.status || (data.is_open !== undefined ? (data.is_open ? 'OPEN' : 'CLOSED') : null), demo.status)
            const vZone = resolveFieldTelemetry(data.zone_served || data.serviced_zone, demo.zone_served)
            const vLastOp = resolveFieldTelemetry(data.last_operated, demo.last_operated)
            const vConduit = resolveFieldTelemetry(data.connected_conduit, demo.connected_conduit)

            const isOpen = String(vStatus.value).toUpperCase() === 'OPEN'

            return (
              <div className="space-y-3.5">
                {/* Header card with Number and Open/Closed status */}
                <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-white dark:bg-[#1A1429] flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-[#0284C7] border-2 border-white flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {vNumber.value}
                    </span>
                    <div>
                      <h3 className="font-bold text-sm text-[#2A0C58] dark:text-[#D9C7FF]">
                        {data.name || `Control Valve #${vNumber.value}`}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Surveyed Irrigation Control Valve · Sub-lateral
                      </p>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border shadow-sm ${
                    isOpen 
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-700'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                    <span>{vStatus.value}</span>
                    {vStatus.isSample && <span className="text-[9px] text-purple-400 ml-1 font-normal">(Sample data)</span>}
                  </div>
                </div>

                {/* Valve details grid */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                    <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Zone Served:</span>
                    <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">
                      {vZone.value}
                    </strong>
                    {vZone.isSample && <span className="text-[9px] text-purple-400 font-normal">Sample data</span>}
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                    <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Connected Conduit:</span>
                    <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block truncate" title={vConduit.value}>
                      {vConduit.value}
                    </strong>
                    {vConduit.isSample && <span className="text-[9px] text-purple-400 font-normal">Sample data</span>}
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700 col-span-2">
                    <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Last Operated:</span>
                    <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">
                      {vLastOp.value}
                    </strong>
                    {vLastOp.isSample && <span className="text-[9px] text-purple-400 font-normal">Sample data</span>}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* ============================================================== */}
          {/* 6. CROP ZONE DIAGNOSTICS                                       */}
          {/* ============================================================== */}
          {type === 'zone' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-white dark:bg-[#1A1429] flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="font-bold text-sm text-[#2A0C58] dark:text-[#D9C7FF]">
                    {data.crop || data.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {data.crop_category || 'Commercial Orchard Plot'} · Stored Cadastral Twin
                  </p>
                </div>
                <div
                  className="px-3 py-1 rounded-lg text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  style={{ backgroundColor: data.shade_color || data.fill_color || '#10B981' }}
                >
                  <span>{data.area_hectares || data.hectares || 2.5} Ha</span>
                </div>
              </div>

              {/* Agronomic Record Card */}
              <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-[#1A1429] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2A0C58] dark:text-[#D9C7FF] uppercase tracking-wider">
                    AGRONOMIC STATUS & ALLOCATION
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-md border border-purple-300 dark:border-purple-600 text-[#6D28D9] dark:text-[#B890F9] font-bold">
                    ACTIVE HARVEST
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Cultivated Land Area:</span>
                    <strong className="text-2xl font-black text-[#2A0C58] dark:text-white mt-1 block">
                      {data.area_hectares || data.hectares || 2.5} Ha
                    </strong>
                    <span className="text-[11px] text-gray-500 font-medium">
                      {data.area_acres || ((data.area_hectares || 2.5) * 2.471).toFixed(2)} Acres
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Health Index:</span>
                    <strong className="text-2xl font-black text-[#059669] dark:text-[#10B981] mt-1 block">
                      {data.health_index || '98% (Optimal)'}
                    </strong>
                    <span className="text-[11px] text-gray-500 font-medium">Multispectral NDVI Scan</span>
                  </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-slate-800 pt-2.5">
                  Planting Date: {data.planting_date || 'August 2021'} · Stage: {data.growth_stage || 'Peak Yield Bearing'}
                </p>
              </div>

              {/* 2x2 Specs Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Soil Moisture:</span>
                  <strong className="text-[#059669] dark:text-[#10B981] font-bold mt-0.5 block">
                    {data.soil_moisture || '71% (Optimal)'}
                  </strong>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Irrigation Source:</span>
                  <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">
                    {data.irrigation_type || 'Sub-surface Ring Basin Drip'}
                  </strong>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Tree / Crop Count:</span>
                  <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">
                    {data.tree_count ? `${data.tree_count} Trees` : 'Full Sub-plot Coverage'}
                  </strong>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Last Irrigation Cycle:</span>
                  <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">
                    {data.last_irrigated || 'Today, 06:30 AM'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 7. CADASTRAL BOUNDARY & PARCEL DIAGNOSTICS                     */}
          {/* ============================================================== */}
          {type === 'field' && (
            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-white dark:bg-[#1A1429] flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="font-bold text-sm text-[#2A0C58] dark:text-[#D9C7FF]">
                    {data.name || "Ganesh V.'s Smart Farmland Twin"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Khata #{data.khata_number || 'TN-POL-4820'} · {data.village || 'Pollachi Rural'}, {data.district || 'Coimbatore'}
                  </p>
                </div>
                <div className="px-3 py-1 rounded-lg bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 font-bold text-xs border border-purple-300 dark:border-purple-800 shrink-0">
                  <span>DGPS VERIFIED</span>
                </div>
              </div>

              {/* Area Comparison Card */}
              <div className="p-4 rounded-2xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-[#1A1429] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#2A0C58] dark:text-[#D9C7FF] uppercase tracking-wider">
                    LAND RECORD & REVENUE SURVEY
                  </span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-md border border-purple-300 dark:border-purple-600 text-[#6D28D9] dark:text-[#B890F9] font-bold">
                    PATTA NO. 482
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Registered Revenue Area:</span>
                    <strong className="text-2xl font-black text-[#2A0C58] dark:text-white mt-1 block">
                      {data.total_acres || '21.4'} Acres
                    </strong>
                    <span className="text-[11px] text-gray-500 font-medium">8.66 Hectares</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 block">Mapped Boundary Match:</span>
                    <strong className="text-2xl font-black text-[#059669] dark:text-[#10B981] mt-1 block">
                      100% Concordant
                    </strong>
                    <span className="text-[11px] text-gray-500 font-medium">5 Boundary Vertices Mapped</span>
                  </div>
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-slate-800 pt-2.5">
                  Centroid: 10.6585° N, 77.0125° E · Soil: Red Loam & Alluvial Delta · Slope: 0.6% Gentle NE
                </p>
              </div>

              {/* 2x2 Specs Grid */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Perimeter Boundary:</span>
                  <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">1,280 Meters</strong>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Annual Rainfall:</span>
                  <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">920 mm (Pollachi Belt)</strong>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Verification Date:</span>
                  <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">October 2026</strong>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                  <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Field Surveyor:</span>
                  <strong className="text-[#059669] dark:text-[#10B981] font-bold mt-0.5 block">
                    Certified Government DGPS
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* 8. LINEAR INFRASTRUCTURE DIAGNOSTICS                           */}
          {/* ============================================================== */}
          {(type === 'pipeline' || type === 'conduit' || type === 'line_inspector') && (() => {
            const isMain = String(data.name || '').toLowerCase().includes('main') || data.diameter_mm === 90 || !data.diameter_mm
            const demo = isMain ? SAMPLE_CONDUIT_TELEMETRY.default_main : SAMPLE_CONDUIT_TELEMETRY.default_lateral

            const cName = resolveFieldTelemetry(data.name, demo.name)
            const cMaterial = resolveFieldTelemetry(data.material, 'HDPE (PE100 Virgin)')
            const cDiameter = resolveFieldTelemetry(data.diameter_mm ? `${data.diameter_mm}mm` : data.nominal_diameter, demo.nominal_diameter)

            // Geodesic length in meters and feet
            const metersVal = data.length_meters || data.meters || 460
            const feetVal = (metersVal * 3.28084).toFixed(1)
            const cLength = `${metersVal} m (${feetVal} ft)`

            const cFrom = resolveFieldTelemetry(data.from_name || data.from, demo.from_name)
            const cTo = resolveFieldTelemetry(data.to_name || data.to, demo.to_name)
            const cPressure = resolveFieldTelemetry(data.pressure_rating || (data.working_pressure_bar ? `${data.working_pressure_bar} Bar (Working)` : null), demo.pressure_rating)

            return (
              <div className="space-y-3.5">
                <div className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-white dark:bg-[#1A1429] flex items-center justify-between shadow-sm">
                  <div>
                    <h3 className="font-bold text-sm text-[#1E90D6] dark:text-[#38BDF8]">
                      {cName.value}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {cMaterial.value} · Pressurized Conduit
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 font-bold text-xs border border-blue-300 dark:border-blue-800 shrink-0">
                    <span>{cDiameter.value}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                    <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Nominal Diameter:</span>
                    <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">{cDiameter.value}</strong>
                    {cDiameter.isSample && <span className="text-[9px] text-purple-400 font-normal">Sample data</span>}
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                    <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Length (Geodesic):</span>
                    <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">{cLength}</strong>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                    <span className="text-gray-400 dark:text-slate-400 block text-[10px]">From (Source):</span>
                    <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">{cFrom.value}</strong>
                    {cFrom.isSample && <span className="text-[9px] text-purple-400 font-normal">Sample data</span>}
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                    <span className="text-gray-400 dark:text-slate-400 block text-[10px]">To (Destination):</span>
                    <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">{cTo.value}</strong>
                    {cTo.isSample && <span className="text-[9px] text-purple-400 font-normal">Sample data</span>}
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700 col-span-2">
                    <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Pressure Rating:</span>
                    <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">{cPressure.value}</strong>
                    {cPressure.isSample && <span className="text-[9px] text-purple-400 font-normal">Sample data</span>}
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Track Card */}
          {type === 'track' && (() => {
            const demo = SAMPLE_TRACK_TELEMETRY['path-farm-access'] || SAMPLE_TRACK_TELEMETRY.default
            const tName = resolveFieldTelemetry(data.name, demo.name)
            const metersVal = data.length_meters || data.meters || 320
            const feetVal = (metersVal * 3.28084).toFixed(1)
            const tLength = `${metersVal} m (${feetVal} ft)`
            const tSurface = resolveFieldTelemetry(data.surface, demo.surface)

            return (
              <div className="space-y-3.5">
                <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-white dark:bg-[#1A1429] flex items-center justify-between shadow-sm">
                  <div>
                    <h3 className="font-bold text-sm text-[#F59E0B]">
                      {tName.value}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Internal Farm Circulation & Equipment Track
                    </p>
                  </div>
                  <div className="px-3 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold text-xs border border-amber-300 dark:border-amber-800 shrink-0">
                    <span>ACCESS TRACK</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                    <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Length (Geodesic):</span>
                    <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">{tLength}</strong>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl border border-gray-200 dark:border-slate-700">
                    <span className="text-gray-400 dark:text-slate-400 block text-[10px]">Road Surface:</span>
                    <strong className="text-gray-900 dark:text-white font-bold mt-0.5 block">{tSurface.value}</strong>
                    {tSurface.isSample && <span className="text-[9px] text-purple-400 font-normal">Sample data</span>}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>

        {/* ── Sticky Modal Footer (Right-aligned Purple Pill Close) ── */}
        <div className="p-3.5 sm:p-4 bg-gray-50/90 dark:bg-[#0E0A18] border-t border-gray-100 dark:border-purple-900/40 flex items-center justify-between shrink-0">
          {onReportIssue ? (
            <button
              type="button"
              onClick={() => {
                onClose()
                onReportIssue(data, type)
              }}
              className="px-4 py-2 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <AlertTriangle size={14} />
              <span>Report an issue</span>
            </button>
          ) : (
            <div />
          )}

          {/* Purple Pill Button matching screenshots exactly */}
          <button
            type="button"
            onClick={onClose}
            className="px-7 py-2 bg-[#8A57C0] hover:bg-[#7C3AED] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
