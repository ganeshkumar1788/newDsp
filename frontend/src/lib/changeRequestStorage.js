/**
 * changeRequestStorage.js — Additive Storage for Farmer Change Requests
 *
 * NON-NEGOTIABLE RULE: This store is completely additive and isolated.
 * It uses the dedicated localStorage key 'agrimap.changeRequests.v1'.
 * It NEVER modifies, migrates, or joins into existing farmer data tables or keys.
 */

const STORAGE_KEY = 'agrimap.changeRequests.v1'
const RATE_LIMIT_KEY = 'agrimap.changeRequests.rateLimit.v1'

export const REQUEST_TYPES = [
  { id: 'add_device', label: 'Add a device (borewell, CCTV camera, IoT sensor, power/solar)', icon: 'Plus', targetType: 'device' },
  { id: 'report_device_problem', label: 'Report a device problem', icon: 'AlertTriangle', targetType: 'device' },
  { id: 'move_device', label: 'Move or correct a device location', icon: 'MapPin', targetType: 'device' },
  { id: 'correct_boundary', label: 'Correct my farm boundary', icon: 'Shield', targetType: 'boundary' },
  { id: 'change_crop_zone', label: 'Add or change a crop zone', icon: 'Sprout', targetType: 'zone' },
  { id: 'add_infrastructure', label: 'Add a pipeline, road or fence', icon: 'Route', targetType: 'line' },
  { id: 'update_farm_details', label: 'Update farm details (survey number, address, area)', icon: 'FileText', targetType: 'farm' },
  { id: 'request_report', label: 'Request a data report or export', icon: 'BarChart3', targetType: 'none' },
  { id: 'other', label: 'Other inquiry or request', icon: 'HelpCircle', targetType: 'none' },
]

export const REQUEST_STATUSES = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under review',
  NEEDS_MORE_INFO: 'Needs more info',
  APPROVED: 'Approved',
  COMPLETED: 'Completed',
  REJECTED: 'Rejected',
}

