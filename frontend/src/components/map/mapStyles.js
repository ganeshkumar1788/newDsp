/**
 * mapStyles.js — Map Styling, Color Palettes & Tile Configurations
 *
 * Defines V2V DSP dark theme styles, clean mode styles (hiding POIs/transit),
 * and color palettes for boundary, zones, devices, and lines.
 */

// V2V Theme Color Palette Constants
export const V2V_COLORS = {
  deepViolet: '#2A0C58',
  royalViolet: '#3C1775',
  mutedPurple: '#5E4678',
  electricPurple: '#8A57C0',
  lavender: '#B890F9',
  softLavender: '#D9C7FF',
  pearlLavender: '#E4DFEB',
  softWhite: '#F4F3F9',
  nearBlack: '#131313',
  pureWhite: '#FFFFFF',

  // Device & Status Colors
  borewellRunning: '#10B981', // Emerald
  borewellStandby: '#2A0C58', // Deep Violet
  cctv: '#3C1775',            // Royal Violet
  sensor: '#8A57C0',          // Electric Purple
  powerSolar: '#F59E0B',      // Amber
  boundaryStroke: '#8A57C0',  // Electric Purple
  boundaryFill: '#B890F9',    // Soft Lavender
}

// Clean Map Style (Hides POIs, shops, commercial attractions, transit)
export const CLEAN_MAP_STYLE = [
  {
    featureType: 'poi',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.business',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
]

// Premium Dark Map Style
export const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#131313' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1b1233' }, { weight: 3 }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#f4f3f9' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#d9c7ff' }],
  },
  {
    featureType: 'poi',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#1b2a20' }, { visibility: 'simplified' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#241845' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#3c1775' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#c9bde6' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#3c1775' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#2a0c58' }],
  },
  {
    featureType: 'transit',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#0f172a' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#8a57c0' }],
  },
]
