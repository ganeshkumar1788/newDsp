/**
 * AdminRequestsPage.jsx — Admin Change Requests Management & Decision Inbox
 *
 * Implements:
 * - Filter by status, type, farmer, urgency
 * - Search & Sort (newest, urgency)
 * - Detail inspection panel with mini AgriMap rendering proposed ghost shapes
 * - Actions: Approve, Reject (reason required), Ask for more info (message required), Open in editor, Mark completed
 * - Approving changes request status only (never edits farm data automatically)
 */
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  changeRequestStorage,
  REQUEST_STATUSES,
  REQUEST_TYPES,
} from '../lib/changeRequestStorage'
import { farmStorage } from '../lib/farmStorage'
import AgriMap from '../components/map/AgriMap'
import {
  Inbox,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  Clock,
  ArrowUpDown,
  AlertTriangle,
  User,
  MapPin,
  FileText,
  Send,
  Eye,
  Check,
} from 'lucide-react'

const STATUS_BADGE_STYLES = {
  [REQUEST_STATUSES.SUBMITTED]: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  [REQUEST_STATUSES.UNDER_REVIEW]: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  [REQUEST_STATUSES.NEEDS_MORE_INFO]: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  [REQUEST_STATUSES.APPROVED]: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  [REQUEST_STATUSES.COMPLETED]: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  [REQUEST_STATUSES.REJECTED]: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
}