const INITIAL_DEMO_REQUESTS = [
  {
    id: 'req-demo-1',
    requestNumber: 'REQ-2026-001',
    farmId: 'field-1',
    farmerId: 'farmer-1',
    farmerName: 'Ganesh V.',
    type: 'add_device',
    targetType: 'device',
    targetId: null,
    targetName: 'Solar Borewell #2 (South Basin)',
    description: 'We recently commissioned a secondary 7.5 HP solar pump near the south boundary coconut zone. Please add this borewell marker to our farm map with telemetry integration.',
    proposedGeometry: {
      type: 'Point',
      coordinates: [77.0135, 10.6585],
    },
    attachments: [
      {
        id: 'att-1',
        name: 'solar_pump_installation.jpg',
        type: 'image/jpeg',
        size: 245000,
        dataUrl: '/images/products/groundnut_oil.jpg',
      },
    ],
    urgency: 'Normal',
    contact: 'in_app',
    status: 'Submitted',
    adminNote: '',
    createdAt: '2026-10-18T09:30:00Z',
    updatedAt: '2026-10-18T09:30:00Z',
    history: [
      {
        status: 'Submitted',
        timestamp: '2026-10-18T09:30:00Z',
        actor: 'Ganesh V. (Farmer)',
        note: 'Request submitted for Admin review.',
      },
    ],
  },
  {
    id: 'req-demo-2',
    requestNumber: 'REQ-2026-002',
    farmId: 'field-1',
    farmerId: 'farmer-1',
    farmerName: 'Ganesh V.',
    type: 'report_device_problem',
    targetType: 'device',
    targetId: 'res-bw-1',
    targetName: 'Primary Solar Borewell #1',
    description: 'Borewell pressure drop observed during morning cycle (flow dropped from 150 LPM to 85 LPM). Water sensor reading fluctuates intermittently.',
    proposedGeometry: {
      type: 'Point',
      coordinates: [77.0118, 10.6578],
    },
    attachments: [],
    urgency: 'Urgent',
    contact: 'phone',
    status: 'Under review',
    adminNote: 'Admin team has flagged this for Field Surveyor Kishore to run voltage and pressure diagnostics.',
    createdAt: '2026-10-17T11:15:00Z',
    updatedAt: '2026-10-17T14:20:00Z',
    history: [
      {
        status: 'Submitted',
        timestamp: '2026-10-17T11:15:00Z',
        actor: 'Ganesh V. (Farmer)',
        note: 'Urgent telemetry issue reported.',
      },
      {
        status: 'Under review',
        timestamp: '2026-10-17T14:20:00Z',
        actor: 'Admin',
        note: 'Assigned to telemetry verification queue.',
      },
    ],
  },
  {
    id: 'req-demo-3',
    requestNumber: 'REQ-2026-003',
    farmId: 'field-1',
    farmerId: 'farmer-1',
    farmerName: 'Ganesh V.',
    type: 'correct_boundary',
    targetType: 'boundary',
    targetId: 'field-1',
    targetName: 'North-Eastern Fence Line',
    description: 'The north-east boundary line extends 4 meters further east towards the canal road than shown. Attached land revenue passbook survey coordinates.',
    proposedGeometry: {
      type: 'LineString',
      coordinates: [
        [77.0162, 10.6608],
        [77.0168, 10.6612],
        [77.0171, 10.6615],
      ],
    },
    attachments: [],
    urgency: 'Normal',
    contact: 'in_app',
    status: 'Needs more info',
    adminNote: 'Please attach a copy of the updated Patta / Chitta document showing the sub-division sketch.',
    createdAt: '2026-10-15T08:00:00Z',
    updatedAt: '2026-10-16T10:00:00Z',
    history: [
      {
        status: 'Submitted',
        timestamp: '2026-10-15T08:00:00Z',
        actor: 'Ganesh V. (Farmer)',
        note: 'Boundary correction requested.',
      },
      {
        status: 'Needs more info',
        timestamp: '2026-10-16T10:00:00Z',
        actor: 'Admin',
        note: 'Please attach a copy of the updated Patta / Chitta document showing the sub-division sketch.',
      },
    ],
  },
]

function getStoredRequests() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.warn('[changeRequestStorage] Failed to read requests from storage:', e)
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_DEMO_REQUESTS))
  } catch (e) {
    /* ignore */
  }
  return [...INITIAL_DEMO_REQUESTS]
}

// Simple IndexedDB store for attachments exceeding localStorage quota (e.g. 5MB)
async function storeAttachmentInIDB(attachment) {
  if (typeof window === 'undefined' || !window.indexedDB) return
  return new Promise((resolve) => {
    try {
      const openReq = window.indexedDB.open('v2v_change_requests_attachments_v1', 1)
      openReq.onupgradeneeded = (e) => {
        const db = e.target.result
        if (!db.objectStoreNames.contains('attachments')) {
          db.createObjectStore('attachments', { keyPath: 'id' })
        }
      }
      openReq.onsuccess = () => {
        const db = openReq.result
        const tx = db.transaction('attachments', 'readwrite')
        tx.objectStore('attachments').put(attachment)
        tx.oncomplete = () => resolve(true)
        tx.onerror = () => resolve(false)
      }
      openReq.onerror = () => resolve(false)
    } catch (e) {
      resolve(false)
    }
  })
}

function saveRequests(requests) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests))
    window.dispatchEvent(new CustomEvent('agrimap:change-requests-updated'))
  } catch (e) {
    console.warn('[changeRequestStorage] localStorage full, falling back to IndexedDB for large attachments:', e)
    // Strip heavy base64 dataUrl from attachments before saving to localStorage
    const leanRequests = requests.map((r) => ({
      ...r,
      attachments: (r.attachments || []).map((att) => {
        if (att.dataUrl && att.dataUrl.length > 50000) {
          storeAttachmentInIDB(att)
          return { ...att, dataUrl: null, storedInIndexedDB: true }
        }
        return att
      }),
    }))

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(leanRequests))
      window.dispatchEvent(new CustomEvent('agrimap:change-requests-updated'))
    } catch (err2) {
      console.error('[changeRequestStorage] Quota exceeded after stripping attachments:', err2)
    }
  }
}

