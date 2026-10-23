import React, { useState, useEffect } from 'react'
import Icon from '../components/common/Icon'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import farmStorage from '../lib/farmStorage'
import toast from '../components/ui/Toast'
import ScratchMapDigitizerModal from '../components/survey/ScratchMapDigitizerModal'
import { parseCoordinates } from '../lib/coordinateParser'
import LocationPickerMiniMap from '../components/map/LocationPickerMiniMap'
import ViewLocationModal from '../components/map/ViewLocationModal'

export default function FarmersManagementPage() {
  const { user } = useAuth()
  const currentRole = user?.role || 'admin'
  const isLandVerifier = currentRole === 'land_verifier'
  const isVerifier = currentRole === 'verifier'
  const [farmers, setFarmers] = useState([])
  const [pendingRegistrations, setPendingRegistrations] = useState([])
  const [consumerDealers, setConsumerDealers] = useState([])
  const [activeTab, setActiveTab] = useState('farmers') // 'farmers' | 'consumers_dealers'
  const [search, setSearch] = useState('')
  const [cdSearch, setCdSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showScratchMapModal, setShowScratchMapModal] = useState(false)
  const [editingFarmer, setEditingFarmer] = useState(null)
  const [deleteConfirmFarmer, setDeleteConfirmFarmer] = useState(null)

  // ── Modals & Location States for Customer and Dealer ──
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false)
  const [customerForm, setCustomerForm] = useState({
    full_name: '',
    contact_number: '',
    email: '',
    password: 'consumer123',
    area_place: '',
    location: null,
  })

  const [showAddDealerModal, setShowAddDealerModal] = useState(false)
  const [dealerForm, setDealerForm] = useState({
    full_name: '',
    contact_number: '',
    email: '',
    password: 'dealer123',
    area_place: '',
    location: null,
  })

  const [viewLocationItem, setViewLocationItem] = useState(null)

  // ── Coordinate Go-To Navigator State ──
  const [coordGoName, setCoordGoName] = useState('')
  const [coordGoValue, setCoordGoValue] = useState('')
  const [coordGoError, setCoordGoError] = useState('')

  const handleCoordGo = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setCoordGoError('')
    const parsed = parseCoordinates(coordGoValue)
    if (!parsed.ok) {
      setCoordGoError(parsed.error)
      return
    }
    const label = coordGoName.trim() || `${parsed.lat.toFixed(5)}, ${parsed.lng.toFixed(5)}`
    // Navigate to Admin Land Editor with coordinates in query params
    const params = new URLSearchParams({
      flyLat: parsed.lat,
      flyLng: parsed.lng,
      flyName: label,
    })
    navigate(`/admin/editor/field-1?${params.toString()}`)
  }
  
  // Approval Modal State
  const [approveModalItem, setApproveModalItem] = useState(null)
  const [approvalForm, setApprovalForm] = useState({ email: '', password: 'farmer123' })

  const navigate = useNavigate()

  // Form state
  const [form, setForm] = useState({
    full_name: '',
    contact_number: '',
    email: '',
    village: '',
    district: '',
    state: 'Gujarat',
    address: '',
    total_acres: '',
    khata_number: '',
    crops_summary: '',
    location: null,
  })

  const loadFarmers = () => {
    setFarmers(farmStorage.getFarmers())
  }

  const loadPending = () => {
    setPendingRegistrations(farmStorage.getPendingFarmerRegistrations())
  }

  const loadConsumerDealers = () => {
    setConsumerDealers(farmStorage.getConsumerAndDealerUsers())
  }

  useEffect(() => {
    loadFarmers()
    loadPending()
    loadConsumerDealers()
  }, [])

  const handleOpenApproveModal = (pendingItem) => {
    setApproveModalItem(pendingItem)
    const cleanName = (pendingItem.full_name || 'farmer').toLowerCase().replace(/[^a-z0-9]/g, '')
    setApprovalForm({
      email: `${cleanName}@farmxt.com`,
      password: 'farmer123',
    })
  }

  const handleConfirmApproval = (e) => {
    e.preventDefault()
    if (!approveModalItem) return
    const result = farmStorage.approveFarmerRegistration(
      approveModalItem.id,
      approvalForm.email,
      approvalForm.password
    )
    if (result) {
      toast.success(`Farmer "${approveModalItem.full_name}" Approved! Credentials created: Email: ${approvalForm.email}, Password: ${approvalForm.password}`)
      loadFarmers()
      loadPending()
      setApproveModalItem(null)
    }
  }

  const handleRejectRegistration = (pendingId) => {
    farmStorage.rejectFarmerRegistration(pendingId)
    toast.info('Registration request rejected.')
    loadPending()
  }

  const filteredFarmers = farmers.filter(f => {
    const q = search.toLowerCase()
    return (
      f.full_name?.toLowerCase().includes(q) ||
      f.address?.toLowerCase().includes(q) ||
      f.khata_number?.toLowerCase().includes(q) ||
      f.crops_summary?.toLowerCase().includes(q)
    )
  })

  const filteredConsumerDealers = consumerDealers.filter(u => {
    const q = cdSearch.toLowerCase()
    return (
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.area_place || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q) ||
      (u.contact_number || '').toLowerCase().includes(q)
    )
  })

  // Open Add Modal
  const openAddModal = () => {
    setForm({
      full_name: '',
      contact_number: '',
      email: '',
      village: '',
      district: '',
      state: 'Gujarat',
      address: '',
      total_acres: '',
      khata_number: '',
      crops_summary: '',
      location: null,
    })
    setShowAddModal(true)
  }

  // Open Edit Modal
  const openEditModal = (farmer) => {
    setEditingFarmer(farmer)
    setForm({
      full_name: farmer.full_name || '',
      contact_number: farmer.contact_number || '',
      email: farmer.email || '',
      village: farmer.village || '',
      district: farmer.district || '',
      state: farmer.state || 'Gujarat',
      address: farmer.address || '',
      total_acres: farmer.total_acres || '',
      khata_number: farmer.khata_number || '',
      crops_summary: farmer.crops_summary || '',
      location: farmer.location || null,
    })
  }

  // Submit Add / Edit Farmer
  const handleSubmit = (e) => {
    e.preventDefault()
    const acres = parseFloat(form.total_acres) || 5.0
    const hectares = +(acres / 2.47105).toFixed(2)

    const payload = {
      ...form,
      total_acres: acres,
      total_hectares: hectares,
    }

    if (editingFarmer) {
      farmStorage.updateFarmer(editingFarmer.id, payload)
      toast.success(`Farmer ${form.full_name} updated successfully!`)
      setEditingFarmer(null)
    } else {
      const created = farmStorage.createFarmer(payload)
      toast.success(`New farmer ${created.full_name} added successfully!`)
      setShowAddModal(false)
    }
    loadFarmers()
  }

  // Submit Add Customer
  const handleAddCustomerSubmit = (e) => {
    e.preventDefault()
    if (!customerForm.full_name || !customerForm.email) return

    const created = farmStorage.createConsumer({
      full_name: customerForm.full_name,
      contact_number: customerForm.contact_number || 'N/A',
      email: customerForm.email,
      password: customerForm.password || 'consumer123',
      area_place: customerForm.area_place || 'Not Specified',
      location: customerForm.location,
    })

    toast.success(`Customer "${created.full_name}" registered successfully!`)
    loadConsumerDealers()
    setShowAddCustomerModal(false)
    setCustomerForm({
      full_name: '',
      contact_number: '',
      email: '',
      password: 'consumer123',
      area_place: '',
      location: null,
    })
  }

  // Submit Add Dealer
  const handleAddDealerSubmit = (e) => {
    e.preventDefault()
    if (!dealerForm.full_name || !dealerForm.email) return

    const created = farmStorage.createDealer({
      full_name: dealerForm.full_name,
      contact_number: dealerForm.contact_number || 'N/A',
      email: dealerForm.email,
      password: dealerForm.password || 'dealer123',
      area_place: dealerForm.area_place || 'Not Specified',
      location: dealerForm.location,
    })

    toast.success(`Agri-Dealer "${created.full_name}" registered successfully!`)
    loadConsumerDealers()
    setShowAddDealerModal(false)
    setDealerForm({
      full_name: '',
      contact_number: '',
      email: '',
      password: 'dealer123',
      area_place: '',
      location: null,
    })
  }

  // Confirm Delete
  const handleDelete = () => {
    if (!deleteConfirmFarmer) return
    farmStorage.deleteFarmer(deleteConfirmFarmer.id)
    toast.success(`Farmer ${deleteConfirmFarmer.full_name} removed.`)
    setDeleteConfirmFarmer(null)
    loadFarmers()
  }

  // Aggregated Stats
  const totalAcres = farmers.reduce((sum, f) => sum + (f.total_acres || 0), 0)
  const totalBorewells = farmers.reduce((sum, f) => sum + (f.borewells_count || 1), 0)
  const totalCCTVs = farmers.reduce((sum, f) => sum + (f.cctv_count || 1), 0)

  // Marketplace Orders for Admin
  const [adminOrdersOpen, setAdminOrdersOpen] = useState(false)
  const allMarketplaceOrders = farmStorage.getMarketplaceOrders()

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100 transition-colors duration-200">

      {/* ── Admin Orders Inbox Drawer ── */}
      {adminOrdersOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAdminOrdersOpen(false)} />
          <div className="w-full max-w-lg bg-white dark:bg-[#120326] h-full shadow-2xl relative z-10 flex flex-col border-l border-gray-200 dark:border-gray-800">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-v2v-deep text-white">
              <h2 className="text-lg font-black flex items-center gap-2">
                📋 Marketplace Orders — Admin View
                {allMarketplaceOrders.length > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{allMarketplaceOrders.length}</span>
                )}
              </h2>
              <button onClick={() => setAdminOrdersOpen(false)} className="text-2xl hover:text-rose-400">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {allMarketplaceOrders.length === 0 ? (
                <div className="text-center text-gray-500 mt-20">
                  <div className="text-5xl mb-3">📭</div>
                  <p className="font-semibold">No marketplace orders yet.</p>
                  <p className="text-xs mt-1">Consumer and dealer orders will appear here once placed.</p>
                </div>
              ) : (
                allMarketplaceOrders.map(order => (
                  <div key={order.id} className="p-4 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${order.type === 'consumer_order' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {order.type === 'consumer_order' ? '🛒 Consumer Order' : '🏢 Dealer Supply Dispatch'}
                      </span>
                      <span className="text-[10px] text-gray-400">{new Date(order.timestamp).toLocaleString('en-IN')}</span>
                    </div>
                    <div className="font-bold text-sm mb-1">{order.itemName}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      <div className="grid grid-cols-2 gap-1">
                        <div>👤 Buyer: <strong>{order.buyerName}</strong></div>
                        <div>🧑‍🌾 Farmer: <strong>{order.farmerName}</strong></div>
                        <div>📦 Qty: <strong>{order.quantity} {order.unit}</strong></div>
                        {order.totalPrice && <div>💰 Value: <strong>₹{order.totalPrice?.toLocaleString()}</strong></div>}
                        {order.deliveryArea && <div>📍 Deliver to: <strong>{order.deliveryArea}</strong></div>}
                        {order.paymentMethod && <div>💳 Payment: <strong>{order.paymentMethod}</strong></div>}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">{order.status}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Top Admin Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-v2v-deep/10 dark:bg-purple-950/80 text-v2v-deep dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50 text-xs font-bold mb-2">
            <span>{currentRole === 'admin' ? '⚙️' : isLandVerifier ? '📐' : '🛡️'}</span>
            <span>{currentRole === 'admin' ? 'Admin Management Console' : isLandVerifier ? 'Land Verifier Console' : 'Verifier Console'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-v2v-deep dark:text-purple-300 tracking-tight">
            {currentRole === 'admin' ? 'Farmers & Surveyors Directory' : 'Farmers Directory'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {currentRole === 'admin'
              ? 'Manage farmers list and surveyor activities.'
              : isLandVerifier
              ? 'Approve farmer registrations and access map editing tools.'
              : 'View farmer details and approve new registrations.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {currentRole === 'admin' && (
            <>
              {/* Marketplace Orders Button */}
              <button
                onClick={() => setAdminOrdersOpen(true)}
                className="relative btn-secondary text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <span>📋</span>
                <span>Marketplace Orders</span>
                {allMarketplaceOrders.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                    {allMarketplaceOrders.length}
                  </span>
                )}
              </button>
              <button
                onClick={openAddModal}
                className="btn-outline text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all"
              >
                <span>+</span>
                <span>Add Farmer</span>
              </button>
            </>
          )}
          {isLandVerifier && (
            <Link
              to="/admin/surveyors"
              className="btn-secondary text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span>👷</span>
              <span>Surveyor Activities</span>
            </Link>
          )}
        </div>
      </div>

      {/* ── Stats Summary Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-semibold">Registered Farmers</div>
          <div className="text-2xl font-extrabold text-v2v-deep dark:text-purple-300 mt-1">{farmers.length}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Active in System</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-semibold">Total Mapped Area</div>
          <div className="text-2xl font-extrabold text-v2v-deep dark:text-purple-300 mt-1">{totalAcres.toFixed(1)} <span className="text-sm font-normal text-gray-500 dark:text-slate-400">Acres</span></div>
          <div className="text-[11px] text-v2v-secondary dark:text-purple-400 font-medium mt-0.5">{(totalAcres / 2.471).toFixed(1)} Hectares</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-semibold">Borewells & Pumps</div>
          <div className="text-2xl font-extrabold text-v2v-deep dark:text-purple-300 mt-1">{totalBorewells}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Telemetry Connected</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-semibold">IoT Telemetry Nodes</div>
          <div className="text-2xl font-extrabold text-v2v-deep dark:text-purple-300 mt-1">{farmers.length * 2 + 3}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Live Streaming</div>
        </div>
      </div>

      {/* ── 🔔 FARM-XT Pending Farmer Registration Notifications & Verification Queue ── */}
      {pendingRegistrations.length > 0 && (
        <div className="bg-purple-950/90 text-white p-5 rounded-2xl border border-purple-500/50 shadow-xl space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-purple-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
              </span>
              <h2 className="text-base font-extrabold text-white tracking-tight">
                🔔 Pending Farmer Registration Requests ({pendingRegistrations.length})
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                {currentRole === 'admin' ? 'Admin Action Required' : isLandVerifier ? 'Land Verifier Review' : 'Verifier Review'}
              </span>
            </div>
            <span className="text-xs text-purple-300 hidden sm:inline">
              Notification sent from FARM-XT Gateway
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRegistrations.map((item) => (
              <div key={item.id} className="bg-purple-900/60 p-4 rounded-xl border border-purple-700/60 flex flex-col justify-between gap-3 hover:border-purple-400/80 transition-all">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-extrabold text-white">{item.full_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-600/40 font-bold uppercase">
                      Age: {item.age || 'N/A'} yrs
                    </span>
                  </div>
                  <div className="text-xs text-purple-200 space-y-1">
                    <div>📍 <strong>Region / Address:</strong> {item.land_address || item.area_region}</div>
                    <div>📞 <strong>Contact:</strong> {item.contact_number}</div>
                    <div>📐 <strong>Land Size:</strong> {item.area_sq_acres}</div>
                    <div className="pt-1 flex flex-wrap gap-1">
                      <span className="text-[10px] text-purple-300 font-bold">Crops Yield:</span>
                      {(item.crops_yield || []).map((crop, cIdx) => (
                        <span key={cIdx} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-200 border border-purple-700">
                          {crop}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-purple-800/60">
                  <button
                    onClick={() => handleOpenApproveModal(item)}
                    className="flex-1 btn-v2v-gradient text-xs py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <span>✅ Approve & Create Credentials</span>
                  </button>
                  <button
                    onClick={() => handleRejectRegistration(item.id)}
                    className="px-3 py-2 text-xs rounded-xl bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800 font-semibold transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Section Directory Switcher (Farmers vs Consumers & Dealers) ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-v2v-lavendergray shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('farmers')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'farmers'
                ? 'bg-v2v-deep text-white shadow-md shadow-v2v-deep/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>🧑‍🌾</span>
            <span>Farmers & Land Directory ({farmers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('consumers_dealers')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'consumers_dealers'
                ? 'bg-v2v-deep text-white shadow-md shadow-v2v-deep/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>🛒</span>
            <span>Consumers ({consumerDealers.filter(u => u.role === 'consumer').length}) & 🏢 Dealers ({consumerDealers.filter(u => u.role === 'dealer').length}) Directory</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium px-2 hidden lg:block">
          {activeTab === 'farmers' ? '🌾 Land & Telemetry Control' : '🛒 Consumers & 🏢 Dealers Directory'}
        </div>
      </div>

      {activeTab === 'farmers' ? (
        <>
          {/* ── Search & Filter Toolbar with Go-To Coordinate Navigator ── */}
          <div className="bg-white p-4 rounded-xl border border-v2v-lavendergray shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search by farmer name, village, survey khata, or crops..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9"
              />
            </div>

            {/* 📍 Go-To Coordinate Navigator (DMS + Decimal) */}
            <form
              onSubmit={handleCoordGo}
              className="relative flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-v2v-lavendergray dark:border-slate-700 px-2.5 py-1.5 rounded-xl shadow-sm"
            >
              <span className="text-sm select-none">📍</span>
              <input
                type="text"
                value={coordGoName}
                onChange={(e) => setCoordGoName(e.target.value)}
                placeholder="Location label (optional)"
                className="bg-transparent text-xs w-28 sm:w-36 focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 hidden sm:block border-r border-gray-200 dark:border-gray-700 pr-2 mr-1"
                aria-label="Location label"
              />
              <input
                type="text"
                value={coordGoValue}
                onChange={(e) => { setCoordGoValue(e.target.value); if (coordGoError) setCoordGoError('') }}
                placeholder={farmers[0] ? `${farmers[0].centroid?.[0] || '10.6585'}, ${farmers[0].centroid?.[1] || '77.0125'}` : "10.6585, 77.0125"}
                className="bg-transparent text-xs w-44 sm:w-52 focus:outline-none text-slate-800 dark:text-slate-100 placeholder:text-gray-400 font-mono"
                aria-label="Enter DMS or decimal coordinates"
              />
              <button
                type="submit"
                className="btn-v2v-gradient text-xs py-1 px-3 rounded-lg font-bold hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
              >
                Go →
              </button>
              {coordGoError && (
                <div className="absolute top-full left-0 mt-1 z-30 bg-rose-600 text-white text-[11px] px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap animate-fadeIn">
                  {coordGoError}
                </div>
              )}
            </form>

            <span className="text-xs text-gray-500">
              Showing <strong>{filteredFarmers.length}</strong> of {farmers.length} farmers
            </span>
          </div>

          {/* ── Farmers Table ── */}
          <div className="bg-white rounded-2xl border border-v2v-lavendergray shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-v2v-softwhite border-b border-v2v-lavendergray text-v2v-deep uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Farmer / Land Details</th>
                    <th className="py-3.5 px-4 font-bold">Khata & Location</th>
                    <th className="py-3.5 px-4 font-bold">Total Area</th>
                    <th className="py-3.5 px-4 font-bold">Hardware & Sensors</th>
                    <th className="py-3.5 px-4 font-bold">Crops Summary</th>
                    <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredFarmers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No farmers found matching "{search}".
                      </td>
                    </tr>
                  ) : (
                    filteredFarmers.map((f) => (
                      <tr key={f.id} className="hover:bg-v2v-softwhite/60 transition-colors">
                        <td
                          className="py-3.5 px-4 cursor-pointer group"
                          onClick={() => navigate(`/farmer?farmerId=${f.id}`)}
                          title="Click to view farm telemetry map"
                        >
                          <div className="font-bold text-gray-900 group-hover:text-v2v-deep flex items-center gap-1.5">
                            <span>{f.full_name}</span>
                            <span className="text-xs text-v2v-secondary font-semibold group-hover:translate-x-0.5 transition-transform">→</span>
                          </div>
                          <div className="text-xs text-gray-500">{f.contact_number}</div>
                          <div className="text-[11px] text-gray-400">{f.email}</div>
                        </td>
                        <td
                          className="py-3.5 px-4 cursor-pointer"
                          onClick={() => navigate(`/farmer?farmerId=${f.id}`)}
                        >
                          <span className="px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-purple-50 text-v2v-deep border border-v2v-lavender/30">
                            {f.khata_number}
                          </span>
                          <div className="text-xs text-gray-600 mt-1 flex items-center gap-1.5 flex-wrap">
                            <span>{f.village || f.district || 'Gujarat'}</span>
                            {f.location && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-0.5">
                                <span>📍</span>
                                <span>Located ({f.location.matchLevel || (f.location.approximate ? 'Approximate' : 'Exact')})</span>
                              </span>
                            )}
                          </div>
                        </td>
                        <td
                          className="py-3.5 px-4 cursor-pointer"
                          onClick={() => navigate(`/farmer?farmerId=${f.id}`)}
                        >
                          <div className="font-extrabold text-v2v-deep">{f.total_acres} Acres</div>
                          <div className="text-xs text-gray-500">{f.total_hectares} Ha</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 text-[11px]">
                            <span className="text-emerald-700 font-semibold">
                              💧 {f.borewells_count || 1} Borewell & Pump
                            </span>
                            <span className="text-v2v-secondary font-semibold">
                              📹 {f.cctv_count || 1} 4K CCTV Camera
                            </span>
                            <span className="text-purple-700 font-semibold">
                              📡 {f.sensors_count || 2} IoT Sensor Nodes
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="text-xs text-gray-700 truncate" title={f.crops_summary}>
                            {f.crops_summary || 'Mango, Cotton, Sugarcane'}
                          </div>
                          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
                            Readiness: {f.readiness_score || 9.0} / 10
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {currentRole === 'admin' && f.location && (
                              <button
                                type="button"
                                onClick={() => setViewLocationItem({ ...f, role: 'farmer' })}
                                className="px-2 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer"
                                title="View Pinned Location on Map"
                              >
                                📍 Location
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/farmer?farmerId=${f.id}`)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-v2v-deep text-white hover:bg-v2v-secondary transition-colors"
                              title="Open Interactive Farm Map"
                            >
                              🗺️ Map
                            </button>
                            {(currentRole === 'admin' || isLandVerifier) && (
                              <Link
                                to={`/admin/editor/${f.field_id || 'field-1'}`}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-v2v-lavendergray text-v2v-deep hover:bg-v2v-softwhite hover:border-v2v-lavender transition-colors"
                                title="Edit Boundary & Devices"
                              >
                                ✏️ Devices
                              </Link>
                            )}
                            {currentRole === 'admin' && (
                              <>
                                <button
                                  onClick={() => openEditModal(f)}
                                  className="p-1.5 text-xs text-gray-500 hover:text-v2v-deep transition-colors"
                                  title="Edit Profile"
                                >
                                  ⚙️
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmFarmer(f)}
                                  className="p-1.5 text-xs text-rose-500 hover:text-rose-700 transition-colors"
                                  title="Delete Farmer"
                                >
                                  🗑️
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* ── Consumers & Dealers View-Only Directory ── */
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-v2v-lavendergray shadow-sm flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[280px]">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search by consumer/dealer name, email, role, or area/place..."
                value={cdSearch}
                onChange={(e) => setCdSearch(e.target.value)}
                className="input-field pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-gray-500">
                Showing <strong>{filteredConsumerDealers.length}</strong> registered accounts
              </span>
              {currentRole === 'admin' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(true)}
                    className="btn-v2v-gradient text-xs py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>+ Add Customer</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddDealerModal(true)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#F59E0B] hover:bg-[#D97706] text-white flex items-center gap-1.5 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <span>+ Add Dealer</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-v2v-lavendergray shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-v2v-softwhite border-b border-v2v-lavendergray text-v2v-deep uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">User / Business Name</th>
                    <th className="py-3.5 px-4 font-bold">Account Role</th>
                    <th className="py-3.5 px-4 font-bold">Area / Place</th>
                    <th className="py-3.5 px-4 font-bold">Contact / Email</th>
                    <th className="py-3.5 px-4 font-bold">Login & Activity Status</th>
                    <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredConsumerDealers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-500">
                        No consumer or dealer accounts found matching "{cdSearch}".
                      </td>
                    </tr>
                  ) : (
                    filteredConsumerDealers.map((user, idx) => (
                      <tr key={idx} className="hover:bg-v2v-softwhite/60 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            <span className="text-base inline-flex items-center"><Icon name={user.role === 'consumer' ? 'cart' : 'store'} size={16} /></span>
                            <span>{user.full_name || user.email}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize border ${
                            user.role === 'consumer'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            {user.role === 'consumer' ? 'Consumer' : 'Agri-Dealer'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-gray-700">
                          <div className="flex items-center gap-1 flex-wrap">
                            <Icon name="mapPin" size={12} className="text-gray-400 inline" />
                            <span>{user.area_place || 'Not Specified'}</span>
                            {currentRole === 'admin' && user.location && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 ml-1">
                                📍 Located ({user.location.matchLevel || (user.location.approximate ? 'Approximate' : 'Exact')})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-gray-900">{user.email}</div>
                          <div className="text-xs text-gray-500">{user.contact_number || 'N/A'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span className="text-xs font-extrabold text-emerald-700">Logged In / Active</span>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            Last Active: {user.last_login_at ? new Date(user.last_login_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {currentRole === 'admin' && user.location && (
                              <button
                                type="button"
                                onClick={() => setViewLocationItem(user)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 text-v2v-deep hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
                                title="View Location on Map"
                              >
                                📍 View location
                              </button>
                            )}
                            <span className="text-[11px] font-mono px-2 py-1 rounded bg-gray-100 text-gray-600 border border-gray-200 font-semibold">
                              <Icon name="eye" size={14} className="inline mr-1" /> View Only
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Farmer Modal ── */}
      {(showAddModal || editingFarmer) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-v2v-lavendergray animate-slide-up">
            <div className="bg-v2v-gradient px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-bold text-base">
                {editingFarmer ? `Edit Farmer: ${editingFarmer.full_name}` : 'Register New Farmer & Land'}
              </h3>
              <button
                onClick={() => { setShowAddModal(false); setEditingFarmer(null); }}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Ramesh Patel"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. +91 98251 44820"
                    value={form.contact_number}
                    onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Email Address</label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="farmer@v2vfarm.in"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Survey / Khata Number *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. KH-88219/GJ"
                    value={form.khata_number}
                    onChange={(e) => setForm({ ...form, khata_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="label">Total Land Area (Acres) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    className="input-field"
                    placeholder="e.g. 18.5"
                    value={form.total_acres}
                    onChange={(e) => setForm({ ...form, total_acres: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Village / Taluk</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Anand Rural"
                    value={form.village}
                    onChange={(e) => setForm({ ...form, village: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">State</label>
                  <input
                    type="text"
                    className="input-field"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Complete Physical Address</label>
                <textarea
                  rows={2}
                  className="input-field"
                  placeholder="Survey No. 142/A, Borsad Road..."
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Crops Cultivated & Varieties</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Alphonso Mango (6.2 Ha), Hybrid Cotton (4.8 Ha), Drip Sugarcane (7.5 Ha)"
                  value={form.crops_summary}
                  onChange={(e) => setForm({ ...form, crops_summary: e.target.value })}
                />
              </div>

              {/* ── Farm Location Section ── */}
              <LocationPickerMiniMap
                role="farmer"
                label="Farm location"
                hint="You can also draw the exact boundary later in the Land & Drawing Editor"
                location={form.location}
                onChange={(loc) => setForm((prev) => ({ ...prev, location: loc }))}
              />

              <div className="bg-purple-50 p-3 rounded-xl border border-v2v-lavender/30 text-xs text-v2v-deep flex items-start gap-2">
                <span>ℹ️</span>
                <span>
                  Adding a new farmer automatically creates an interactive digital land twin initialized with default smart borewell and CCTV markers that you can customize in the Land Editor.
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingFarmer(null); }}
                  className="btn-secondary text-xs py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-v2v-gradient text-xs py-2 px-5 font-semibold"
                >
                  {editingFarmer ? 'Save Changes' : 'Create Farmer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {deleteConfirmFarmer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-v2v-lavendergray shadow-2xl animate-slide-up">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center text-2xl mx-auto">
              ⚠️
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">Delete Farmer Record?</h3>
              <p className="text-xs text-gray-600 mt-2">
                Are you sure you want to remove <strong>{deleteConfirmFarmer.full_name}</strong> and their associated land boundary and telemetry devices?
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmFarmer(null)}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn-danger text-xs py-2 px-4"
              >
                Yes, Delete Farmer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Admin Approval Credentials Generation Modal ── */}
      {approveModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border border-purple-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h3 className="text-lg font-extrabold text-v2v-deep dark:text-purple-300 tracking-tight">
                  Approve & Create Farmer Credentials
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Assign login details for <strong>{approveModalItem.full_name}</strong>
                </p>
              </div>
              <button
                onClick={() => setApproveModalItem(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-purple-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-purple-200 dark:border-slate-700 text-xs text-purple-950 dark:text-purple-200 space-y-1">
              <div><strong>Region:</strong> {approveModalItem.land_address || approveModalItem.area_region}</div>
              <div><strong>Land Area:</strong> {approveModalItem.area_sq_acres}</div>
              <div><strong>Crops Yield:</strong> {(approveModalItem.crops_yield || []).join(', ')}</div>
            </div>

            <form onSubmit={handleConfirmApproval} className="space-y-4 pt-1">
              <div>
                <label className="label">Assigned Farmer Login Email *</label>
                <input
                  type="email"
                  required
                  value={approvalForm.email}
                  onChange={(e) => setApprovalForm({ ...approvalForm, email: e.target.value })}
                  placeholder="farmer.name@farmxt.com"
                  className="input-field"
                />
              </div>

              <div>
                <label className="label">Assigned Password *</label>
                <input
                  type="text"
                  required
                  value={approvalForm.password}
                  onChange={(e) => setApprovalForm({ ...approvalForm, password: e.target.value })}
                  placeholder="farmer123"
                  className="input-field"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setApproveModalItem(null)}
                  className="btn-secondary text-xs py-2.5 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-v2v-gradient text-xs py-2.5 px-5 font-bold shadow-md"
                >
                  Approve & Generate Credentials →
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Customer Modal ── */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A112B] rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-v2v-lavendergray dark:border-purple-800/60 animate-slide-up">
            <div className="bg-v2v-gradient px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <span>👤</span>
                  <span>Register New Customer</span>
                </h3>
                <p className="text-xs text-purple-100 mt-0.5">
                  Create a consumer profile with delivery location pin
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Ananya Sharma"
                    value={customerForm.full_name}
                    onChange={(e) => setCustomerForm({ ...customerForm, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. +91 98452 11029"
                    value={customerForm.contact_number}
                    onChange={(e) => setCustomerForm({ ...customerForm, contact_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Email Address *</label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    placeholder="consumer@farmxt.com"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Account Password *</label>
                  <input
                    type="text"
                    required
                    className="input-field font-mono"
                    placeholder="consumer123"
                    value={customerForm.password}
                    onChange={(e) => setCustomerForm({ ...customerForm, password: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Delivery Area / City *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Anand & Vadodara, Gujarat"
                  value={customerForm.area_place}
                  onChange={(e) => setCustomerForm({ ...customerForm, area_place: e.target.value })}
                />
              </div>

              {/* Delivery Location Section */}
              <LocationPickerMiniMap
                role="consumer"
                label="Delivery location"
                hint="Choose where harvest produce and retail supplies should be dispatched"
                location={customerForm.location}
                onChange={(loc) => setCustomerForm((prev) => ({ ...prev, location: loc }))}
              />

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="btn-secondary text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-v2v-gradient text-xs py-2 px-5 font-semibold cursor-pointer shadow-md"
                >
                  Register Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Dealer Modal ── */}
      {showAddDealerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#1A112B] rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl border border-v2v-lavendergray dark:border-purple-800/60 animate-slide-up">
            <div className="bg-[#D97706] bg-gradient-to-r from-amber-600 to-amber-500 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <span>🏪</span>
                  <span>Register New Agri-Dealer</span>
                </h3>
                <p className="text-xs text-amber-100 mt-0.5">
                  Create a dealer profile with shop or warehouse location
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDealerModal(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddDealerSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Business / Shop Name *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. Kisan Fertilizer & Seed Depot"
                    value={dealerForm.full_name}
                    onChange={(e) => setDealerForm({ ...dealerForm, full_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="e.g. +91 97112 88431"
                    value={dealerForm.contact_number}
                    onChange={(e) => setDealerForm({ ...dealerForm, contact_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Email Address *</label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    placeholder="dealer@farmxt.com"
                    value={dealerForm.email}
                    onChange={(e) => setDealerForm({ ...dealerForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Account Password *</label>
                  <input
                    type="text"
                    required
                    className="input-field font-mono"
                    placeholder="dealer123"
                    value={dealerForm.password}
                    onChange={(e) => setDealerForm({ ...dealerForm, password: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Business Area / Location *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Guntur Highway, AP"
                  value={dealerForm.area_place}
                  onChange={(e) => setDealerForm({ ...dealerForm, area_place: e.target.value })}
                />
              </div>

              {/* Shop / Business Location Section */}
              <LocationPickerMiniMap
                role="dealer"
                label="Shop / business location"
                hint="Choose the storefront, wholesale depot, or pickup point location"
                location={dealerForm.location}
                onChange={(loc) => setDealerForm((prev) => ({ ...prev, location: loc }))}
              />

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddDealerModal(false)}
                  className="btn-secondary text-xs py-2 px-4 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#D97706] hover:bg-[#B45309] text-white shadow-md transition-colors cursor-pointer"
                >
                  Register Dealer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Location Map Modal ── */}
      <ViewLocationModal
        isOpen={Boolean(viewLocationItem)}
        onClose={() => setViewLocationItem(null)}
        item={viewLocationItem}
      />
      <ScratchMapDigitizerModal
        isOpen={showScratchMapModal}
        onClose={() => setShowScratchMapModal(false)}
        onCreatedFarmer={(newFarmer) => {
          loadFarmers()
          navigate(`/farmer?farmerId=${newFarmer.id}`)
        }}
        onSaved={(newFarmer) => {
          loadFarmers()
          navigate(`/farmer?farmerId=${newFarmer.id}`)
        }}
      />
    </div>
  )
}
