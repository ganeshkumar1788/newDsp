/**
 * legendTypes.js — Strict Feature Classifier & Legend Definition Standard
 *
 * Implements deterministic classification of stored GeoJSON features to Map Legend types.
 * Operates purely on stored fields (entity_type, resource_class, resource_type, device_type, status, name, diameter_mm).
 * Never mutates or alters saved data. All labels, counts, and classifications are render-time only.
 */

// ── Legend Group Definitions (Exact Order & Naming) ─────────────────────────
export const LEGEND_GROUPS = {
  BOUNDARY: 'Farm Boundary',
  ZONES: 'Crop Zones',
  WATER_IRRIGATION: 'Water & Irrigation',
  MONITORING_POWER: 'Monitoring & Power',
  CONDUITS_INFRASTRUCTURE: 'Conduits & Infrastructure',
}

// ── Legend Item Types ────────────────────────────────────────────────────────
export const LEGEND_ITEMS = {
  // Boundary
  BOUNDARY: {
    id: 'boundary',
    group: LEGEND_GROUPS.BOUNDARY,
    label: 'Survey Boundary (DGPS)',
    symbolType: 'line_dashed',
    color: '#8A57C0',
    weight: 4,
  },

  // Crop Zones
  CROP_ZONE: {
    id: 'crop_zone',
    group: LEGEND_GROUPS.ZONES,
    label: 'Crop Cultivation Zones',
    symbolType: 'polygon_fill',
    opacity: 0.35,
    borderWeight: 2.5,
  },

  // 1. Water & Irrigation
  BOREWELL_RUNNING: {
    id: 'borewell_running',
    group: LEGEND_GROUPS.WATER_IRRIGATION,
    label: 'Solar Borewell (Running)',
    symbolType: 'badge_circle',
    bg: '#10B981', // Emerald
    iconName: 'Droplet',
    hasSunCorner: true,
    statusDot: '#10B981',
    statusText: 'Running',
    zIndex: 35,
  },
  BOREWELL_STANDBY: {
    id: 'borewell_standby',
    group: LEGEND_GROUPS.WATER_IRRIGATION,
    label: 'Auxiliary Tube Well (Standby)',
    symbolType: 'badge_circle',
    bg: '#2A0C58', // Deep Violet
    iconName: 'Droplet',
    hasSunCorner: false,
    statusDot: '#9CA3AF',
    statusText: 'Standby',
    zIndex: 34,
  },
  CONTROL_VALVE: {
    id: 'control_valve',
    group: LEGEND_GROUPS.WATER_IRRIGATION,
    label: 'Control Valves (1-8 Surveyed)',
    symbolType: 'badge_valve',
    bg: '#0284C7', // Teal/Blue circle
    iconName: 'Gauge',
    size: 32,
    zIndex: 30,
  },

  // 2. Monitoring & Power
  POWER_SOLAR: {
    id: 'power_solar',
    group: LEGEND_GROUPS.MONITORING_POWER,
    label: '440V Feeder & 12kW Solar',
    symbolType: 'badge_circle',
    bg: '#F59E0B', // Amber
    iconName: 'Zap',
    statusDot: '#10B981',
    statusText: 'Active Online',
    zIndex: 45,
  },
  CCTV_SENTINEL: {
    id: 'cctv_sentinel',
    group: LEGEND_GROUPS.MONITORING_POWER,
    label: '4K AI Security Sentinel',
    symbolType: 'badge_circle',
    bg: '#3C1775', // Violet
    iconName: 'Video',
    statusDot: '#10B981',
    statusText: 'Online 4K',
    zIndex: 40,
  },
  SOILSENSE_PROBE: {
    id: 'soilsense_probe',
    group: LEGEND_GROUPS.MONITORING_POWER,
    label: 'V2V SoilSense IoT Probe',
    symbolType: 'badge_circle',
    bg: '#8A57C0', // Electric Purple
    iconName: 'Radio',
    statusDot: '#10B981',
    statusText: 'Online (95%)',
    zIndex: 32,
  },

  // 3. Conduits & Infrastructure (Lines, drawn above zones, below markers)
  MAIN_CONDUIT: {
    id: 'main_conduit',
    group: LEGEND_GROUPS.CONDUITS_INFRASTRUCTURE,
    label: 'Main 90mm HDPE Conduit',
    symbolType: 'line_solid',
    color: '#1E90D6', // Solid Blue
    weight: 6,
    zIndex: 22,
  },
  SUB_LATERAL: {
    id: 'sub_lateral',
    group: LEGEND_GROUPS.CONDUITS_INFRASTRUCTURE,
    label: '50mm Sub-lateral Pipeline',
    symbolType: 'line_solid',
    color: '#38BDF8', // Lighter Cyan
    weight: 3.5,
    zIndex: 21,
  },
  FARM_TRACK: {
    id: 'farm_track',
    group: LEGEND_GROUPS.CONDUITS_INFRASTRUCTURE,
    label: 'Internal Farm Access Track',
    symbolType: 'line_solid',
    color: '#F59E0B', // Orange
    weight: 7,
    zIndex: 20,
  },

  // Fallback for unclassified features
  UNCLASSIFIED: {
    id: 'unclassified',
    group: 'Other Stored Features',
    label: 'Unclassified Asset',
    symbolType: 'badge_circle',
    bg: '#6B7280',
    iconName: 'HelpCircle',
    statusDot: '#9CA3AF',
    statusText: 'Unclassified',
    zIndex: 10,
  },
}