export const changeRequestStorage = {
  /**
   * Retrieves requests filtered by caller role.
   * Farmers can ONLY access requests matching their farmerId or farmId.
   * Admins and Surveyors can inspect all requests.
   */
  getRequests: (role, user) => {
    const all = getStoredRequests()
    if (role === 'farmer') {
      const farmerId = user?.farmer_id || user?.id || 'farmer-1'
      return all.filter((r) => r.farmerId === farmerId)
    }
    return all
  },

  /**
   * Retrieves a single request by ID with role ownership check
   */
  getRequestById: (id, role, user) => {
    const all = getStoredRequests()
    const req = all.find((r) => r.id === id)
    if (!req) return null
    if (role === 'farmer') {
      const farmerId = user?.farmer_id || user?.id || 'farmer-1'
      if (req.farmerId !== farmerId) {
        throw new Error('Access denied: You can only view your own requests.')
      }
    }
    return req
  },

  /**
   * Submits a new change request with strict validation and rate limiting
   */
  createRequest: (payload, user) => {
    const farmerId = user?.farmer_id || user?.id || 'farmer-1'
    const farmerName = user?.full_name || 'Ganesh V.'
    const farmId = user?.field_id || 'field-1'

    // Rate Limiting (Max 10 requests / hour / farmer)
    const now = Date.now()
    let rateData = []
    try {
      const rawRate = localStorage.getItem(RATE_LIMIT_KEY)
      if (rawRate) rateData = JSON.parse(rawRate)
    } catch (e) {}
    rateData = rateData.filter((item) => item.farmerId === farmerId && now - item.timestamp < 3600000)
    if (rateData.length >= 10) {
      throw new Error('Hourly rate limit exceeded (maximum 10 requests per hour). Please try again later.')
    }

    // Validation: Description 20 - 1000 chars
    const desc = (payload.description || '').trim()
    if (desc.length < 20 || desc.length > 1000) {
      throw new Error('Description must be between 20 and 1000 characters.')
    }

    // Validation: Attachments <= 3, each <= 5MB, format check
    const attachments = Array.isArray(payload.attachments) ? payload.attachments : []
    if (attachments.length > 3) {
      throw new Error('Maximum 3 attachments allowed.')
    }
    for (const att of attachments) {
      if (att.size && att.size > 5 * 1024 * 1024) {
        throw new Error(`Attachment ${att.name || 'file'} exceeds 5 MB limit.`)
      }
    }

    const all = getStoredRequests()
    const nextSeq = all.length + 1
    const requestNumber = `REQ-2026-${String(nextSeq).padStart(3, '0')}`
    const id = `req-${Date.now()}-${Math.floor(Math.random() * 1000)}`

    const newRequest = {
      id,
      requestNumber,
      farmId,
      farmerId,
      farmerName,
      type: payload.type || 'other',
      targetType: payload.targetType || 'none',
      targetId: payload.targetId || null,
      targetName: payload.targetName || '',
      description: desc,
      proposedGeometry: payload.proposedGeometry || null,
      attachments,
      urgency: payload.urgency === 'Urgent' ? 'Urgent' : 'Normal',
      contact: payload.contact === 'phone' ? 'phone' : 'in_app',
      status: REQUEST_STATUSES.SUBMITTED,
      adminNote: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          status: REQUEST_STATUSES.SUBMITTED,
          timestamp: new Date().toISOString(),
          actor: `${farmerName} (Farmer)`,
          note: 'Change request submitted for Admin review.',
        },
      ],
    }

    const updated = [newRequest, ...all]
    saveRequests(updated)

    // Record rate limit entry
    rateData.push({ farmerId, timestamp: now })
    try {
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(rateData))
    } catch (e) {}

    return newRequest
  },

  /**
   * Admin-only status decision update
   */
  updateStatus: (id, { status, adminNote = '', actor = 'Admin' }) => {
    const all = getStoredRequests()
    const index = all.findIndex((r) => r.id === id)
    if (index === -1) throw new Error('Request not found.')

    const current = all[index]
    const updated = {
      ...current,
      status,
      adminNote: adminNote || current.adminNote,
      updatedAt: new Date().toISOString(),
      history: [
        ...current.history,
        {
          status,
          timestamp: new Date().toISOString(),
          actor,
          note: adminNote || `Status updated to ${status}.`,
        },
      ],
    }

    all[index] = updated
    saveRequests(all)
    return updated
  },

  /**
   * Farmer reply when status is "Needs more info"
   */
  replyToRequest: (id, replyMessage, user) => {
    const farmerId = user?.farmer_id || user?.id || 'farmer-1'
    const farmerName = user?.full_name || 'Ganesh V.'
    const all = getStoredRequests()
    const index = all.findIndex((r) => r.id === id)
    if (index === -1) throw new Error('Request not found.')

    const current = all[index]
    if (current.farmerId !== farmerId) {
      throw new Error('Access denied: You can only reply to your own requests.')
    }
    if (current.status !== REQUEST_STATUSES.NEEDS_MORE_INFO) {
      throw new Error('Replies are only permitted when the request status is "Needs more info".')
    }

    const updated = {
      ...current,
      status: REQUEST_STATUSES.UNDER_REVIEW,
      updatedAt: new Date().toISOString(),
      history: [
        ...current.history,
        {
          status: REQUEST_STATUSES.UNDER_REVIEW,
          timestamp: new Date().toISOString(),
          actor: `${farmerName} (Farmer Reply)`,
          note: replyMessage,
        },
      ],
    }

    all[index] = updated
    saveRequests(all)
    return updated
  },

  /**
   * Farmer cancel while status is "Submitted"
   */
  cancelRequest: (id, user) => {
    const farmerId = user?.farmer_id || user?.id || 'farmer-1'
    const all = getStoredRequests()
    const index = all.findIndex((r) => r.id === id)
    if (index === -1) throw new Error('Request not found.')

    const current = all[index]
    if (current.farmerId !== farmerId) {
      throw new Error('Access denied: You can only cancel your own requests.')
    }
    if (current.status !== REQUEST_STATUSES.SUBMITTED) {
      throw new Error('Requests can only be cancelled while in "Submitted" status.')
    }

    const updated = {
      ...current,
      status: REQUEST_STATUSES.REJECTED,
      adminNote: 'Cancelled by farmer.',
      updatedAt: new Date().toISOString(),
      history: [
        ...current.history,
        {
          status: REQUEST_STATUSES.REJECTED,
          timestamp: new Date().toISOString(),
          actor: `${user?.full_name || 'Farmer'} (Cancelled)`,
          note: 'Farmer withdrew this request.',
        },
      ],
    }

    all[index] = updated
    saveRequests(all)
    return updated
  },

  /**
   * Unread badge count
   */
  getUnreadCount: (role, user) => {
    const list = changeRequestStorage.getRequests(role, user)
    if (role === 'farmer') {
      // Farmer unread: status updates from admin (Needs more info, Approved, Completed, Rejected)
      return list.filter((r) => r.status === REQUEST_STATUSES.NEEDS_MORE_INFO || r.status === REQUEST_STATUSES.APPROVED).length
    }
    // Admin unread: pending review
    return list.filter((r) => r.status === REQUEST_STATUSES.SUBMITTED).length
  },
}
