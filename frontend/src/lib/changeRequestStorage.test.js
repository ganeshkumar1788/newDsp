import { changeRequestStorage, REQUEST_STATUSES } from './changeRequestStorage.js'

// Simple mock for localStorage
if (typeof localStorage === 'undefined') {
  global.localStorage = {
    store: {},
    getItem(k) { return this.store[k] || null },
    setItem(k, v) { this.store[k] = String(v) },
    removeItem(k) { delete this.store[k] },
    clear() { this.store = {} }
  }
}

if (typeof window === 'undefined') {
  global.window = {
    dispatchEvent() {}
  }
  global.CustomEvent = class { constructor() {} }
}

function runTests() {
  const farmerUser = { id: 'farmer-1', farmer_id: 'farmer-1', full_name: 'Ganesh V.', field_id: 'field-1' }
  const otherFarmer = { id: 'farmer-2', farmer_id: 'farmer-2', full_name: 'Kishore S.', field_id: 'field-2' }
  const adminUser = { id: 'admin-1', role: 'admin', full_name: 'Super Admin' }

  const tests = [
    {
      name: 'Farmer gets only their own requests',
      test: () => {
        const farmerReqs = changeRequestStorage.getRequests('farmer', farmerUser)
        return farmerReqs.every(r => r.farmerId === 'farmer-1')
      }
    },
    {
      name: 'Farmer cannot read another farmer request by ID',
      test: () => {
        try {
          changeRequestStorage.getRequestById('req-demo-1', 'farmer', otherFarmer)
          return false
        } catch (e) {
          return true
        }
      }
    },
    {
      name: 'Admin can read any request by ID',
      test: () => {
        const req = changeRequestStorage.getRequestById('req-demo-1', 'admin', adminUser)
        return req && req.id === 'req-demo-1'
      }
    },
    {
      name: 'Description under 20 characters throws validation error',
      test: () => {
        try {
          changeRequestStorage.createRequest({ description: 'Too short', type: 'other' }, farmerUser)
          return false
        } catch (e) {
          return e.message.includes('between 20 and 1000')
        }
      }
    },
    {
      name: 'Attachments over 5 MB throws validation error',
      test: () => {
        try {
          changeRequestStorage.createRequest({
            description: 'This is a valid long description for the request testing error bounds.',
            attachments: [{ name: 'huge.jpg', size: 6 * 1024 * 1024 }]
          }, farmerUser)
          return false
        } catch (e) {
          return e.message.includes('exceeds 5 MB limit')
        }
      }
    },
    {
      name: 'Valid request creation succeeds and increments request count',
      test: () => {
        const initialCount = changeRequestStorage.getRequests('farmer', farmerUser).length
        const created = changeRequestStorage.createRequest({
          type: 'add_device',
          description: 'Please add a new solar telemetry monitor to the south quadrant boundary.',
          urgency: 'Normal'
        }, farmerUser)
        const newCount = changeRequestStorage.getRequests('farmer', farmerUser).length
        return created.requestNumber.startsWith('REQ-2026-') && newCount === initialCount + 1
      }
    },
    {
      name: 'Farmer can reply when status is Needs more info',
      test: () => {
        const updated = changeRequestStorage.replyToRequest('req-demo-3', 'Here is the survey passbook number details as requested.', farmerUser)
        return updated.status === REQUEST_STATUSES.UNDER_REVIEW && updated.history.length === 3
      }
    },
    {
      name: 'Admin can update status to Approved with adminNote',
      test: () => {
        const updated = changeRequestStorage.updateStatus('req-demo-1', {
          status: REQUEST_STATUSES.APPROVED,
          adminNote: 'Boundary coordinates verified with land revenue map.'
        })
        return updated.status === REQUEST_STATUSES.APPROVED && updated.adminNote.includes('Boundary coordinates')
      }
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

  console.log(`\nchangeRequestStorage results: ${passed} passed, ${failed} failed.`)
  if (failed > 0) process.exit(1)
}

runTests()
