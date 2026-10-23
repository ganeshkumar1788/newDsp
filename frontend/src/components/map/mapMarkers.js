/**
 * mapMarkers.js — Pin-Style SVG Advanced Markers with Status Dots & Overlap Nudging
 *
 * Implements professional pin-style SVG badges for Google Maps Advanced Markers.
 * Each pin consists of a circular badge with an SVG icon, white border, soft drop shadow,
 * a small downward pointer tail anchored at the bottom tip (anchor: [width/2, height]),
 * and a status dot (Active/Online, Standby, Pressurized).
 *
 * Color specifications & z-index hierarchy:
 * - Power / Solar: Amber (#F59E0B), z-index: 45
 * - CCTV: Royal Violet (#3C1775), z-index: 40
 * - IoT Sensor: Electric Purple (#8A57C0), z-index: 30
 * - Irrigation Valves 1-8: Electric Violet (#7C3AED), z-index: 25
 * - Borewell Running: Emerald (#10B981), z-index: 20
 * - Borewell Standby: Deep Violet (#2A0C58), z-index: 20
 * - Zone labels: z-index: 10
 */import { V2V_COLORS } from './mapStyles.js'
import { classifyFeature, LEGEND_ITEMS } from './legendTypes.js'

// SVG Icon Paths (Lucide-based vector paths)
export const ICONS = {
  borewell: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 12a3 3 0 0 0 3-3" fill="none" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round"/>',
  sun: '<circle cx="6" cy="6" r="2.5" fill="#F59E0B" stroke="#FFFFFF" stroke-width="1"/><path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11M2.5 2.5l1 1M8.5 8.5l1 1M2.5 9.5l1-1M8.5 3.5l1-1" stroke="#F59E0B" stroke-width="1"/>',
  cctv: '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="2" y="6" width="14" height="12" rx="2" fill="none" stroke="#FFFFFF" stroke-width="2"/>',
  sensor: '<path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="2" fill="#FFFFFF"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/><path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>',
  power: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  valve: '<circle cx="12" cy="12" r="3" fill="#FFFFFF"/><path d="M4 12h5m6 0h5M12 4v5m0 6v5" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="7" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>',
}

/**
 * Determines device classification, marker color, icon, status dot, and adornments.
 */
export function getDeviceStyle(feature) {
  const props = feature?.properties || {}
  const { item, featureName } = classifyFeature(feature)

  // 1. Solar Borewell (Running)
  if (item.id === LEGEND_ITEMS.BOREWELL_RUNNING.id) {
    return {
      type: 'borewell',
      legendId: item.id,
      label: featureName || 'Solar Borewell (Running)',
      bg: '#10B981',
      icon: ICONS.borewell,
      hasSunCorner: true,
      hasNumberPill: false,
      statusDot: '#10B981',
      statusText: 'Running · Active Flow',
      zIndex: 35,
      size: 40,
    }
  }

  // 2. Auxiliary Tube Well (Standby)
  if (item.id === LEGEND_ITEMS.BOREWELL_STANDBY.id) {
    return {
      type: 'borewell',
      legendId: item.id,
      label: featureName || 'Auxiliary Tube Well (Standby)',
      bg: '#2A0C58',
      icon: ICONS.borewell,
      hasSunCorner: false,
      hasNumberPill: false,
      statusDot: '#9CA3AF',
      statusText: 'Standby · Ready',
      zIndex: 34,
      size: 40,
    }
  }

  // 3. Control Valves (1-8 Surveyed)
  if (item.id === LEGEND_ITEMS.CONTROL_VALVE.id) {
    const valveNum = props.valve_number || (props.id ? parseInt(props.id.replace(/\D/g, ''), 10) : null) || 1
    return {
      type: 'valve',
      legendId: item.id,
      label: featureName || `Control Valve #${valveNum}`,
      bg: '#0284C7',
      icon: ICONS.valve,
      hasSunCorner: false,
      hasNumberPill: true,
      valveNumber: valveNum,
      statusDot: '#10B981',
      statusText: `${props.tree_count || props.allocated_trees || 36} Trees (2.4 Bar)`,
      zIndex: 30,
      size: 32,
    }
  }

  // 4. Power / Solar (440V Feeder & 12kW Solar)
  if (item.id === LEGEND_ITEMS.POWER_SOLAR.id) {
    return {
      type: 'power',
      legendId: item.id,
      label: featureName || '440V Feeder & 12kW Solar Station',
      bg: '#F59E0B',
      icon: ICONS.power,
      hasSunCorner: false,
      hasNumberPill: false,
      statusDot: '#10B981',
      statusText: 'Active / 440V Grid',
      zIndex: 45,
      size: 40,
    }
  }

  // 5. 4K AI Security Sentinel
  if (item.id === LEGEND_ITEMS.CCTV_SENTINEL.id) {
    return {
      type: 'cctv',
      legendId: item.id,
      label: featureName || '4K AI Security Sentinel',
      bg: '#3C1775',
      icon: ICONS.cctv,
      hasSunCorner: false,
      hasNumberPill: false,
      statusDot: '#10B981',
      statusText: 'Online 4K · Active',
      zIndex: 40,
      size: 40,
    }
  }

  // 6. V2V SoilSense IoT Probe
  if (item.id === LEGEND_ITEMS.SOILSENSE_PROBE.id) {
    return {
      type: 'sensor',
      legendId: item.id,
      label: featureName || 'V2V SoilSense IoT Probe',
      bg: '#8A57C0',
      icon: ICONS.sensor,
      hasSunCorner: false,
      hasNumberPill: false,
      statusDot: '#10B981',
      statusText: 'Online (95%)',
      zIndex: 32,
      size: 40,
    }
  }

  // Fallback device / unclassified
  return {
    type: 'sensor',
    legendId: item.id || 'unclassified',
    label: featureName || 'Farm Infrastructure Asset',
    bg: '#6B7280',
    icon: ICONS.sensor,
    hasSunCorner: false,
    hasNumberPill: false,
    statusDot: '#9CA3AF',
    statusText: 'Active',
    zIndex: 15,
    size: 40,
  }
}

