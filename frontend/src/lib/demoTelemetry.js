/**
 * demoTelemetry.js — Isolated Sample Telemetry Data
 *
 * Rules:
 * - Saved farmer data is NEVER modified.
 * - Any diagnostic value not present in saved farmer data is pulled from here
 *   and explicitly tagged with isSampleData: true / "Sample data".
 * - If neither stored data nor demo telemetry has a value, "No data" is rendered.
 */

export const SAMPLE_VALVE_TELEMETRY = {
  'valve-1': {
    valve_number: 1,
    status: 'OPEN',
    zone_served: 'Zone A (Coconut Orchard)',
    last_operated: 'Today, 06:15 AM (Scheduled automated pulse)',
    connected_conduit: 'Main 90mm HDPE Conduit — Central Header',
    operating_pressure_bar: 2.4,
    actuator: 'Manual Lever + 24V Solenoid',
  },
  'valve-2': {
    valve_number: 2,
    status: 'CLOSED',
    zone_served: 'Zone B (Nutmeg & Intercrops)',
    last_operated: 'Yesterday, 05:45 PM',
    connected_conduit: 'Main 90mm HDPE Conduit — North Branch',
    operating_pressure_bar: 2.2,
    actuator: 'Manual Lever + 24V Solenoid',
  },
  default: {
    valve_number: 1,
    status: 'OPEN',
    zone_served: 'Zone A (Coconut Orchard)',
    last_operated: 'Today, 06:15 AM',
    connected_conduit: 'Main 90mm HDPE Conduit — Central Header',
    operating_pressure_bar: 2.4,
    actuator: 'Manual Lever + 24V Solenoid',
  },
}

export const SAMPLE_CONDUIT_TELEMETRY = {
  'pipe-main-1': {
    name: 'Main 90mm HDPE Conduit',
    material: 'Virgin HDPE (PE100)',
    nominal_diameter: '90mm',
    from_name: 'Solar Borewell Pump House (Well #1)',
    to_name: 'Distribution Manifold & Zone A/B Header',
    pressure_rating: 'PN10 (10 Bar)',
    working_pressure_bar: 2.4,
  },
  default_main: {
    name: 'Main 90mm HDPE Conduit',
    material: 'Virgin HDPE (PE100)',
    nominal_diameter: '90mm',
    from_name: 'Solar Borewell Pump House',
    to_name: 'Primary Manifold Header',
    pressure_rating: 'PN10 (10 Bar)',
    working_pressure_bar: 2.4,
  },
  default_lateral: {
    name: '50mm Sub-lateral Pipeline',
    material: 'HDPE Sub-lateral (PE80)',
    nominal_diameter: '50mm',
    from_name: 'Zone Control Valve',
    to_name: 'Drip Line In-line Emitters',
    pressure_rating: 'PN6 (6 Bar)',
    working_pressure_bar: 1.8,
  },
}

export const SAMPLE_TRACK_TELEMETRY = {
  'path-farm-access': {
    name: 'Internal Farm Access Track',
    surface: 'Compacted Gravel / All-Weather Murram',
    width_meters: 3.5,
    condition: 'Good / Tractor Accessible',
  },
  default: {
    name: 'Internal Farm Access Track',
    surface: 'Compacted Murram / Earth Road',
    width_meters: 3.5,
    condition: 'Good / Tractor Accessible',
  },
}

/**
 * Returns merged diagnostic telemetry with explicit provenance:
 * stored value -> { value, isSample: false }
 * fallback demo value -> { value, isSample: true }
 * none -> { value: 'No data', isSample: false }
 */
export function resolveFieldTelemetry(storedVal, fallbackVal) {
  if (storedVal !== undefined && storedVal !== null && storedVal !== '') {
    return { value: storedVal, isSample: false }
  }
  if (fallbackVal !== undefined && fallbackVal !== null && fallbackVal !== '') {
    return { value: fallbackVal, isSample: true }
  }
  return { value: 'No data', isSample: false }
}
