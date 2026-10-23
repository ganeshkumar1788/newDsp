import {
  geoJsonCoordToGoogle,
  googleCoordToGeoJson,
  toLatLng,
  fromLatLngToPair,
  geoJsonToGooglePaths,
  googlePathsToGeoJson,
  lineGeoJsonToGooglePath,
  googlePathToLineGeoJson,
  pointGeoJsonToGoogleLatLng,
  googleLatLngToPointGeoJson,
} from './mapAdapters.js'

function runTests() {
  const tests = [
    {
      name: 'geoJsonCoordToGoogle converts [lng, lat] to { lat, lng }',
      test: () => {
        const res = geoJsonCoordToGoogle([77.0102, 10.6565])
        return res && res.lat === 10.6565 && res.lng === 77.0102
      },
    },
    {
      name: 'googleCoordToGeoJson converts { lat, lng } to [lng, lat]',
      test: () => {
        const res = googleCoordToGeoJson({ lat: 10.6565, lng: 77.0102 })
        return Array.isArray(res) && res[0] === 77.0102 && res[1] === 10.6565
      },
    },
    {
      name: 'toLatLng handles Leaflet [lat, lng] and GeoJSON [lng, lat]',
      test: () => {
        const leaflet = toLatLng([10.6565, 77.0102], false)
        const geojson = toLatLng([77.0102, 10.6565], true)
        return (
          leaflet.lat === 10.6565 &&
          leaflet.lng === 77.0102 &&
          geojson.lat === 10.6565 &&
          geojson.lng === 77.0102
        )
      },
    },
    {
      name: 'MultiPolygon round trip preserves coordinates identically',
      test: () => {
        const initialCoords = [
          [
            [
              [77.0102, 10.6565],
              [77.0155, 10.6570],
              [77.0162, 10.6608],
              [77.0128, 10.6618],
              [77.0098, 10.6598],
              [77.0102, 10.6565],
            ],
          ],
        ]
        const multiPoly = { type: 'MultiPolygon', coordinates: initialCoords }
        const googlePaths = geoJsonToGooglePaths(multiPoly)
        if (googlePaths.length !== 1 || googlePaths[0].length !== 6) return false
        const reconverted = googlePathsToGeoJson(googlePaths, true)
        return JSON.stringify(reconverted.coordinates) === JSON.stringify(initialCoords)
      },
    },
    {
      name: 'LineString round trip preserves path coordinates',
      test: () => {
        const initialLine = [
          [77.0118, 10.6578],
          [77.0135, 10.6590],
          [77.0150, 10.6605],
        ]
        const lineGeo = { type: 'LineString', coordinates: initialLine }
        const gPath = lineGeoJsonToGooglePath(lineGeo)
        const back = googlePathToLineGeoJson(gPath)
        return JSON.stringify(back.coordinates) === JSON.stringify(initialLine)
      },
    },
    {
      name: 'Point round trip preserves point coordinates',
      test: () => {
        const initialPt = [77.0118, 10.6578]
        const ptGeo = { type: 'Point', coordinates: initialPt }
        const gPt = pointGeoJsonToGoogleLatLng(ptGeo)
        const back = googleLatLngToPointGeoJson(gPt)
        return JSON.stringify(back.coordinates) === JSON.stringify(initialPt)
      },
    },
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

  console.log(`\nmapAdapters results: ${passed} passed, ${failed} failed.`)
  if (failed > 0) process.exit(1)
}

runTests()