export default function AdminRequestsPage() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [selectedReq, setSelectedReq] = useState(null)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [urgencyFilter, setUrgencyFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState('newest') // newest, urgent

  // Action Dialog states
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [infoMessage, setInfoMessage] = useState('')

  const loadRequests = () => {
    const list = changeRequestStorage.getRequests('admin')
    setRequests(list)
    if (selectedReq) {
      const match = list.find((r) => r.id === selectedReq.id)
      setSelectedReq(match || list[0] || null)
    } else if (list.length > 0) {
      setSelectedReq(list[0])
    }
  }

  useEffect(() => {
    loadRequests()
  }, [])

  // Filter & Sort logic
  const filteredRequests = requests
    .filter((req) => {
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false
      if (urgencyFilter !== 'ALL' && req.urgency !== urgencyFilter) return false
      if (typeFilter !== 'ALL' && req.type !== typeFilter) return false
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const text = `${req.requestNumber} ${req.farmerName} ${req.description} ${req.targetName}`.toLowerCase()
        if (!text.includes(q)) return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortOrder === 'urgent') {
        if (a.urgency === 'Urgent' && b.urgency !== 'Urgent') return -1
        if (b.urgency === 'Urgent' && a.urgency !== 'Urgent') return 1
      }
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

  // Action handlers
  const handleApprove = (id) => {
    changeRequestStorage.updateStatus(id, {
      status: REQUEST_STATUSES.APPROVED,
      adminNote: 'Request approved by Admin. Ready for spatial editor adjustments.',
      actor: 'Admin',
    })
    loadRequests()
  }

  const handleMarkCompleted = (id) => {
    changeRequestStorage.updateStatus(id, {
      status: REQUEST_STATUSES.COMPLETED,
      adminNote: 'Field edits and verification complete. Changes published.',
      actor: 'Admin',
    })
    loadRequests()
  }

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) return
    changeRequestStorage.updateStatus(selectedReq.id, {
      status: REQUEST_STATUSES.REJECTED,
      adminNote: rejectReason.trim(),
      actor: 'Admin',
    })
    setRejectModalOpen(false)
    setRejectReason('')
    loadRequests()
  }

  const handleConfirmAskInfo = () => {
    if (!infoMessage.trim()) return
    changeRequestStorage.updateStatus(selectedReq.id, {
      status: REQUEST_STATUSES.NEEDS_MORE_INFO,
      adminNote: infoMessage.trim(),
      actor: 'Admin',
    })
    setInfoModalOpen(false)
    setInfoMessage('')
    loadRequests()
  }

  const handleOpenInEditor = (farmId) => {
    navigate(`/admin/editor/${farmId || 'field-1'}`)
  }

  return (
    <div className="min-h-screen bg-[#131313] text-white p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#B890F9]/20">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Inbox className="text-[#B890F9]" size={22} />
            <span>Farmer Change Requests Inbox</span>
          </h1>
          <p className="text-xs text-[#C9BDE6] mt-0.5">
            Review, verify, and decide requested farmer boundary and device adjustments.
          </p>
        </div>

        {/* Quick Stats Chips */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-[#241845] border border-[#B890F9]/30 text-xs">
            <span className="text-[#C9BDE6]">Pending Review: </span>
            <strong className="text-amber-400 font-mono">
              {requests.filter((r) => r.status === REQUEST_STATUSES.SUBMITTED).length}
            </strong>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#241845] border border-[#B890F9]/30 text-xs">
            <span className="text-[#C9BDE6]">Total: </span>
            <strong className="text-[#D9C7FF] font-mono">{requests.length}</strong>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1B1233] p-4 rounded-2xl border border-[#B890F9]/20 shadow-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-2.5 text-[#9A8BC0]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by request #, farmer, keyword..."
              className="w-full bg-[#131313] border border-[#B890F9]/30 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#9A8BC0] focus:outline-none focus:border-[#B890F9]"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#131313] border border-[#B890F9]/30 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            {Object.values(REQUEST_STATUSES).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Urgency Filter */}
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="bg-[#131313] border border-[#B890F9]/30 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Urgency</option>
            <option value="Normal">Normal</option>
            <option value="Urgent">Urgent Only</option>
          </select>
        </div>

        {/* Sort Order */}
        <div className="flex items-center gap-1.5 text-[#C9BDE6]">
          <ArrowUpDown size={13} />
          <span>Sort:</span>
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'newest' ? 'urgent' : 'newest')}
            className="px-2.5 py-1 rounded-lg bg-[#241845] border border-white/10 hover:border-white/20 text-white font-bold cursor-pointer"
          >
            {sortOrder === 'newest' ? 'Newest First' : 'Urgent First'}
          </button>
        </div>
      </div>

      {/* Main Inbox Layout: Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Request Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-2.5 max-h-[750px] overflow-y-auto no-scrollbar">
          {filteredRequests.length === 0 ? (
            <div className="p-8 text-center bg-[#1B1233] rounded-2xl border border-white/10 text-[#C9BDE6]">
              No requests match the selected filters.
            </div>
          ) : (
            filteredRequests.map((req) => {
              const isSelected = selectedReq?.id === req.id
              const badgeStyle = STATUS_BADGE_STYLES[req.status] || 'bg-white/10'
              const typeMeta = REQUEST_TYPES.find((t) => t.id === req.type)

              return (
                <div
                  key={req.id}
                  onClick={() => setSelectedReq(req)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#241845] border-[#B890F9] ring-2 ring-[#B890F9]/30 shadow-xl'
                      : 'bg-[#1B1233] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#D9C7FF]">{req.requestNumber}</span>
                      {req.urgency === 'Urgent' && (
                        <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold animate-pulse">
                          URGENT
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${badgeStyle}`}>
                      {req.status}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-white mb-1">
                    {typeMeta?.label.split('(')[0] || 'Farm Change'}
                  </h3>

                  <p className="text-xs text-[#C9BDE6] line-clamp-2 leading-relaxed mb-2">
                    {req.description}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2 border-t border-white/5">
                    <span className="flex items-center gap-1 text-[#E4DFEB]">
                      <User size={12} className="text-[#B890F9]" />
                      <span>{req.farmerName}</span>
                    </span>
                    <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Right Column: Detailed Review & Mini Map (7 cols) */}
        <div className="lg:col-span-7 bg-[#1B1233] rounded-3xl border border-[#B890F9]/20 shadow-2xl p-6 space-y-6">
          {selectedReq ? (
            <>
              {/* Request Header Banner */}
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#B890F9]/20">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-sm text-[#D9C7FF]">
                      {selectedReq.requestNumber}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${
                        STATUS_BADGE_STYLES[selectedReq.status]
                      }`}
                    >
                      {selectedReq.status}
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white">
                    {REQUEST_TYPES.find((t) => t.id === selectedReq.type)?.label || 'Farmer Change Request'}
                  </h2>
                  <div className="text-xs text-[#C9BDE6] mt-1 flex items-center gap-3">
                    <span>Farmer: <strong className="text-white">{selectedReq.farmerName}</strong></span>
                    <span>•</span>
                    <span>Farm ID: <strong className="text-white">{selectedReq.farmId}</strong></span>
                  </div>
                </div>

                {/* Primary Admin Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenInEditor(selectedReq.farmId)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#2A0C58] hover:bg-[#3C1775] text-[#D9C7FF] hover:text-white border border-[#B890F9]/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ExternalLink size={13} />
                    <span>Open in Editor</span>
                  </button>

                  {selectedReq.status !== REQUEST_STATUSES.APPROVED &&
                    selectedReq.status !== REQUEST_STATUSES.COMPLETED && (
                      <button
                        type="button"
                        onClick={() => handleApprove(selectedReq.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                      >
                        <Check size={13} />
                        <span>Approve Request</span>
                      </button>
                    )}

                  {selectedReq.status === REQUEST_STATUSES.APPROVED && (
                    <button
                      type="button"
                      onClick={() => handleMarkCompleted(selectedReq.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                    >
                      <CheckCircle2 size={13} />
                      <span>Mark Completed</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setInfoModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Ask Info
                  </button>

                  <button
                    type="button"
                    onClick={() => setRejectModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {/* Description & Target Details */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[#C9BDE6] font-bold block mb-1 uppercase tracking-wider text-[10px]">
                    Farmer's Description
                  </span>
                  <div className="bg-[#131313] p-3.5 rounded-2xl border border-white/5 text-[#F4F3F9] whitespace-pre-wrap leading-relaxed">
                    {selectedReq.description}
                  </div>
                </div>

                {selectedReq.targetName && (
                  <div className="bg-[#241845] p-3 rounded-xl border border-white/5 flex items-center justify-between">
                    <span className="text-[#C9BDE6]">Associated Target:</span>
                    <strong className="text-white">{selectedReq.targetName}</strong>
                  </div>
                )}
              </div>

              {/* Mini AgriMap with Proposed Ghost Shapes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#D9C7FF] flex items-center gap-1.5">
                    <MapPin size={14} className="text-amber-400" />
                    <span>Spatial Location & Proposed Ghost Geometry</span>
                  </span>
                  <span className="text-[11px] text-amber-400 font-mono">
                    {selectedReq.proposedGeometry ? 'Ghost Pin / Line Visible' : 'No proposed coordinates'}
                  </span>
                </div>

                <div className="rounded-2xl overflow-hidden border border-[#B890F9]/30 h-[260px]">
                  <AgriMap
                    role="admin"
                    farm={{ id: selectedReq.farmerId, field_id: selectedReq.farmId }}
                    ghostGeometry={selectedReq.proposedGeometry}
                    readOnly={true}
                    height="100%"
                  />
                </div>
              </div>

              {/* Attachments Section */}
              {selectedReq.attachments && selectedReq.attachments.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-[#D9C7FF] uppercase tracking-wider block text-[10px]">
                    Attached Proof / Photos ({selectedReq.attachments.length})
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedReq.attachments.map((att) => (
                      <div
                        key={att.id}
                        className="p-2 rounded-xl bg-[#241845] border border-white/10 flex items-center gap-2 text-xs"
                      >
                        <FileText size={14} className="text-[#B890F9]" />
                        <span className="text-white font-medium truncate max-w-[150px]">{att.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-20 text-center text-[#C9BDE6] text-xs">
              Select a change request from the left list to inspect details and spatial preview.
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1B1233] border border-rose-500/40 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Reject Request (Reason Required)</h3>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="State the reason for rejecting this change request..."
              className="w-full bg-[#131313] border border-rose-500/30 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-400"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-white/10 text-xs text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!rejectReason.trim()}
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded-xl bg-rose-600 disabled:opacity-40 text-xs font-bold text-white"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ask for Info Modal */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#1B1233] border border-purple-500/40 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Ask Farmer for More Info (Message Required)</h3>
            <textarea
              rows={3}
              value={infoMessage}
              onChange={(e) => setInfoMessage(e.target.value)}
              placeholder="Describe what additional document or coordinate clarification is required..."
              className="w-full bg-[#131313] border border-purple-500/30 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-purple-400"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInfoModalOpen(false)}
                className="px-3 py-1.5 rounded-xl bg-white/10 text-xs text-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!infoMessage.trim()}
                onClick={handleConfirmAskInfo}
                className="px-4 py-1.5 rounded-xl bg-purple-600 disabled:opacity-40 text-xs font-bold text-white"
              >
                Send Request to Farmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
