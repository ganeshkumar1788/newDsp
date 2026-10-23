/**
 * FarmerRequestsDrawer.jsx — Farmer's "My Requests" Timeline Drawer
 *
 * Implements:
 * - Slide-out drawer with list of farmer's own change requests
 * - Clear status chips (Submitted, Under review, Needs more info, Approved, Completed, Rejected)
 * - Complete audit history / timeline per request
 * - Farmer inline reply when status is "Needs more info"
 * - Farmer cancel action while status is "Submitted"
 * - Empty state with helpful message and "Request a change" CTA
 */
import React, { useState, useEffect } from 'react'
import {
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  MessageSquare,
  CornerDownRight,
  Send,
  Trash2,
  Plus,
  Shield,
  FileText,
} from 'lucide-react'
import {
  changeRequestStorage,
  REQUEST_STATUSES,
  REQUEST_TYPES,
} from '../../lib/changeRequestStorage'

const STATUS_BADGE_STYLES = {
  [REQUEST_STATUSES.SUBMITTED]: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  [REQUEST_STATUSES.UNDER_REVIEW]: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  [REQUEST_STATUSES.NEEDS_MORE_INFO]: 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse',
  [REQUEST_STATUSES.APPROVED]: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  [REQUEST_STATUSES.COMPLETED]: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  [REQUEST_STATUSES.REJECTED]: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
}

