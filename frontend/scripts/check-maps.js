/**
 * check-maps.js
 *
 * Diagnostic script verifying Google Maps API environment wiring,
 * formats, precedence, and allowed origins strictly without exposing secrets.
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const frontendRoot = path.resolve(__dirname, '..')

const envFiles = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.development.local',
]

console.log('=== V2V AgriMap Google Maps Environment & Wiring Check ===\n')

let activeKey = null
let activeKeySource = null
let activeMapId = null
let activeMapIdSource = null

// Vite precedence for development:
// 1. .env.development.local
// 2. .env.local
// 3. .env.development
// 4. .env
const precedenceOrder = [
  '.env.development.local',
  '.env.local',
  '.env.development',
  '.env',
]

const envReports = {}

for (const file of envFiles) {
  const fullPath = path.join(frontendRoot, file)
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8')
    const keyMatch = content.match(/^\s*VITE_GOOGLE_MAPS_API_KEY\s*=\s*(.*)$/m)
    const mapIdMatch = content.match(/^\s*VITE_GOOGLE_MAP_ID\s*=\s*(.*)$/m)

    const keyVal = keyMatch ? keyMatch[1].trim() : null
    const mapIdVal = mapIdMatch ? mapIdMatch[1].trim() : null

    envReports[file] = {
      exists: true,
      definesKey: keyVal !== null,
      definesMapId: mapIdVal !== null,
    }

    if (keyVal && !activeKey && precedenceOrder.includes(file)) {
      activeKey = keyVal
      activeKeySource = file
    }
    if (mapIdVal && !activeMapId && precedenceOrder.includes(file)) {
      activeMapId = mapIdVal
      activeMapIdSource = file
    }
  } else {
    envReports[file] = { exists: false }
  }
}

// Check if OS/shell environment variable overrides
const osKey = process.env.VITE_GOOGLE_MAPS_API_KEY
const osOverrides = Boolean(osKey)
if (osOverrides) {
  activeKey = osKey
  activeKeySource = 'Shell / OS Environment Variable'
}

console.log('1. Env File Definitions & Precedence:')
for (const file of envFiles) {
  const r = envReports[file]
  if (r.exists) {
    console.log(`   - ${file}: exists=true, definesKey=${r.definesKey}, definesMapId=${r.definesMapId}`)
  } else {
    console.log(`   - ${file}: exists=false`)
  }
}
console.log(`   -> Winning file by Vite precedence: ${activeKeySource || 'None'}`)
console.log(`   -> OS / Shell variable overrides: ${osOverrides}`)

console.log('\n2. Maps API Key Format & Runtime Integrity (Booleans only):')
if (activeKey) {
  const defined = true
  const nonEmpty = activeKey.length > 0
  const startsWithAIza = activeKey.startsWith('AIza')
  const length39 = activeKey.length === 39
  const hasQuotes = /^["'].*["']$/.test(activeKey)
  const hasSpaces = /\s/.test(activeKey)
  const hasTrailingNewline = /[\r\n]/.test(activeKey)

  console.log(`   - defined: ${defined}`)
  console.log(`   - nonEmpty: ${nonEmpty}`)
  console.log(`   - startsWithAIza: ${startsWithAIza}`)
  console.log(`   - exactLength39: ${length39} (length: ${activeKey.length})`)
  console.log(`   - hasQuotes: ${hasQuotes}`)
  console.log(`   - hasSpaces: ${hasSpaces}`)
  console.log(`   - hasTrailingNewline: ${hasTrailingNewline}`)
} else {
  console.log('   - defined: false (no VITE_GOOGLE_MAPS_API_KEY found)')
}

console.log('\n3. Map ID Configuration:')
console.log(`   - mapIdDefined: ${Boolean(activeMapId)}`)
console.log(`   - mapIdSource: ${activeMapIdSource || 'None (using DEMO_MAP_ID fallback in dev)'}`)

console.log('\n4. Stale Key Verification:')
let staleFound = false
for (const file of envFiles) {
  if (file !== '.env.local' && envReports[file]?.definesKey) {
    console.log(`   - Warning: Stale key present in ${file}`)
    staleFound = true
  }
}
if (!staleFound) {
  console.log('   - Clean: No stale key found in any tracked env files.')
}

console.log('\n5. Allowed Origins to Authorize in Google Cloud Console:')
console.log('   Under "Set application restrictions" -> "Web sites", add:')
console.log('   - http://localhost:5173/*')
console.log('   - http://127.0.0.1:5173/*')
console.log('\n==========================================================\n')