/**
 * Creates DOM content element for Google AdvancedMarkerElement.
 * Features a circular badge with icon, 2.5px white border, soft drop shadow,
 * optional sun badge on corner for Solar Borewell, and optional number pill for valves.
 */
export function createAdvancedMarkerElement({ feature, onClick, zoom = 16 }) {
  const style = getDeviceStyle(feature)
  // Large circular badges: 40px at fitted zoom (32px for valves, 34-44px based on zoom)
  const baseSize = style.size === 32 ? 32 : (zoom >= 17 ? 44 : zoom <= 15 ? 34 : 40)

  const container = document.createElement('div')
  container.className = 'agrimap-advanced-marker group'
  container.style.position = 'relative'
  container.style.cursor = 'pointer'
  container.style.outline = 'none'
  container.style.userSelect = 'none'
  // Center exactly on coordinate
  container.style.transform = 'translate(-50%, -50%)'
  container.tabIndex = 0
  container.setAttribute('role', 'button')
  container.setAttribute('aria-label', `${style.label} (${style.statusText}). Open details`)

  // Circular Badge
  const badge = document.createElement('div')
  badge.style.width = `${baseSize}px`
  badge.style.height = `${baseSize}px`
  badge.style.borderRadius = '50%'
  badge.style.backgroundColor = style.bg
  badge.style.border = '2.5px solid rgba(255, 255, 255, 0.95)'
  badge.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0,0,0,0.15)'
  badge.style.display = 'flex'
  badge.style.alignItems = 'center'
  badge.style.justifyContent = 'center'
  badge.style.position = 'relative'
  badge.style.transition = 'transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 180ms ease'

  // Icon SVG
  const iconSize = Math.round(baseSize * 0.55)
  badge.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24">
      ${style.icon}
    </svg>
    ${style.hasSunCorner ? `
      <span style="
        position: absolute;
        top: -4px;
        left: -4px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background-color: #FEF3C7;
        border: 1.5px solid #F59E0B;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 3px rgba(0,0,0,0.4);
      ">
        <svg width="10" height="10" viewBox="0 0 12 12">${ICONS.sun}</svg>
      </span>
    ` : ''}
    ${style.hasNumberPill ? `
      <span style="
        position: absolute;
        top: -5px;
        right: -5px;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: 999px;
        background-color: #38BDF8;
        color: #032136;
        font-size: 10px;
        font-weight: 800;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1.5px solid #FFFFFF;
        box-shadow: 0 1px 4px rgba(0,0,0,0.5);
      ">${style.valveNumber || 1}</span>
    ` : ''}
    ${style.statusDot ? `
      <span style="
        position: absolute;
        bottom: 0px;
        right: 0px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: ${style.statusDot};
        border: 2px solid #FFFFFF;
        box-shadow: 0 1px 4px rgba(0,0,0,0.5);
      "></span>
    ` : ''}
  `

  // Tooltip Element
  const tooltip = document.createElement('div')
  tooltip.className = 'agrimap-marker-tooltip'
  tooltip.style.position = 'absolute'
  tooltip.style.bottom = `${baseSize + 10}px`
  tooltip.style.left = '50%'
  tooltip.style.transform = 'translateX(-50%)'
  tooltip.style.backgroundColor = '#131313'
  tooltip.style.color = '#F4F3F9'
  tooltip.style.border = '1px solid rgba(184, 144, 249, 0.5)'
  tooltip.style.borderRadius = '8px'
  tooltip.style.padding = '5px 9px'
  tooltip.style.fontSize = '11px'
  tooltip.style.fontWeight = '500'
  tooltip.style.whiteSpace = 'nowrap'
  tooltip.style.pointerEvents = 'none'
  tooltip.style.opacity = '0'
  tooltip.style.transition = 'opacity 150ms ease, transform 150ms ease'
  tooltip.style.boxShadow = '0 6px 16px rgba(0,0,0,0.7)'
  tooltip.style.zIndex = '9999'
  tooltip.innerHTML = `
    <div style="font-weight: 700; color: #FFFFFF;">${style.label}</div>
    <div style="font-size: 10px; color: ${style.statusDot}; font-weight: 600; margin-top: 1px;">● ${style.statusText}</div>
  `

  container.appendChild(badge)
  container.appendChild(tooltip)

  // Hover & Focus effects
  const showTooltip = () => {
    tooltip.style.opacity = '1'
    tooltip.style.transform = 'translateX(-50%) translateY(-2px)'
    badge.style.transform = 'scale(1.15)'
    badge.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.7), 0 0 0 3px #B890F9'
  }

  const hideTooltip = () => {
    tooltip.style.opacity = '0'
    tooltip.style.transform = 'translateX(-50%)'
    badge.style.transform = 'scale(1)'
    badge.style.boxShadow = '0 4px 14px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(0,0,0,0.15)'
  }

  container.addEventListener('mouseenter', showTooltip)
  container.addEventListener('mouseleave', hideTooltip)
  container.addEventListener('focus', showTooltip)
  container.addEventListener('blur', hideTooltip)

  // Click & Keyboard Enter
  const triggerClick = (e) => {
    e.stopPropagation()
    if (typeof onClick === 'function') {
      onClick(feature)
    }
  }

  container.addEventListener('click', triggerClick)
  container.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      triggerClick(e)
    }
  })

  return { container, style }
}

/**
 * Creates fallback standard Google Maps Marker icon with bottom pointer tail
 */
export function createPinMarkerIcon(google, style, zoom = 16) {
  if (!google || !google.maps) return null
  const baseSize = zoom >= 17 ? 44 : zoom <= 15 ? 34 : 40
  const width = baseSize
  const height = baseSize
  const r = (baseSize - 4) / 2
  const cx = width / 2
  const cy = height / 2

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${style.bg}" stroke="#FFFFFF" stroke-width="2.5" />
    <circle cx="${cx + r - 3}" cy="${cy + r - 3}" r="4" fill="${style.statusDot}" stroke="#FFFFFF" stroke-width="1.5" />
  </svg>`

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(width, height),
    anchor: new google.maps.Point(width / 2, height / 2),
  }
}