/**
 * Classifies any stored GeoJSON Feature into its matching Legend Item type.
 * Uses only stored fields with strict precedence.
 *
 * @param {Object} feature - GeoJSON feature object
 * @returns {Object} Classified legend configuration with matched item definition
 */
export function classifyFeature(feature) {
  if (!feature || !feature.properties) {
    return { item: LEGEND_ITEMS.UNCLASSIFIED, featureName: 'Unknown', isUnclassified: true }
  }

  const props = feature.properties
  const geomType = feature.geometry?.type || ''
  const ent = (props.entity_type || '').toLowerCase()
  const resClass = (props.resource_class || '').toUpperCase()
  const resType = (props.resource_type || '').toLowerCase()
  const devType = (props.device_type || '').toLowerCase()
  const statusStr = (props.status || props.operational_status || '').toUpperCase()
  const name = (props.name || props.device_name || '').toLowerCase()
  const diameter = Number(props.diameter_mm || 0)

  // 1. Boundary Polygon
  if (ent === 'field' || (geomType === 'MultiPolygon' && !props.crop)) {
    return {
      item: LEGEND_ITEMS.BOUNDARY,
      featureName: props.name || 'Farmland Boundary',
      isUnclassified: false,
    }
  }

  // 2. Crop Zone Polygons
  if (ent === 'crop_zone' || ent === 'zone' || props.crop || props.crop_category) {
    return {
      item: LEGEND_ITEMS.CROP_ZONE,
      featureName: props.crop || props.name || 'Crop Cultivation Zone',
      isUnclassified: false,
    }
  }

  // 3. Lines / Conduits / Tracks (LineString geometry)
  if (geomType === 'LineString') {
    // 3a. Sub-lateral pipeline
    if (
      resType === 'lateral_pipeline' ||
      resType === 'sub_lateral' ||
      (diameter > 0 && diameter < 75) ||
      name.includes('lateral') ||
      name.includes('50mm') ||
      name.includes('sub-lateral')
    ) {
      return {
        item: LEGEND_ITEMS.SUB_LATERAL,
        featureName: props.name || '50mm Sub-lateral Pipeline',
        isUnclassified: false,
      }
    }

    // 3b. Main 90mm conduit
    if (
      resType === 'main_pipeline' ||
      resType === 'pipeline' ||
      resClass === 'IRRIGATION' ||
      diameter >= 75 ||
      name.includes('main') ||
      name.includes('conduit') ||
      name.includes('90mm') ||
      name.includes('pipeline')
    ) {
      return {
        item: LEGEND_ITEMS.MAIN_CONDUIT,
        featureName: props.name || 'Main 90mm HDPE Conduit',
        isUnclassified: false,
      }
    }

    // 3c. Internal farm access track
    if (
      resType === 'internal_path' ||
      resType === 'path' ||
      resType === 'road' ||
      resClass === 'STRUCTURE' ||
      props.line_type === 'farm_road' ||
      name.includes('road') ||
      name.includes('track') ||
      name.includes('path')
    ) {
      return {
        item: LEGEND_ITEMS.FARM_TRACK,
        featureName: props.name || 'Internal Farm Access Track',
        isUnclassified: false,
      }
    }

    // Fallback unclassified line
    return {
      item: {
        ...LEGEND_ITEMS.UNCLASSIFIED,
        symbolType: 'line_solid',
        color: props.color || '#6B7280',
        weight: 4,
      },
      featureName: props.name || 'Linear Feature',
      isUnclassified: true,
    }
  }

  // 4. Point Features (Markers)
  // 4a. Control Valves (1-8 Surveyed)
  if (
    resType === 'irrigation_valve' ||
    resType === 'valve' ||
    ent === 'valve' ||
    name.includes('valve')
  ) {
    return {
      item: LEGEND_ITEMS.CONTROL_VALVE,
      featureName: props.name || `Control Valve #${props.valve_number || 1}`,
      isUnclassified: false,
    }
  }

  // 4b. CCTV AI Sentinel (Checks device_type first to prevent CCTV 01 Solar Station false match)
  if (
    devType === 'cctv_camera' ||
    devType === 'camera' ||
    name.includes('cctv') ||
    name.includes('camera') ||
    name.includes('sentinel')
  ) {
    return {
      item: LEGEND_ITEMS.CCTV_SENTINEL,
      featureName: props.device_name || props.name || '4K AI Security Sentinel',
      isUnclassified: false,
    }
  }

  // 4c. V2V SoilSense IoT Probe
  if (
    devType === 'soil_sensor' ||
    devType === 'sensor' ||
    name.includes('sensor') ||
    name.includes('soilsense') ||
    name.includes('probe') ||
    name.includes('telemetry')
  ) {
    return {
      item: LEGEND_ITEMS.SOILSENSE_PROBE,
      featureName: props.device_name || props.name || 'V2V SoilSense IoT Probe',
      isUnclassified: false,
    }
  }

  // 4d. Borewells & Tube Wells
  if (
    resClass === 'WATER' ||
    resType === 'borewell_pump' ||
    resType === 'tube_well' ||
    name.includes('borewell') ||
    name.includes('tube well') ||
    name.includes('submersible')
  ) {
    const isRunning =
      statusStr === 'ACTIVE_RUNNING' ||
      statusStr === 'RUNNING' ||
      statusStr === 'ONLINE' ||
      statusStr.includes('ACTIVE') ||
      statusStr.includes('PUMPING')

    return {
      item: isRunning ? LEGEND_ITEMS.BOREWELL_RUNNING : LEGEND_ITEMS.BOREWELL_STANDBY,
      featureName: props.name || (isRunning ? 'Solar Borewell (Running)' : 'Auxiliary Tube Well (Standby)'),
      isUnclassified: false,
    }
  }

  // 4e. Power & Solar (440V Feeder & 12kW Solar)
  if (
    ent === 'power_source' ||
    resClass === 'POWER' ||
    resType === 'electrical_grid' ||
    resType === 'solar_station' ||
    resType === 'grid_transformer' ||
    name.includes('feeder') ||
    name.includes('solar station') ||
    name.includes('transformer') ||
    name.includes('power')
  ) {
    return {
      item: LEGEND_ITEMS.POWER_SOLAR,
      featureName: props.name || '440V Feeder & 12kW Solar Station',
      isUnclassified: false,
    }
  }

  // Unclassified default
  return {
    item: LEGEND_ITEMS.UNCLASSIFIED,
    featureName: props.name || props.device_name || 'Unclassified Asset',
    isUnclassified: true,
  }
}