export default function FarmerRequestsDrawer({
  isOpen,
  onClose,
  farmerUser,
  onRequestNew,
}) {
  const [requests, setRequests] = useState([])
  const [selectedReq, setSelectedReq] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replyError, setReplyError] = useState('')

  const loadRequests = () => {
    const list = changeRequestStorage.getRequests('farmer', farmerUser)
    setRequests(list)
    if (selectedReq) {
      const updated = list.find((r) => r.id === selectedReq.id)
      setSelectedReq(updated || list[0] || null)
    } else if (list.length > 0) {
      setSelectedReq(list[0])
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadRequests()
    }
  }, [isOpen])

  // Listen to external change requests updates
  useEffect(() => {
    const handleUpdate = () => loadRequests()
    window.addEventListener('agrimap:change-requests-updated', handleUpdate)
    return () => window.removeEventListener('agrimap:change-requests-updated', handleUpdate)
  }, [selectedReq])

  if (!isOpen) return null

  const handleSendReply = (e) => {
    e.preventDefault()
    setReplyError('')
    if (replyText.trim().length < 5) {
      setReplyError('Reply must contain at least 5 characters.')
      return
    }

    try {
      const updated = changeRequestStorage.replyToRequest(
        selectedReq.id,
        replyText.trim(),
        farmerUser
      )
      setSelectedReq(updated)
      setReplyText('')
      loadRequests()
    } catch (err) {
      setReplyError(err.message || 'Failed to submit reply.')
    }
  }

  const handleCancelRequest = (id) => {
    if (window.confirm('Are you sure you want to withdraw this change request?')) {
      try {
        const updated = changeRequestStorage.cancelRequest(id, farmerUser)
        setSelectedReq(updated)
        loadRequests()
      } catch (err) {
        alert(err.message || 'Failed to cancel request.')
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="w-full max-w-xl h-full bg-[#131313] dark:bg-[#1B1233] border-l border-[#B890F9]/30 shadow-2xl flex flex-col text-white">
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-[#B890F9]/20 flex items-center justify-between bg-[#241845]/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8A57C0]/30 border border-[#8A57C0]/50 flex items-center justify-center text-[#B890F9]">
              <FileText size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">My Change Requests</h2>
              <span className="text-[11px] text-[#C9BDE6]">
                {requests.length} total • Statuses updated by Admin
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Area */}
        {requests.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#B890F9]">
              <HelpCircle size={24} />
            </div>
            <h3 className="text-sm font-bold text-white">No Change Requests Yet</h3>
            <p className="text-xs text-[#C9BDE6] max-w-xs">
              Need to add a device, report a pump problem, or adjust your boundary? Send a request to your admin.
            </p>
            <button
              type="button"
              onClick={() => {
                onClose()
                onRequestNew && onRequestNew()
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-[#8A57C0] hover:bg-[#B890F9] text-white text-xs font-bold shadow-lg transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Request a change</span>
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Left/Top: Requests List */}
            <div className="w-full md:w-56 border-b md:border-b-0 md:border-r border-[#B890F9]/20 overflow-y-auto no-scrollbar shrink-0 p-2 space-y-1.5">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onRequestNew && onRequestNew()
                }}
                className="w-full mb-2 p-2 rounded-xl bg-gradient-to-r from-[#8A57C0]/40 to-[#3C1775]/40 hover:from-[#8A57C0] hover:to-[#3C1775] text-[#D9C7FF] hover:text-white text-xs font-bold border border-[#B890F9]/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus size={13} />
                <span>New Request</span>
              </button>

              {requests.map((req) => {
                const isSelected = selectedReq?.id === req.id
                const badgeStyle = STATUS_BADGE_STYLES[req.status] || 'bg-white/10 text-gray-300'
                const typeMeta = REQUEST_TYPES.find((t) => t.id === req.type)

                return (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => setSelectedReq(req)}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#241845] border-[#B890F9] text-white'
                        : 'bg-white/5 border-transparent hover:bg-white/10 text-[#C9BDE6]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="font-mono text-gray-400">{req.requestNumber}</span>
                      <span className={`px-1.5 py-0.5 rounded-full border text-[9px] font-bold ${badgeStyle}`}>
                        {req.status}
                      </span>
                    </div>
                    <div className="text-xs font-semibold truncate text-white">
                      {typeMeta?.label.split('(')[0] || 'Farm Change'}
                    </div>
                    <div className="text-[10px] text-gray-400 truncate mt-0.5">{req.description}</div>
                  </button>
                )
              })}
            </div>

            {/* Right/Bottom: Request Details & Timeline */}
            {selectedReq && (
              <div className="flex-1 p-5 overflow-y-auto no-scrollbar space-y-4">
                {/* Request Overview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#D9C7FF]">
                      {selectedReq.requestNumber}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full border text-xs font-bold ${
                        STATUS_BADGE_STYLES[selectedReq.status]
                      }`}
                    >
                      {selectedReq.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white">
                    {REQUEST_TYPES.find((t) => t.id === selectedReq.type)?.label || 'Change Request'}
                  </h3>

                  <p className="text-xs text-[#E4DFEB] bg-black/30 p-3 rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed">
                    {selectedReq.description}
                  </p>

                  {selectedReq.targetName && (
                    <div className="text-xs text-[#C9BDE6]">
                      <span>Target: </span>
                      <strong className="text-white">{selectedReq.targetName}</strong>
                    </div>
                  )}

                  {selectedReq.adminNote && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                      <span className="text-amber-400 font-bold block mb-0.5">Admin Note:</span>
                      <p className="text-[#F4F3F9]">{selectedReq.adminNote}</p>
                    </div>
                  )}

                  {/* Cancel Button (Available while status is Submitted) */}
                  {selectedReq.status === REQUEST_STATUSES.SUBMITTED && (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleCancelRequest(selectedReq.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer font-semibold"
                      >
                        <Trash2 size={12} />
                        <span>Withdraw / Cancel Request</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Timeline History */}
                <div className="pt-3 border-t border-white/10 space-y-3">
                  <span className="text-xs font-bold text-[#D9C7FF] uppercase tracking-wider block">
                    Activity Timeline
                  </span>

                  <div className="space-y-3 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/15">
                    {selectedReq.history.map((event, idx) => (
                      <div key={idx} className="relative flex items-start gap-3 pl-1">
                        <div className="w-5 h-5 rounded-full bg-[#8A57C0] border-2 border-[#131313] flex items-center justify-center text-white shrink-0 z-10 text-[9px] font-bold">
                          {idx + 1}
                        </div>
                        <div className="flex-1 bg-white/5 p-2.5 rounded-xl border border-white/5 text-xs">
                          <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                            <span className="font-bold text-[#D9C7FF]">{event.actor}</span>
                            <span>{new Date(event.timestamp).toLocaleDateString()}</span>
                          </div>
                          <div className="font-semibold text-white text-[11px] mb-0.5">
                            {event.status}
                          </div>
                          <p className="text-gray-300 text-[11px]">{event.note}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reply Form (When status is "Needs more info") */}
                {selectedReq.status === REQUEST_STATUSES.NEEDS_MORE_INFO && (
                  <form onSubmit={handleSendReply} className="pt-3 border-t border-purple-500/30 space-y-2">
                    <label className="block text-xs font-bold text-purple-300">
                      Reply to Admin Clarification Request:
                    </label>
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your clarification or additional information here..."
                      className="w-full bg-[#241845] border border-purple-400/40 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-purple-300"
                    />
                    {replyError && <p className="text-[11px] text-rose-400">{replyError}</p>}
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                      >
                        <Send size={13} />
                        <span>Send Clarification</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