/**
 * Render-time overlap nudging.
 * Checks pairwise distance and nudges close markers slightly (render-time only, never modifying stored coordinates).
 */
export function nudgeOverlappingPositions(items, zoom = 16) {
  if (!items || items.length === 0) return []
  // Threshold in degrees approx ~28px at zoom level
  const thresholdDeg = 0.00028 * Math.pow(2, 16 - Math.min(Math.max(zoom, 10), 20))
  const positions = items.map((item, idx) => {
    const lat = item.position.lat
    const lng = item.position.lng
    return { ...item, originalLat: lat, originalLng: lng, nudgedLat: lat, nudgedLng: lng, idx }
  })

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const p1 = positions[i]
      const p2 = positions[j]
      const dLat = p1.nudgedLat - p2.nudgedLat
      const dLng = p1.nudgedLng - p2.nudgedLng
      const dist = Math.sqrt(dLat * dLat + dLng * dLng)
      if (dist < thresholdDeg) {
        // Nudge p2 slightly along radial offset
        const angle = ((i + j) % 8) * (Math.PI / 4)
        const offset = thresholdDeg * 0.75
        p2.nudgedLat += Math.sin(angle) * offset
        p2.nudgedLng += Math.cos(angle) * offset
      }
    }
  }

  return positions.map((p) => ({
    ...p,
    position: { lat: p.nudgedLat, lng: p.nudgedLng },
  }))
}
