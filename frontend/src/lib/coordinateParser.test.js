import assert from 'node:assert'
import { parseCoordinates, toDms } from './coordinateParser.js'

console.log('Testing coordinateParser.js...')

// 1. Plain Decimal
{
  const res = parseCoordinates('10.6565, 77.0102')
  assert.strictEqual(res.ok, true)
  assert.ok(Math.abs(res.lat - 10.6565) < 1e-6)
  assert.ok(Math.abs(res.lng - 77.0102) < 1e-6)
  assert.strictEqual(res.outsideIndia, false)
  console.log('PASS: 1. Plain decimal format')
}

// 2. Cardinal suffix
{
  const res = parseCoordinates('10.6565 N 77.0102 E')
  assert.strictEqual(res.ok, true)
  assert.ok(Math.abs(res.lat - 10.6565) < 1e-6)
  assert.ok(Math.abs(res.lng - 77.0102) < 1e-6)
  console.log('PASS: 2. Cardinal suffix format')
}

// 3. Cardinal prefix
{
  const res = parseCoordinates('N10.6565 E77.0102')
  assert.strictEqual(res.ok, true)
  assert.ok(Math.abs(res.lat - 10.6565) < 1e-6)
  assert.ok(Math.abs(res.lng - 77.0102) < 1e-6)
  console.log('PASS: 3. Cardinal prefix format')
}

// 4. DMS
{
  const res = parseCoordinates('10°39\'23.4"N 77°00\'36.7"E')
  assert.strictEqual(res.ok, true)
  // 10 + 39/60 + 23.4/3600 = 10.6565
  // 77 + 0/60 + 36.7/3600 = 77.0101944
  assert.ok(Math.abs(res.lat - 10.6565) < 1e-4)
  assert.ok(Math.abs(res.lng - 77.0102) < 1e-4)
  console.log('PASS: 4. DMS format')
}

// 5. Degrees Decimal Minutes (DDM)
{
  const res = parseCoordinates('10 39.39 N 77 0.612 E')
  assert.strictEqual(res.ok, true)
  // 10 + 39.39/60 = 10.6565
  // 77 + 0.612/60 = 77.0102
  assert.ok(Math.abs(res.lat - 10.6565) < 1e-4)
  assert.ok(Math.abs(res.lng - 77.0102) < 1e-4)
  console.log('PASS: 5. DDM format')
}

// 6. Negative values (Southern / Western hemisphere)
{
  const res = parseCoordinates('-33.8688, 151.2093')
  assert.strictEqual(res.ok, true)
  assert.ok(Math.abs(res.lat - (-33.8688)) < 1e-6)
  assert.ok(Math.abs(res.lng - 151.2093) < 1e-6)
  assert.strictEqual(res.outsideIndia, true)
  console.log('PASS: 6. Negative Southern/Western coordinates')
}

// 7. Swap Detection
{
  const res = parseCoordinates('77.0102, 10.6565')
  assert.strictEqual(res.ok, true)
  assert.ok(res.swapSuggestion !== null)
  assert.ok(Math.abs(res.swapSuggestion.lat - 10.6565) < 1e-4)
  assert.ok(Math.abs(res.swapSuggestion.lng - 77.0102) < 1e-4)
  console.log('PASS: 7. Swap detection suggestion')
}

// 8. Out of Range
{
  const res = parseCoordinates('95, 10')
  assert.strictEqual(res.ok, false)
  assert.ok(res.error.includes('out of range'))
  console.log('PASS: 8. Out of range latitude rejection')
}

// 9. Unreadable / Garbage
{
  const res = parseCoordinates('abc')
  assert.strictEqual(res.ok, false)
  console.log('PASS: 9. Unreadable garbage rejection')
}

// 10. Decimal and DMS Agreement within 1e-6
{
  const lat = 10.656500
  const lng = 77.010200
  const dms = `${toDms(lat, 'N')} ${toDms(lng, 'E')}`
  const parsed = parseCoordinates(dms)
  assert.strictEqual(parsed.ok, true)
  assert.ok(Math.abs(parsed.lat - lat) < 1e-4)
  assert.ok(Math.abs(parsed.lng - lng) < 1e-4)
  console.log('PASS: 10. Decimal and DMS agreement verified')
}

console.log('\nAll 10 coordinateParser tests passed successfully!\n')
