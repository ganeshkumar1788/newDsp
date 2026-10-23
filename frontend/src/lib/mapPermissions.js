/**
 * mapPermissions.js — Single Source of Truth for Spatial & Map Permissions
 *
 * Defines explicit granular capabilities per role across Farmer, Admin, and Surveyor/Verifier.
 * UI components must ONLY query permissions through these helpers.
 */

export const MAP_CAPABILITIES = {
  VIEW_OWN_FARM: 'canViewOwnFarm',
  VIEW_OTHER_FARMS: 'canViewOtherFarms',
  SWITCH_FARM: 'canSwitchFarm',
  TOGGLE_LAYERS: 'canToggleLayers',
  CHANGE_MAP_STYLE: 'canChangeMapStyle',
  OPEN_DEVICE_POPUPS: 'canOpenDevicePopups',
  CREATE_CHANGE_REQUEST: 'canCreateChangeRequest',
  READ_OWN_REQUESTS: 'canReadOwnRequests',
  DRAW_GEOMETRY: 'canDrawGeometry',
  EDIT_GEOMETRY: 'canEditGeometry',
  DRAG_MARKERS: 'canDragMarkers',
  ADD_MARKERS: 'canAddMarkers',
  DELETE_MARKERS: 'canDeleteMarkers',
  CORRECT_COORDINATES: 'canCorrectCoordinates',
  COORDINATE_NAVIGATOR: 'canCoordinateNavigator',
  PLACE_SEARCH: 'canPlaceSearch',
  EXPORT_DOWNLOAD: 'canExportDownload',
  VERIFY_REJECT: 'canVerifyReject',
  DECIDE_CHANGE_REQUEST: 'canDecideChangeRequest',
  VIEW_AUDIT_LOG: 'canViewAuditLog',
  MANAGE_STAFF: 'canManageStaff',
  USE_COORDINATE_TOOLS: 'canUseCoordinateTools',
  USE_LOCATION_FINDER: 'canUseLocationFinder',
}

export const ROLE_PERMISSIONS = {
  farmer: {
    canViewOwnFarm: true,
    canViewOtherFarms: false,
    canSwitchFarm: false,
    canToggleLayers: true,
    canChangeMapStyle: true,
    canOpenDevicePopups: true,
    canCreateChangeRequest: true,
    canReadOwnRequests: true,
    canDrawGeometry: false,
    canEditGeometry: false,
    canDragMarkers: false,
    canAddMarkers: false,
    canDeleteMarkers: false,
    canCorrectCoordinates: false,
    canCoordinateNavigator: false,
    canPlaceSearch: false,
    canExportDownload: false,
    canVerifyReject: false,
    canDecideChangeRequest: false,
    canViewAuditLog: false,
    canManageStaff: false,
    canUseCoordinateTools: false,
    canUseLocationFinder: 'request-form only',
  },
  admin: {
    canViewOwnFarm: true,
    canViewOtherFarms: true,
    canSwitchFarm: true,
    canToggleLayers: true,
    canChangeMapStyle: true,
    canOpenDevicePopups: true,
    canCreateChangeRequest: true,
    canReadOwnRequests: true,
    canDrawGeometry: true,
    canEditGeometry: true,
    canDragMarkers: true,
    canAddMarkers: true,
    canDeleteMarkers: true,
    canCorrectCoordinates: true,
    canCoordinateNavigator: true,
    canPlaceSearch: true,
    canExportDownload: true,
    canVerifyReject: true,
    canDecideChangeRequest: true,
    canViewAuditLog: true,
    canManageStaff: true,
    canUseCoordinateTools: true,
    canUseLocationFinder: 'full',
  },
  surveyor: {
    canViewOwnFarm: true,
    canViewOtherFarms: true, // Only assigned farms
    canSwitchFarm: true,
    canToggleLayers: true,
    canChangeMapStyle: true,
    canOpenDevicePopups: true,
    canCreateChangeRequest: false,
    canReadOwnRequests: false,
    canDrawGeometry: true,
    canEditGeometry: true,
    canDragMarkers: true,
    canAddMarkers: true,
    canDeleteMarkers: true,
    canCorrectCoordinates: true,
    canCoordinateNavigator: true,
    canPlaceSearch: true,
    canExportDownload: false,
    canVerifyReject: false,
    canDecideChangeRequest: false,
    canViewAuditLog: false,
    canManageStaff: false,
    canUseCoordinateTools: true,
    canUseLocationFinder: 'assigned farms',
  },
  verifier: {
    canViewOwnFarm: true,
    canViewOtherFarms: true, // Only assigned farms
    canSwitchFarm: true,
    canToggleLayers: true,
    canChangeMapStyle: true,
    canOpenDevicePopups: true,
    canCreateChangeRequest: false,
    canReadOwnRequests: false,
    canDrawGeometry: true,
    canEditGeometry: true,
    canDragMarkers: true,
    canAddMarkers: true,
    canDeleteMarkers: true,
    canCorrectCoordinates: true,
    canCoordinateNavigator: true,
    canPlaceSearch: true,
    canExportDownload: false,
    canVerifyReject: false,
    canDecideChangeRequest: false,
    canViewAuditLog: false,
    canManageStaff: false,
    canUseCoordinateTools: true,
    canUseLocationFinder: 'assigned farms',
  },
  land_verifier: {
    canViewOwnFarm: true,
    canViewOtherFarms: true, // Only assigned farms
    canSwitchFarm: true,
    canToggleLayers: true,
    canChangeMapStyle: true,
    canOpenDevicePopups: true,
    canCreateChangeRequest: false,
    canReadOwnRequests: false,
    canDrawGeometry: true,
    canEditGeometry: true,
    canDragMarkers: true,
    canAddMarkers: true,
    canDeleteMarkers: true,
    canCorrectCoordinates: true,
    canCoordinateNavigator: true,
    canPlaceSearch: true,
    canExportDownload: false,
    canVerifyReject: false,
    canDecideChangeRequest: false,
    canViewAuditLog: false,
    canManageStaff: false,
    canUseCoordinateTools: true,
    canUseLocationFinder: 'assigned farms',
  },
}

/**
 * Normalizes role string (handles aliases like 'land_verifier')
 */
export function normalizeRole(role) {
  if (!role) return 'farmer'
  const lower = String(role).toLowerCase()
  if (lower === 'land_verifier' || lower === 'verifier') return 'surveyor'
  if (ROLE_PERMISSIONS[lower]) return lower
  return 'farmer'
}

/**
 * Check if a role possesses a specific map capability
 */
export function hasMapPermission(role, capability) {
  const normRole = normalizeRole(role)
  const perms = ROLE_PERMISSIONS[normRole] || ROLE_PERMISSIONS.farmer
  return Boolean(perms[capability])
}

/**
 * Get location finder scope ('request-form only', 'full', 'assigned farms')
 */
export function getLocationFinderScope(role) {
  const normRole = normalizeRole(role)
  const perms = ROLE_PERMISSIONS[normRole] || ROLE_PERMISSIONS.farmer
  return perms.canUseLocationFinder || 'request-form only'
}

/**
 * Get full capability dictionary for a role
 */
export function getMapPermissions(role) {
  const normRole = normalizeRole(role)
  return { ...(ROLE_PERMISSIONS[normRole] || ROLE_PERMISSIONS.farmer) }
}