/**
 * Builds the comprehensive inventory of all legend items for a given GeoJSON dataset.
 * Returns mapped features, counts, and flags for "not mapped yet" and "unclassified".
 */
export function buildLegendInventory(geojson) {
  const features = geojson?.features || []
  const inventory = {
    [LEGEND_ITEMS.BOUNDARY.id]: { config: LEGEND_ITEMS.BOUNDARY, features: [], count: 0 },
    [LEGEND_ITEMS.CROP_ZONE.id]: { config: LEGEND_ITEMS.CROP_ZONE, features: [], count: 0 },
    [LEGEND_ITEMS.BOREWELL_RUNNING.id]: { config: LEGEND_ITEMS.BOREWELL_RUNNING, features: [], count: 0 },
    [LEGEND_ITEMS.BOREWELL_STANDBY.id]: { config: LEGEND_ITEMS.BOREWELL_STANDBY, features: [], count: 0 },
    [LEGEND_ITEMS.CONTROL_VALVE.id]: { config: LEGEND_ITEMS.CONTROL_VALVE, features: [], count: 0 },
    [LEGEND_ITEMS.POWER_SOLAR.id]: { config: LEGEND_ITEMS.POWER_SOLAR, features: [], count: 0 },
    [LEGEND_ITEMS.CCTV_SENTINEL.id]: { config: LEGEND_ITEMS.CCTV_SENTINEL, features: [], count: 0 },
    [LEGEND_ITEMS.SOILSENSE_PROBE.id]: { config: LEGEND_ITEMS.SOILSENSE_PROBE, features: [], count: 0 },
    [LEGEND_ITEMS.MAIN_CONDUIT.id]: { config: LEGEND_ITEMS.MAIN_CONDUIT, features: [], count: 0 },
    [LEGEND_ITEMS.SUB_LATERAL.id]: { config: LEGEND_ITEMS.SUB_LATERAL, features: [], count: 0 },
    [LEGEND_ITEMS.FARM_TRACK.id]: { config: LEGEND_ITEMS.FARM_TRACK, features: [], count: 0 },
    [LEGEND_ITEMS.UNCLASSIFIED.id]: { config: LEGEND_ITEMS.UNCLASSIFIED, features: [], count: 0 },
  }

  features.forEach((feat) => {
    const { item, featureName, isUnclassified } = classifyFeature(feat)
    const targetId = isUnclassified ? LEGEND_ITEMS.UNCLASSIFIED.id : item.id
    if (inventory[targetId]) {
      inventory[targetId].features.push({
        id: feat.properties?.id,
        name: featureName,
        rawFeature: feat,
      })
      inventory[targetId].count++
    }
  })

  return inventory
}
