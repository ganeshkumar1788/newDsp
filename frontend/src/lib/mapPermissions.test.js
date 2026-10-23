import { hasMapPermission, getMapPermissions, normalizeRole, MAP_CAPABILITIES } from './mapPermissions.js'

function runTests() {
  const tests = [
    {
      name: 'Farmer can view own farm and toggle layers',
      test: () => hasMapPermission('farmer', MAP_CAPABILITIES.VIEW_OWN_FARM) && hasMapPermission('farmer', MAP_CAPABILITIES.TOGGLE_LAYERS)
    },
    {
      name: 'Farmer cannot draw geometry, drag markers, or verify',
      test: () => !hasMapPermission('farmer', MAP_CAPABILITIES.DRAW_GEOMETRY) &&
                  !hasMapPermission('farmer', MAP_CAPABILITIES.DRAG_MARKERS) &&
                  !hasMapPermission('farmer', MAP_CAPABILITIES.VERIFY_REJECT)
    },
    {
      name: 'Farmer can create change requests and read own requests',
      test: () => hasMapPermission('farmer', MAP_CAPABILITIES.CREATE_CHANGE_REQUEST) &&
                  hasMapPermission('farmer', MAP_CAPABILITIES.READ_OWN_REQUESTS)
    },
    {
      name: 'Farmer cannot decide change requests or switch farms',
      test: () => !hasMapPermission('farmer', MAP_CAPABILITIES.DECIDE_CHANGE_REQUEST) &&
                  !hasMapPermission('farmer', MAP_CAPABILITIES.SWITCH_FARM)
    },
    {
      name: 'Admin has full control: draw, verify, decide requests, export, manage staff',
      test: () => hasMapPermission('admin', MAP_CAPABILITIES.DRAW_GEOMETRY) &&
                  hasMapPermission('admin', MAP_CAPABILITIES.VERIFY_REJECT) &&
                  hasMapPermission('admin', MAP_CAPABILITIES.DECIDE_CHANGE_REQUEST) &&
                  hasMapPermission('admin', MAP_CAPABILITIES.EXPORT_DOWNLOAD) &&
                  hasMapPermission('admin', MAP_CAPABILITIES.MANAGE_STAFF)
    },
    {
      name: 'Surveyor can draw and edit geometry but cannot verify or decide change requests',
      test: () => hasMapPermission('surveyor', MAP_CAPABILITIES.DRAW_GEOMETRY) &&
                  hasMapPermission('surveyor', MAP_CAPABILITIES.EDIT_GEOMETRY) &&
                  !hasMapPermission('surveyor', MAP_CAPABILITIES.VERIFY_REJECT) &&
                  !hasMapPermission('surveyor', MAP_CAPABILITIES.DECIDE_CHANGE_REQUEST) &&
                  !hasMapPermission('surveyor', MAP_CAPABILITIES.EXPORT_DOWNLOAD)
    },
    {
      name: 'Verifier and land_verifier normalize to surveyor permissions',
      test: () => normalizeRole('verifier') === 'surveyor' &&
                  normalizeRole('land_verifier') === 'surveyor' &&
                  hasMapPermission('verifier', MAP_CAPABILITIES.DRAW_GEOMETRY) &&
                  !hasMapPermission('verifier', MAP_CAPABILITIES.VERIFY_REJECT)
    }
  ]

  let passed = 0
  let failed = 0

  for (const t of tests) {
    if (t.test()) {
      console.log(`PASS: ${t.name}`)
      passed++
    } else {
      console.error(`FAIL: ${t.name}`)
      failed++
    }
  }

  console.log(`\nmapPermissions results: ${passed} passed, ${failed} failed.`)
  if (failed > 0) process.exit(1)
}

runTests()
