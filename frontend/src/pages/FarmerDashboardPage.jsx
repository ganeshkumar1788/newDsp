import React, { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import farmStorage from '../lib/farmStorage'
import { changeRequestStorage } from '../lib/changeRequestStorage'
import AgriMap from '../components/map/AgriMap'
import FarmerChangeRequestModal from '../components/farmer/FarmerChangeRequestModal'
import FarmerRequestsDrawer from '../components/farmer/FarmerRequestsDrawer'
import DiagnosticsModal from '../components/common/DiagnosticsModal'
import ExactLocationPanel from '../components/map/ExactLocationPanel'
import { Sparkles, ClipboardList, Inbox, User, CheckCircle2 } from 'lucide-react'

export default function FarmerDashboardPage() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [farmers, setFarmers] = useState([])

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const queryFarmerId = searchParams.get('farmerId') || location.state?.farmerId

  const [selectedFarmerId, setSelectedFarmerId] = useState(queryFarmerId || 'farmer-1')
  const [geojson, setGeojson] = useState(null)
  const [activeModal, setActiveModal] = useState(null) // { type, data }

  // Farmer Change Request Workflow State
  const [requestModalOpen, setRequestModalOpen] = useState(false)
  const [requestPrefill, setRequestPrefill] = useState(null)
  const [requestsDrawerOpen, setRequestsDrawerOpen] = useState(false)
  const [unresolvedRequestsCount, setUnresolvedRequestsCount] = useState(0)

  // Orders Inbox State
  const [ordersInboxOpen, setOrdersInboxOpen] = useState(false)

  // Sync selectedFarmerId if query params change, locking farmer to their own farm
  useEffect(() => {
    if (user?.role === 'farmer') {
      const myId = user.farmer_id || 'farmer-1'
      setSelectedFarmerId(myId)
    } else if (queryFarmerId && queryFarmerId !== selectedFarmerId) {
      setSelectedFarmerId(queryFarmerId)
    }
  }, [user, queryFarmerId])

  // Load farmers and selected farm GeoJSON
  useEffect(() => {
    const all = farmStorage.getFarmers()
    setFarmers(all)
    const current = all.find((f) => f.id === selectedFarmerId) || all[0]
    if (current) {
      const data = farmStorage.getFieldGeoJSON(current.field_id)
      setGeojson(data)
    }
  }, [selectedFarmerId])

  const currentFarmer = useMemo(() => {
    return farmers.find((f) => f.id === selectedFarmerId) || farmers[0]
  }, [farmers, selectedFarmerId])

  // Track unresolved change requests for the badge
  useEffect(() => {
    const updateRequestCount = () => {
      try {
        const reqs = changeRequestStorage.getRequests(
          'farmer',
          user || { farmer_id: selectedFarmerId, id: selectedFarmerId }
        )
        const active = reqs.filter((r) => !['Completed', 'Rejected'].includes(r.status))
        setUnresolvedRequestsCount(active.length)
      } catch (e) {
        console.error('Error fetching request count:', e)
      }
    }

    updateRequestCount()
    window.addEventListener('agrimap:change-requests-updated', updateRequestCount)
    return () => window.removeEventListener('agrimap:change-requests-updated', updateRequestCount)
  }, [user, selectedFarmerId])

  // Marketplace Orders for this farmer
  const farmerOrders = useMemo(() => {
    const allOrders = farmStorage.getMarketplaceOrders()
    const farmerName = currentFarmer?.full_name || ''
    return allOrders.filter(
      (o) =>
        farmerName &&
        o.farmerName &&
        o.farmerName.toLowerCase().includes(farmerName.split(' ')[0]?.toLowerCase() || '')
    )
  }, [currentFarmer])

  return (
    <div className="flex flex-col h-full bg-[#F4F3F9] dark:bg-[#131313] overflow-hidden relative">
      {/* ── Orders Inbox Drawer ── */}
      {ordersInboxOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOrdersInboxOpen(false)}
          />
          <div className="w-full max-w-md bg-white dark:bg-[#1E1035] h-full shadow-2xl relative z-10 flex flex-col border-l border-gray-200 dark:border-gray-800">
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-emerald-50 dark:bg-emerald-950/40">
              <h2 className="text-lg font-black text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                <Inbox size={20} className="text-emerald-600 dark:text-emerald-400" />
                <span>Orders Inbox</span>
                {farmerOrders.length > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {farmerOrders.length}
                  </span>
                )}
              </h2>
              <button
                onClick={() => setOrdersInboxOpen(false)}
                className="text-2xl text-gray-500 hover:text-rose-500 transition-colors cursor-pointer"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {farmerOrders.length === 0 ? (
                <div className="text-center text-gray-500 mt-20">
                  <div className="text-5xl mb-3">📭</div>
                  <p className="font-semibold text-gray-700 dark:text-gray-300">No orders yet.</p>
                  <p className="text-xs text-gray-500 mt-1">Orders from consumers & dealers will appear here.</p>
                </div>
              ) : (
                farmerOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 rounded-xl border bg-white dark:bg-[#2A0C58]/30 border-emerald-200 dark:border-emerald-800/50 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          order.type === 'consumer_order'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200'
                        }`}
                      >
                        {order.type === 'consumer_order' ? '🛒 Consumer Order' : '🏢 Dealer Supply'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(order.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                      {order.itemName}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                      <div>
                        👤 From: <strong>{order.buyerName}</strong> ({order.buyerRole})
                      </div>
                      <div>
                        📦 Qty: <strong>{order.quantity} {order.unit}</strong>
                      </div>
                      {order.totalPrice && (
                        <div>
                          💰 Total: <strong>₹{order.totalPrice?.toLocaleString()}</strong>
                        </div>
                      )}
                      {order.deliveryArea && (
                        <div>
                          📍 Deliver to: <strong>{order.deliveryArea}</strong>
                        </div>
                      )}
                      {order.paymentMethod && (
                        <div>
                          💳 Payment: <strong>{order.paymentMethod}</strong>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Top Header / Farm Selector & Quick Bar ── */}
      <div className="bg-white dark:bg-[#1E1035] border-b border-gray-200 dark:border-gray-800 px-4 py-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8A57C0] to-[#2A0C58] text-white flex items-center justify-center text-xl shadow-md shadow-[#8A57C0]/30 shrink-0">
            🌾
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                {currentFarmer?.full_name || 'Farmer Farmland'}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F4F3F9] dark:bg-[#2A0C58] text-[#8A57C0] dark:text-[#D9C7FF] border border-[#D9C7FF]/40 font-mono">
                {currentFarmer?.khata_number || 'Khata #'}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 flex-wrap mt-0.5">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('agrimap:recenter-farm'))
                }}
                className="hover:text-[#8A57C0] dark:hover:text-[#D9C7FF] hover:underline flex items-center gap-1 cursor-pointer transition-colors text-left"
                title="Go to my farm — Recenter map on your boundary"
                aria-label="Go to my farm boundary"
              >
                <span>📍 {currentFarmer?.address || 'Pollachi, Tamil Nadu'}</span>
                <span className="text-[10px] bg-[#8A57C0]/15 text-[#8A57C0] dark:text-[#D9C7FF] px-1.5 py-0.5 rounded-md font-bold ml-1">
                  Go to my farm
                </span>
              </button>
              <span>•</span>
              <span className="text-[#2A0C58] dark:text-[#B890F9] font-bold">
                {currentFarmer?.total_acres || 21.4} Registered Acres
              </span>
              <span>({currentFarmer?.total_hectares || 8.66} Ha)</span>
            </div>
          </div>
        </div>

        {/* Action Chips & CTA Bar */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Farm Switcher for multi-farm preview */}
          {user?.role !== 'farmer' && (
            <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300 bg-[#F4F3F9] dark:bg-[#2A0C58]/60 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded-xl shadow-inner">
              <span className="text-gray-400 font-medium hidden sm:inline">Farm:</span>
              <select
                value={selectedFarmerId}
                onChange={(e) => {
                  setSelectedFarmerId(e.target.value)
                  navigate(`/farmer?farmerId=${e.target.value}`, { replace: true })
                }}
                className="bg-transparent font-bold text-[#2A0C58] dark:text-[#D9C7FF] focus:outline-none cursor-pointer"
              >
                {farmers.map((f) => (
                  <option key={f.id} value={f.id} className="bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white">
                    {f.full_name} ({f.total_acres} Ac · {f.district || f.village})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grid Status Chip */}
          <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">3-Phase Grid Active</span>
            <span className="sm:hidden">Grid On</span>
          </div>

          {/* Orders Inbox Chip */}
          <button
            type="button"
            onClick={() => setOrdersInboxOpen(true)}
            className="relative flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="View incoming orders from consumers and dealers"
          >
            <Inbox size={14} className="text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Orders</span>
            {farmerOrders.length > 0 && (
              <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-sm">
                {farmerOrders.length}
              </span>
            )}
          </button>

          {/* My Requests Chip with live unread badge */}
          <button
            type="button"
            onClick={() => setRequestsDrawerOpen(true)}
            className="relative flex items-center gap-1.5 bg-[#F4F3F9] dark:bg-[#2A0C58]/60 hover:bg-purple-100 text-[#2A0C58] dark:text-[#D9C7FF] border border-[#D9C7FF]/40 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Open change requests timeline drawer"
          >
            <ClipboardList size={14} className="text-[#8A57C0] dark:text-[#B890F9]" />
            <span>My Requests</span>
            {unresolvedRequestsCount > 0 && (
              <span className="bg-[#8A57C0] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shadow-sm animate-pulse">
                {unresolvedRequestsCount}
              </span>
            )}
          </button>

          {/* Request a Change CTA Button */}
          <button
            type="button"
            onClick={() => {
              setRequestPrefill(null)
              setRequestModalOpen(true)
            }}
            className="flex items-center gap-1.5 bg-gradient-to-r from-[#8A57C0] to-[#2A0C58] hover:from-[#7A47B0] hover:to-[#1E0942] text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-[#8A57C0]/30 active:scale-95 cursor-pointer"
            title="Submit a change request to your land administrator"
          >
            <Sparkles size={14} className="text-[#F4F3F9] animate-pulse" />
            <span>Request a change</span>
          </button>

          {/* Profile & Stats Button */}
          <button
            type="button"
            onClick={() => setActiveModal({ type: 'field', data: currentFarmer })}
            className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            title="Farm profile & details"
            aria-label="Farm profile & details"
          >
            <User size={18} />
          </button>
        </div>
      </div>

      {/* ── Main Map View Powered by Unified AgriMap ── */}
      <div className="flex-1 w-full relative z-0 min-h-0">
        <AgriMap
          role={user?.role === 'admin' || user?.role === 'surveyor' ? 'admin' : 'farmer'}
          farm={currentFarmer}
          geojson={geojson}
          onRequestChange={(prefill) => {
            setRequestPrefill(prefill || null)
            setRequestModalOpen(true)
          }}
          user={user}
          height="100%"
          className="w-full h-full"
        />

        {/* ── Admin-Only Exact Location & Geocoding Studio Panel ── */}
        {(user?.role === 'admin' || user?.role === 'surveyor' || user?.role === 'land_verifier') && (
          <ExactLocationPanel
            role={user.role}
            farmer={currentFarmer}
            geojson={geojson}
            allFarmers={farmers}
          />
        )}
      </div>

      {/* ── Farmer Change Request Modal (9 Types) ── */}
      <FarmerChangeRequestModal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        prefill={requestPrefill}
        user={user}
        farm={currentFarmer}
        geojson={geojson}
      />

      {/* ── Farmer Requests Timeline Drawer ── */}
      <FarmerRequestsDrawer
        isOpen={requestsDrawerOpen}
        onClose={() => setRequestsDrawerOpen(false)}
        user={user}
        onOpenNewRequest={() => {
          setRequestsDrawerOpen(false)
          setRequestPrefill(null)
          setRequestModalOpen(true)
        }}
      />

      {/* ── Farm Profile Modal ── */}
      <DiagnosticsModal
        isOpen={Boolean(activeModal)}
        type={activeModal?.type}
        data={activeModal?.type === 'field' ? currentFarmer : activeModal?.data}
        onClose={() => setActiveModal(null)}
      />
    </div>
  )
}
