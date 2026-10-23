/**
 * FarmerChangeRequestModal.jsx — Farmer "Request a Change" Modal & Mobile Bottom Sheet
 *
 * Implements the 9-type structured change request workflow:
 * 1. Add a device (borewell, CCTV, IoT sensor, power/solar)
 * 2. Report a device problem
 * 3. Move or correct a device location
 * 4. Correct my farm boundary
 * 5. Add or change a crop zone
 * 6. Add a pipeline, road or fence
 * 7. Update farm details (survey number, address, area)
 * 8. Request a data report or export
 * 9. Other
 *
 * Steps:
 * 1. Form Entry (Type cards, target picker, description 20-1000 with counter, pin/points, attachments <= 3 <= 5MB)
 * 2. Review Step ("Check your request")
 * 3. Submission & Success state displaying request number
 */
import React, { useState, useEffect } from 'react'
import {
  X,
  Check,
  AlertCircle,
  Plus,
  AlertTriangle,
  MapPin,
  Shield,
  Sprout,
  Route,
  FileText,
  BarChart3,
  HelpCircle,
  Upload,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react'
import { changeRequestStorage, REQUEST_TYPES } from '../../lib/changeRequestStorage'

const ICON_COMPONENTS = {
  Plus,
  AlertTriangle,
  MapPin,
  Shield,
  Sprout,
  Route,
  FileText,
  BarChart3,
  HelpCircle,
}

export default function FarmerChangeRequestModal({
  isOpen,
  onClose,
  farmerUser,
  initialData = null,
  devices = [],
  zones = [],
  onSubmitted = null,
}) {
  const [step, setStep] = useState(1) // 1: Form, 2: Review, 3: Success
  const [selectedType, setSelectedType] = useState('add_device')
  const [targetId, setTargetId] = useState('')
  const [targetName, setTargetName] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState('Normal')
  const [contact, setContact] = useState('in_app')
  const [proposedCoordinates, setProposedCoordinates] = useState('')
  const [attachments, setAttachments] = useState([])
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [createdRequest, setCreatedRequest] = useState(null)

  // Pre-fill initial data if triggered from a device popup ("Report an issue")
  useEffect(() => {
    if (initialData) {
      if (initialData.type) setSelectedType(initialData.type)
      if (initialData.targetId) setTargetId(initialData.targetId)
      if (initialData.targetName) setTargetName(initialData.targetName)
      if (initialData.description) setDescription(initialData.description)
    }
  }, [initialData])

  if (!isOpen) return null

  // File upload handler (max 3 attachments, each <= 5MB, images only)
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files || [])
    if (attachments.length + files.length > 3) {
      setErrors((prev) => ({ ...prev, attachments: 'Maximum 3 attachments allowed.' }))
      return
    }

    const newAtts = []
    for (const f of files) {
      if (f.size > 5 * 1024 * 1024) {
        setErrors((prev) => ({ ...prev, attachments: `File "${f.name}" exceeds 5 MB limit.` }))
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        newAtts.push({
          id: `att-${Date.now()}-${Math.random()}`,
          name: f.name,
          size: f.size,
          type: f.type,
          dataUrl: reader.result,
        })
        if (newAtts.length === files.length) {
          setAttachments((prev) => [...prev, ...newAtts])
          setErrors((prev) => ({ ...prev, attachments: null }))
        }
      }
      reader.readAsDataURL(f)
    }
  }

  const removeAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  // Validate step 1
  const validateForm = () => {
    const newErrors = {}
    const trimmed = description.trim()
    if (trimmed.length < 20) {
      newErrors.description = `Please provide at least 20 characters (${trimmed.length}/20).`
    } else if (trimmed.length > 1000) {
      newErrors.description = `Description cannot exceed 1000 characters.`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleProceedToReview = (e) => {
    e.preventDefault()
    if (validateForm()) {
      setStep(2)
    }
  }

  const handleSubmit = () => {
    setSubmitting(true)
    try {
      let proposedGeometry = null
      if (proposedCoordinates.trim()) {
        const parts = proposedCoordinates.split(',').map((p) => parseFloat(p.trim()))
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          proposedGeometry = {
            type: 'Point',
            coordinates: [parts[1], parts[0]], // [lng, lat]
          }
        }
      }

      const req = changeRequestStorage.createRequest(
        {
          type: selectedType,
          targetType: REQUEST_TYPES.find((t) => t.id === selectedType)?.targetType || 'none',
          targetId: targetId || null,
          targetName: targetName || '',
          description: description.trim(),
          proposedGeometry,
          attachments,
          urgency,
          contact,
        },
        farmerUser || { id: 'farmer-1', full_name: 'Ganesh V.', field_id: 'field-1' }
      )

      setCreatedRequest(req)
      setStep(3)
      if (typeof onSubmitted === 'function') {
        onSubmitted(req)
      }
    } catch (err) {
      setErrors({ form: err.message || 'Failed to submit request.' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetAndClose = () => {
    setStep(1)
    setSelectedType('add_device')
    setTargetId('')
    setTargetName('')
    setDescription('')
    setAttachments([])
    setErrors({})
    onClose()
  }

  const activeTypeMeta = REQUEST_TYPES.find((t) => t.id === selectedType)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-[#131313] dark:bg-[#1B1233] border border-[#B890F9]/30 rounded-3xl shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#B890F9]/20 flex items-center justify-between shrink-0 bg-[#241845]/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#8A57C0]/30 border border-[#8A57C0]/50 flex items-center justify-center text-[#B890F9]">
              <Shield size={16} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {step === 3 ? 'Request Submitted' : step === 2 ? 'Check Your Request' : 'Request a Farm Change'}
              </h2>
              <span className="text-[11px] text-[#C9BDE6]">
                {step === 3 ? 'Your admin will review this request' : 'Farmers never edit directly. Admins verify all revisions.'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close request modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto no-scrollbar space-y-4 flex-1">
          {/* STEP 1: FORM */}
          {step === 1 && (
            <form onSubmit={handleProceedToReview} className="space-y-4">
              {/* Request Type Selector (9 Cards) */}
              <div>
                <label className="block text-xs font-bold text-[#D9C7FF] mb-2 uppercase tracking-wider">
                  1. Select Change Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {REQUEST_TYPES.map((type) => {
                    const isSelected = selectedType === type.id
                    const IconComp = ICON_COMPONENTS[type.icon] || HelpCircle
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          setSelectedType(type.id)
                          setTargetId('')
                          setTargetName('')
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all min-h-[56px] cursor-pointer flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-[#8A57C0]/30 border-[#B890F9] ring-2 ring-[#B890F9]/30 text-white shadow-md'
                            : 'bg-[#241845]/50 border-white/10 hover:border-white/20 text-[#C9BDE6]'
                        }`}
                      >
                        <div
                          className={`p-1.5 rounded-lg shrink-0 ${
                            isSelected ? 'bg-[#8A57C0] text-white' : 'bg-white/5 text-[#9A8BC0]'
                          }`}
                        >
                          <IconComp size={15} />
                        </div>
                        <span className="text-xs font-semibold leading-snug">{type.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Target Picker (Dynamic based on selected change type) */}
              {(selectedType === 'report_device_problem' ||
                selectedType === 'move_device' ||
                selectedType === 'change_crop_zone') && (
                <div>
                  <label className="block text-xs font-semibold text-[#D9C7FF] mb-1">
                    Select Target {selectedType.includes('zone') ? 'Crop Zone' : 'Device'}
                  </label>
                  <select
                    value={targetId}
                    onChange={(e) => {
                      setTargetId(e.target.value)
                      const found = selectedType.includes('zone')
                        ? zones.find((z) => (z.properties?.id || z.id) === e.target.value)
                        : devices.find((d) => (d.properties?.id || d.id) === e.target.value)
                      setTargetName(
                        found?.properties?.name ||
                          found?.properties?.device_name ||
                          found?.properties?.crop ||
                          found?.name ||
                          ''
                      )
                    }}
                    className="w-full bg-[#241845] border border-[#B890F9]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#B890F9]"
                  >
                    <option value="">-- Choose target --</option>
                    {selectedType.includes('zone')
                      ? zones.map((z, idx) => (
                          <option key={z.properties?.id || idx} value={z.properties?.id || `zone-${idx}`}>
                            {z.properties?.crop || z.properties?.name || `Zone ${idx + 1}`} (
                            {z.properties?.calculated_area_hectares || '2.5'} Ha)
                          </option>
                        ))
                      : devices.map((d, idx) => (
                          <option key={d.properties?.id || idx} value={d.properties?.id || `device-${idx}`}>
                            {d.properties?.name || d.properties?.device_name || `Device #${idx + 1}`} (
                            {d.properties?.status || 'Active'})
                          </option>
                        ))}
                  </select>
                </div>
              )}

              {/* Description Field (Required 20-1000 characters) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#D9C7FF]">
                    Description & Details <span className="text-rose-400">*</span>
                  </label>
                  <span
                    className={`text-[10px] font-mono ${
                      description.trim().length < 20
                        ? 'text-amber-400'
                        : description.trim().length > 1000
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {description.trim().length} / 1000 chars (min 20)
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe your requested change in detail (e.g. location, specifications, or problem observed)..."
                  className={`w-full bg-[#241845] border rounded-xl p-3 text-xs text-white placeholder-[#9A8BC0] focus:outline-none transition-colors ${
                    errors.description ? 'border-rose-400 focus:border-rose-400' : 'border-[#B890F9]/30 focus:border-[#B890F9]'
                  }`}
                />
                {errors.description && (
                  <p className="mt-1 text-[11px] text-rose-400 flex items-center gap-1">
                    <AlertCircle size={12} />
                    <span>{errors.description}</span>
                  </p>
                )}
              </div>

              {/* Proposed Location (Optional Coords) */}
              <div>
                <label className="block text-xs font-semibold text-[#D9C7FF] mb-1">
                  Proposed Location (Optional Coordinates [Lat, Lng])
                </label>
                <input
                  type="text"
                  value={proposedCoordinates}
                  onChange={(e) => setProposedCoordinates(e.target.value)}
                  placeholder="e.g. 10.6585, 77.0125"
                  className="w-full bg-[#241845] border border-[#B890F9]/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#B890F9]"
                />
                <span className="text-[10px] text-[#C9BDE6] mt-0.5 block">
                  Proposed coordinates are stored strictly inside your request as a ghost pin, never directly into farm data.
                </span>
              </div>

              {/* Attachments (Up to 3, <= 5MB each) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#D9C7FF]">
                    Attachments (Photos, Survey Documents)
                  </label>
                  <span className="text-[10px] text-[#C9BDE6] font-mono">{attachments.length} / 3 max</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-2 bg-[#241845] px-2.5 py-1.5 rounded-xl border border-white/10 text-xs"
                    >
                      <span className="truncate max-w-[140px] text-gray-200">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(att.id)}
                        className="text-gray-400 hover:text-rose-400 p-0.5 cursor-pointer"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}

                  {attachments.length < 3 && (
                    <label className="px-3 py-1.5 rounded-xl border border-dashed border-[#B890F9]/50 hover:bg-white/5 text-[#D9C7FF] text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors">
                      <Upload size={13} />
                      <span>Upload File (≤ 5MB)</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                {errors.attachments && (
                  <p className="mt-1 text-[11px] text-rose-400">{errors.attachments}</p>
                )}
              </div>

              {/* Urgency & Preferred Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-[#D9C7FF] mb-1">Urgency Level</label>
                  <div className="flex items-center gap-2">
                    {['Normal', 'Urgent'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setUrgency(u)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          urgency === u
                            ? u === 'Urgent'
                              ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                              : 'bg-[#8A57C0]/30 border-[#B890F9] text-white'
                            : 'bg-[#241845] border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#D9C7FF] mb-1">Preferred Contact</label>
                  <div className="flex items-center gap-2">
                    {[
                      { id: 'in_app', label: 'In-App Message' },
                      { id: 'phone', label: 'Phone Call' },
                    ].map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setContact(c.id)}
                        className={`flex-1 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          contact === c.id
                            ? 'bg-[#8A57C0]/30 border-[#B890F9] text-white'
                            : 'bg-[#241845] border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#8A57C0] to-[#3C1775] hover:from-[#B890F9] hover:to-[#5E4678] text-white text-xs font-bold shadow-lg shadow-[#8A57C0]/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Check Your Request</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: REVIEW STEP ("Check your request") */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-[#241845] rounded-2xl p-4 border border-[#B890F9]/30 space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <span className="text-xs text-[#C9BDE6]">Change Type:</span>
                  <span className="text-xs font-bold text-white">{activeTypeMeta?.label}</span>
                </div>

                {targetName && (
                  <div className="flex justify-between items-center pb-2 border-b border-white/10">
                    <span className="text-xs text-[#C9BDE6]">Target Element:</span>
                    <span className="text-xs font-bold text-[#D9C7FF]">{targetName}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <span className="text-xs text-[#C9BDE6] block">Description:</span>
                  <p className="text-xs text-white bg-black/30 p-2.5 rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed">
                    {description}
                  </p>
                </div>

                {proposedCoordinates && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#C9BDE6]">Proposed Ghost Coords:</span>
                    <span className="font-mono text-amber-300">{proposedCoordinates}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                  <div>
                    <span className="text-[#C9BDE6] block text-[10px]">URGENCY:</span>
                    <strong className={urgency === 'Urgent' ? 'text-rose-400' : 'text-emerald-400'}>
                      {urgency}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#C9BDE6] block text-[10px]">CONTACT VIA:</span>
                    <strong className="text-white">{contact === 'phone' ? 'Phone Call' : 'In-App Message'}</strong>
                  </div>
                </div>

                {attachments.length > 0 && (
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-[10px] text-[#C9BDE6] block mb-1">ATTACHMENTS ({attachments.length}):</span>
                    <div className="flex gap-2">
                      {attachments.map((a) => (
                        <span key={a.id} className="text-xs bg-white/10 px-2 py-1 rounded-lg text-gray-200 truncate">
                          {a.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {errors.form && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500 text-xs text-rose-300">
                  {errors.form}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-gray-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Edit Details</span>
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmit}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Confirm & Submit Request</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS STATE */}
          {step === 3 && createdRequest && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">Request Successfully Submitted!</h3>
                <p className="text-xs text-[#C9BDE6] mt-1 max-w-sm mx-auto">
                  Your request has been routed to the DSP Admin review queue. You will receive an in-app notification when the status changes.
                </p>
              </div>

              <div className="inline-block bg-[#241845] px-4 py-2.5 rounded-2xl border border-[#B890F9]/30">
                <span className="text-[10px] text-[#C9BDE6] block font-mono">TRACKING NUMBER</span>
                <span className="text-base font-bold font-mono text-[#D9C7FF]">
                  {createdRequest.requestNumber}
                </span>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-6 py-2.5 rounded-xl bg-[#8A57C0] hover:bg-[#B890F9] text-white text-xs font-bold shadow-lg transition-colors cursor-pointer"
                >
                  Done & Back to Map
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
