import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import farmStorage from '../lib/farmStorage'
import toast from '../components/ui/Toast'
import ScratchMapDigitizerModal from '../components/survey/ScratchMapDigitizerModal'
import AgriMap from '../components/map/AgriMap'
import {
  calculatePathLength,
  calculatePolygonArea,
  calculatePerimeter,
  extractBoundaryLatLngs,
} from '../lib/geoUtils'
import {
  AlertTriangle,
  MapPin,
  Route,
  Cpu,
  Layers,
  ChevronRight,
  Info,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
  Sun,
  Zap,
  UserPlus,
} from 'lucide-react'

export default function AdminLandEditorPage() {
  const { fieldId = 'field-1' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const userRole = user?.role || 'admin'
  const isEditable = userRole === 'admin' || userRole === 'land_verifier' || userRole === 'surveyor'

  const [geojson, setGeojson] = useState(null)
  const [farmers, setFarmers] = useState([])
  const [selectedFieldId, setSelectedFieldId] = useState(fieldId)
  const [activeTab, setActiveTab] = useState('boundary') // 'boundary' | 'lines' | 'devices'
  const [showScratchModal, setShowScratchModal] = useState(false)
  const [showMismatchDialog, setShowMismatchDialog] = useState(false)
  const [showJsonModal, setShowJsonModal] = useState(false)

  // ── Drawing Studio Line Creation State ──
  const [lineCategory, setLineCategory] = useState('pipeline')
  const [lineName, setLineName] = useState('')
  const [lineColor, setLineColor] = useState('#7C3AED')
  const [lineThickness, setLineThickness] = useState(6)
  const [lineStyle, setLineStyle] = useState('solid')

  // ── Device / Solar Management State ──
  const [showAddDeviceModal, setShowAddDeviceModal] = useState(false)
  const [deviceForm, setDeviceForm] = useState({
    device_name: '',
    device_type: 'solar_borewell',
    status: 'ACTIVE_RUNNING',
    pump_capacity_hp: 10,
    flow_rate_lpm: 150,
    depth_feet: 450,
    power_source: 'Solar Hybrid (12kW)',
    solar_capacity_kw: 12,
    lat: 10.6585,
    lng: 77.0125,
  })

  // ── Device / Solar Point Editing State ──
  const [showEditDeviceModal, setShowEditDeviceModal] = useState(false)
  const [editingDeviceId, setEditingDeviceId] = useState(null)
  const [editDeviceForm, setEditDeviceForm] = useState({
    device_name: '',
    device_type: 'solar_borewell',
    status: 'ACTIVE_RUNNING',
    pump_capacity_hp: 10,
    flow_rate_lpm: 150,
    depth_feet: 450,
    power_source: 'Solar Hybrid (12kW)',
    solar_capacity_kw: 12,
    lat: 10.6585,
    lng: 77.0125,
  })

  // ── Quick Add New Farmer State ──
  const [showNewFarmerModal, setShowNewFarmerModal] = useState(false)
  const [newFarmerForm, setNewFarmerForm] = useState({
    full_name: '',
    phone: '',
    khata_number: '',
    village: 'Pollachi',
    district: 'Coimbatore',
    total_acres: 15.0,
    lat: 10.6585,
    lng: 77.0125,
  })

  // Load field GeoJSON and Farmers
  useEffect(() => {
    const fList = farmStorage.getFarmers()
    setFarmers(fList)
    const gj = farmStorage.getFieldGeoJSON(selectedFieldId)
    setGeojson(gj)
  }, [selectedFieldId])

  const currentFarmer = useMemo(() => {
    return farmers.find((f) => f.field_id === selectedFieldId) || farmers[0]
  }, [farmers, selectedFieldId])

  const features = geojson?.features || []
  const devices = features.filter(
    (f) => f.properties?.entity_type !== 'field' && f.geometry?.type === 'Point'
  )
  const lines = features.filter((f) => f.geometry?.type === 'LineString')

  // Extract boundary coordinates to compute mapped area
  const boundaryPoints = useMemo(() => {
    const fieldFeat = features.find((f) => f.properties?.entity_type === 'field')
    return extractBoundaryLatLngs(fieldFeat?.geometry)
  }, [features])

  const boundaryArea = useMemo(() => {
    if (boundaryPoints.length < 3) {
      return { acres: '0.00', hectares: '0.00', sqMeters: 0 }
    }
    return calculatePolygonArea(boundaryPoints)
  }, [boundaryPoints])

  const boundaryPerimeter = useMemo(() => {
    if (boundaryPoints.length < 3) {
      return { meters: '0', feet: '0' }
    }
    return calculatePerimeter(boundaryPoints)
  }, [boundaryPoints])

  // Area Mismatch Analysis (Section 3 Requirement)
  const registeredAcres = parseFloat(currentFarmer?.total_acres || 0)
  const mappedAcres = parseFloat(boundaryArea.acres || 0)
  const areaDiffPercent =
    registeredAcres > 0
      ? Math.abs((mappedAcres - registeredAcres) / registeredAcres) * 100
      : 0
  const hasAreaMismatch = areaDiffPercent > 2 && mappedAcres > 0

  // Save revision handler from AgriMap / MapDrawingStudio
  const handleSaveRevision = useCallback(
    ({ points, auditNote, areaAcres, perimeterMeters }) => {
      try {
        farmStorage.updateField(selectedFieldId, { boundary_points: points })
        // Append audit entry to dedicated audit log
        try {
          const auditKey = 'agrimap.boundaryAuditLog.v1'
          const existing = JSON.parse(localStorage.getItem(auditKey) || '[]')
          existing.unshift({
            timestamp: new Date().toISOString(),
            fieldId: selectedFieldId,
            farmerName: currentFarmer?.full_name,
            author: user?.full_name || 'Admin',
            vertexCount: points.length,
            areaAcres,
            perimeterMeters,
            auditNote: auditNote || 'Boundary re-survey revision',
          })
          localStorage.setItem(auditKey, JSON.stringify(existing.slice(0, 100)))
        } catch (e) {
          console.error('Audit log save error:', e)
        }

        const updatedGj = farmStorage.getFieldGeoJSON(selectedFieldId)
        setGeojson(updatedGj)
        toast.success(`Boundary updated successfully (${points.length} vertices)!`)
      } catch (err) {
        toast.error('Failed to save boundary revision.')
      }
    },
    [selectedFieldId, currentFarmer, user]
  )

  // ── Device & Solar Point Handlers ──
  const handleOpenAddDevice = () => {
    const centerLat = boundaryPoints[0]?.[0] || 10.6585
    const centerLng = boundaryPoints[0]?.[1] || 77.0125
    setDeviceForm({
      device_name: 'Solar Borewell #1',
      device_type: 'solar_borewell',
      status: 'ACTIVE_RUNNING',
      pump_capacity_hp: 10,
      flow_rate_lpm: 150,
      depth_feet: 450,
      power_source: 'Solar Hybrid (12kW)',
      solar_capacity_kw: 12,
      lat: centerLat,
      lng: centerLng,
    })
    setShowAddDeviceModal(true)
  }

  const handleAddDevice = (e) => {
    e.preventDefault()
    if (!deviceForm.device_name) {
      toast.error('Device name is required')
      return
    }
    const lng = parseFloat(deviceForm.lng) || boundaryPoints[0]?.[1] || 77.0125
    const lat = parseFloat(deviceForm.lat) || boundaryPoints[0]?.[0] || 10.6585

    const isWater =
      deviceForm.device_type === 'borewell' || deviceForm.device_type === 'solar_borewell'
    const isSolarStation = deviceForm.device_type === 'solar_station'

    const newDevice = {
      id: `device-${Date.now()}`,
      entity_type: isWater || isSolarStation ? 'resource' : 'device',
      name: deviceForm.device_name,
      device_name: deviceForm.device_name,
      resource_type: isSolarStation ? 'solar_station' : isWater ? 'borewell_pump' : undefined,
      device_type: deviceForm.device_type,
      status: deviceForm.status,
      pump_capacity_hp: isWater ? `${deviceForm.pump_capacity_hp} HP` : undefined,
      flow_rate_lpm: isWater ? deviceForm.flow_rate_lpm : undefined,
      depth_feet: isWater ? deviceForm.depth_feet : undefined,
      power_source: deviceForm.power_source,
      solar_capacity_kw: isSolarStation || deviceForm.device_type.includes('solar') ? deviceForm.solar_capacity_kw : undefined,
      coordinates: [lng, lat],
    }

    farmStorage.addDeviceToField(selectedFieldId, newDevice)
    setShowAddDeviceModal(false)
    toast.success('Point & Solar device added successfully!')
    setGeojson(farmStorage.getFieldGeoJSON(selectedFieldId))
  }

  const handleOpenEditDevice = (deviceFeature) => {
    const p = deviceFeature.properties || {}
    const coords = deviceFeature.geometry?.coordinates || [77.0125, 10.6585]
    setEditingDeviceId(p.id || deviceFeature.id)
    setEditDeviceForm({
      device_name: p.name || p.device_name || 'Solar Point',
      device_type:
        p.resource_type === 'solar_station' || p.device_type === 'solar_station'
          ? 'solar_station'
          : p.resource_type === 'borewell_pump' &&
            (p.power_source?.toLowerCase().includes('solar') || p.name?.toLowerCase().includes('solar'))
          ? 'solar_borewell'
          : p.resource_type === 'borewell_pump'
          ? 'borewell'
          : p.device_type || 'solar_borewell',
      status: p.status || 'ACTIVE_RUNNING',
      pump_capacity_hp: parseFloat(p.pump_capacity_hp) || 10,
      flow_rate_lpm: parseFloat(p.flow_rate_lpm) || 150,
      depth_feet: parseFloat(p.depth_feet) || 450,
      power_source: p.power_source || 'Solar Hybrid',
      lat: parseFloat(coords[1]) || 10.6585,
      lng: parseFloat(coords[0]) || 77.0125,
      solar_capacity_kw: parseFloat(p.solar_capacity_kw) || 12,
    })
    setShowEditDeviceModal(true)
  }

  const handleSaveEditDevice = (e) => {
    e.preventDefault()
    if (!editingDeviceId) return

    const isWater =
      editDeviceForm.device_type === 'borewell' || editDeviceForm.device_type === 'solar_borewell'
    const isSolarStation = editDeviceForm.device_type === 'solar_station'

    const updatedProps = {
      id: editingDeviceId,
      name: editDeviceForm.device_name,
      device_name: editDeviceForm.device_name,
      entity_type: isWater || isSolarStation ? 'resource' : 'device',
      resource_type: isSolarStation ? 'solar_station' : isWater ? 'borewell_pump' : undefined,
      device_type: editDeviceForm.device_type,
      status: editDeviceForm.status,
      power_source: editDeviceForm.power_source,
      pump_capacity_hp: isWater ? `${editDeviceForm.pump_capacity_hp} HP` : undefined,
      flow_rate_lpm: isWater ? editDeviceForm.flow_rate_lpm : undefined,
      depth_feet: isWater ? editDeviceForm.depth_feet : undefined,
      solar_capacity_kw: isSolarStation || editDeviceForm.device_type.includes('solar') ? editDeviceForm.solar_capacity_kw : undefined,
      coordinates: [parseFloat(editDeviceForm.lng), parseFloat(editDeviceForm.lat)],
    }

    farmStorage.updateDeviceInField(selectedFieldId, editingDeviceId, updatedProps)
    setShowEditDeviceModal(false)
    toast.success('Point details & GPS coordinates updated successfully!')
    setGeojson(farmStorage.getFieldGeoJSON(selectedFieldId))
  }

  // ── Quick Add New Farmer Handlers ──
  const handleOpenNewFarmer = () => {
    const defaultLat = 10.6585 + (farmers.length * 0.005)
    const defaultLng = 77.0125 + (farmers.length * 0.005)
    setNewFarmerForm({
      full_name: '',
      phone: '+91 ',
      khata_number: `TN-POL-${Math.floor(1000 + Math.random() * 9000)}`,
      village: 'Pollachi',
      district: 'Coimbatore',
      total_acres: 15.0,
      lat: defaultLat,
      lng: defaultLng,
    })
    setShowNewFarmerModal(true)
  }

  const handleCreateNewFarmer = (e) => {
    e.preventDefault()
    if (!newFarmerForm.full_name.trim()) {
      toast.error('Farmer full name is required')
      return
    }

    const acres = parseFloat(newFarmerForm.total_acres) || 12.0
    const newFarmer = farmStorage.createFarmer({
      full_name: newFarmerForm.full_name.trim(),
      phone: newFarmerForm.phone.trim() || '+91 98421 00000',
      khata_number: newFarmerForm.khata_number.trim(),
      village: newFarmerForm.village.trim(),
      district: newFarmerForm.district.trim(),
      address: `${newFarmerForm.village.trim()}, ${newFarmerForm.district.trim()}, Tamil Nadu`,
      total_acres: acres,
      total_hectares: (acres * 0.404686).toFixed(2),
      location: {
        lat: parseFloat(newFarmerForm.lat) || 10.6585,
        lng: parseFloat(newFarmerForm.lng) || 77.0125,
      },
    })

    const fList = farmStorage.getFarmers()
    setFarmers(fList)
    setSelectedFieldId(newFarmer.field_id)
    setGeojson(farmStorage.getFieldGeoJSON(newFarmer.field_id))
    setShowNewFarmerModal(false)
    toast.success(`Farmer "${newFarmer.full_name}" registered with Farmland & Solar Borewell!`)
    navigate(`/admin/editor/${newFarmer.field_id}`)
  }

  const handleDeleteDevice = (deviceId) => {
    if (confirm('Delete this device marker?')) {
      farmStorage.deleteDeviceFromField(selectedFieldId, deviceId)
      toast.success('Device deleted!')
      setGeojson(farmStorage.getFieldGeoJSON(selectedFieldId))
    }
  }

  const handleDeleteLine = (lineId) => {
    if (confirm('Delete this linear feature?')) {
      farmStorage.deleteLineFromField(selectedFieldId, lineId)
      toast.success('Line removed!')
      setGeojson(farmStorage.getFieldGeoJSON(selectedFieldId))
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen bg-[#F4F3F9] dark:bg-[#131313] overflow-hidden">
      {/* ── Top Header Bar ── */}
      <div className="bg-white dark:bg-[#1E1035] border-b border-gray-200 dark:border-gray-800 px-4 py-2.5 sm:px-6 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/farmers"
            className="text-gray-400 hover:text-[#2A0C58] dark:hover:text-[#D9C7FF] text-sm font-semibold transition-colors"
          >
            ← Directory
          </Link>
          <span className="text-gray-300 dark:text-gray-700">|</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Land & Boundary Studio
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-[#2A0C58] dark:text-[#D9C7FF] font-bold border border-[#8A57C0]/30">
                {currentFarmer?.full_name}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Khata: <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{currentFarmer?.khata_number}</span> ·{' '}
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('agrimap:recenter-farm'))}
                className="hover:text-[#8A57C0] dark:hover:text-[#D9C7FF] hover:underline cursor-pointer transition-colors"
                title="Click to center map on farm boundary"
              >
                📍 {currentFarmer?.address || 'Pollachi, Tamil Nadu'}
              </button>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Farm Switcher Dropdown */}
          <div className="flex items-center gap-1.5 text-xs bg-[#F4F3F9] dark:bg-[#2A0C58]/50 border border-gray-200 dark:border-gray-700 px-2.5 py-1.5 rounded-xl">
            <span className="text-gray-400 font-medium">Farm:</span>
            <select
              value={selectedFieldId}
              onChange={(e) => {
                setSelectedFieldId(e.target.value)
                navigate(`/admin/editor/${e.target.value}`)
              }}
              className="bg-transparent font-bold text-[#2A0C58] dark:text-[#D9C7FF] focus:outline-none cursor-pointer text-xs"
            >
              {farmers.map((f) => (
                <option key={f.id} value={f.field_id} className="bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white">
                  {f.full_name} ({f.total_acres} Ac · {f.district || f.village})
                </option>
              ))}
            </select>
          </div>

          {isEditable && (
            <>
              <button
                type="button"
                onClick={handleOpenNewFarmer}
                className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs py-1.5 px-3 rounded-xl flex items-center gap-1.5 font-bold shadow-sm transition-all cursor-pointer"
                title="Register a new farmer with digital twin farmland & solar borewell"
              >
                <UserPlus size={14} />
                <span>+ New Farmer</span>
              </button>
              <button
                type="button"
                onClick={() => setShowScratchModal(true)}
                className="bg-gradient-to-r from-[#8A57C0] to-[#2A0C58] text-white text-xs py-1.5 px-3 rounded-xl flex items-center gap-1 font-bold shadow-sm hover:opacity-95 cursor-pointer"
              >
                <span>🗺️</span>
                <span>Digitize From Scratch</span>
              </button>
              <button
                type="button"
                onClick={handleOpenAddDevice}
                className="border border-[#8A57C0] text-[#2A0C58] dark:text-[#D9C7FF] hover:bg-purple-50 dark:hover:bg-purple-950/40 text-xs py-1.5 px-3 rounded-xl flex items-center gap-1 font-bold transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Add Device</span>
              </button>
            </>
          )}

          <Link
            to={`/farmer?farmerId=${currentFarmer?.id}`}
            className="border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs py-1.5 px-3 rounded-xl flex items-center gap-1 font-bold transition-colors"
          >
            <span>🚜</span>
            <span>Farmer View →</span>
          </Link>
        </div>
      </div>

      {/* ── Sub-Bar: 3 Tabs (Boundary View, Drawing Studio & Lines, Field Devices & Assets) ── */}
      <div className="bg-white/95 dark:bg-[#1E1035]/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs z-20 flex-shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('boundary')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'boundary'
                ? 'bg-gradient-to-r from-[#8A57C0] to-[#2A0C58] text-white shadow-md shadow-[#8A57C0]/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Layers size={14} />
            <span>Boundary View</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lines')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'lines'
                ? 'bg-gradient-to-r from-[#8A57C0] to-[#2A0C58] text-white shadow-md shadow-[#8A57C0]/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Route size={14} />
            <span>Drawing Studio & Lines ({lines.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('devices')}
            className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'devices'
                ? 'bg-gradient-to-r from-[#8A57C0] to-[#2A0C58] text-white shadow-md shadow-[#8A57C0]/30'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Cpu size={14} />
            <span>Field Devices & Assets ({devices.length})</span>
          </button>
        </div>

        {/* Live Boundary Measurement Stats */}
        {activeTab === 'boundary' && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/40 border border-[#8A57C0]/30 px-3 py-1 rounded-xl">
              <span className="text-gray-500 dark:text-gray-400">Vertices:</span>
              <strong className="text-[#2A0C58] dark:text-[#D9C7FF] font-mono font-bold text-xs">
                {boundaryPoints.length}
              </strong>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <span className="text-gray-500 dark:text-gray-400">Mapped Area:</span>
              <strong className="text-emerald-700 dark:text-emerald-400 font-mono font-bold text-xs">
                {boundaryArea.acres} Ac
              </strong>
              <span className="text-gray-400 text-[11px]">({boundaryArea.hectares} Ha)</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Main Workspace ── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Side: Unified AgriMap Engine */}
        <div className="flex-1 relative min-h-[380px] border-r border-gray-200 dark:border-gray-800 z-0 flex flex-col">
          <AgriMap
            key={`admin-map-${selectedFieldId}`}
            role="admin"
            farm={currentFarmer}
            geojson={geojson}
            onSaveGeoJson={handleSaveRevision}
            user={user}
            height="100%"
            className="w-full h-full"
          />
        </div>

        {/* Right Side: Tab Details Panel */}
        <div className="w-full lg:w-96 bg-white dark:bg-[#1E1035] flex flex-col border-t lg:border-t-0 lg:border-l border-gray-200 dark:border-gray-800 overflow-y-auto">
          {activeTab === 'boundary' ? (
            /* ── Tab 1: Boundary View & Area Mismatch Panel ── */
            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center justify-between">
                  <span>Cadastral Boundary Details</span>
                  <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                    {currentFarmer?.khata_number}
                  </span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  View polygon, verify coordinates, or click "Edit mode" in map toolbar to adjust corners.
                </p>
              </div>

              {/* Area Mismatch Banner (Section 3 Requirement) */}
              {hasAreaMismatch && (
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 shadow-sm space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" size={18} />
                    <div className="flex-1">
                      <span className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wide block">
                        Area Mismatch: Review Boundary
                      </span>
                      <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                        Registered deed area differs from the polygon mapped by corner points.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-white/80 dark:bg-black/20 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/40 text-xs">
                    <div>
                      <div className="text-[10px] text-gray-500 uppercase font-semibold">Registered Area</div>
                      <div className="font-extrabold text-gray-900 dark:text-white text-sm">
                        {registeredAcres} Acres
                      </div>
                      <div className="text-[10px] text-gray-400">({currentFarmer?.total_hectares} Ha)</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-semibold">Mapped Area</div>
                      <div className="font-extrabold text-amber-700 dark:text-amber-400 text-sm">
                        {mappedAcres} Acres
                      </div>
                      <div className="text-[10px] font-bold text-amber-600 dark:text-amber-300">
                        +{areaDiffPercent.toFixed(1)}% diff
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowMismatchDialog(true)}
                    className="w-full py-1.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <Info size={14} />
                    <span>Recalculate & match policy</span>
                  </button>
                </div>
              )}

              {/* Farmland Size Overview Card */}
              <div className="bg-gradient-to-br from-[#2A0C58] via-[#3C1775] to-[#1E1035] text-white p-4 rounded-2xl shadow-md space-y-2">
                <span className="text-[11px] text-[#D9C7FF] uppercase font-bold tracking-wider">
                  Enclosed Polygon Cadastre
                </span>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-3xl font-black tracking-tight">{boundaryArea.acres}</span>
                    <span className="text-sm font-semibold text-[#D9C7FF] ml-1">Acres</span>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-sm text-emerald-300 font-bold">{boundaryArea.hectares} Ha</div>
                    <div className="text-[10px] text-purple-300">{boundaryArea.sqMeters.toLocaleString()} m²</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-[#E4DFEB]">
                  <span>Perimeter: <strong>{boundaryPerimeter.meters} m</strong> ({boundaryPerimeter.feet} ft)</span>
                  <span><strong>{boundaryPoints.length}</strong> Corners</span>
                </div>
              </div>

              {/* Vertices List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Corner Points ({boundaryPoints.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowJsonModal(!showJsonModal)}
                    className="text-[11px] text-[#8A57C0] dark:text-[#B890F9] font-bold hover:underline cursor-pointer"
                  >
                    {showJsonModal ? 'Hide JSON' : 'View JSON'}
                  </button>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {boundaryPoints.map((pt, i) => (
                    <div
                      key={`pt-row-${i}`}
                      className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#2A0C58]/20 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#2A0C58] text-white text-[10px] font-bold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div className="font-mono text-[11px] leading-tight text-gray-700 dark:text-gray-300">
                          <div>Lat: {pt[0].toFixed(5)}° N</div>
                          <div className="text-gray-400">Lng: {pt[1].toFixed(5)}° E</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {boundaryPoints.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-xs bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                      No boundary points defined.
                    </div>
                  )}
                </div>
              </div>

              {/* Collapsible JSON Coordinates Area */}
              {showJsonModal && (
                <div className="p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase">
                    Raw Coordinates Array ([lng, lat])
                  </label>
                  <textarea
                    rows={5}
                    readOnly
                    value={JSON.stringify(boundaryPoints.map(([lat, lng]) => [lng, lat]), null, 2)}
                    className="w-full font-mono text-[10px] bg-white dark:bg-[#1E1035] border border-gray-300 dark:border-gray-700 rounded p-1.5 leading-tight text-gray-800 dark:text-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        JSON.stringify(boundaryPoints.map(([lat, lng]) => [lng, lat]))
                      )
                      toast.success('Copied coordinates to clipboard!')
                    }}
                    className="text-[10px] text-[#8A57C0] dark:text-[#B890F9] font-bold hover:underline block cursor-pointer"
                  >
                    📋 Copy Coordinates JSON
                  </button>
                </div>
              )}
            </div>
          ) : activeTab === 'lines' ? (
            /* ── Tab 2: Drawing Studio & Lines Panel ── */
            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center justify-between">
                  <span>Linear Features</span>
                  <span className="text-xs bg-purple-100 dark:bg-purple-950/60 text-[#2A0C58] dark:text-[#D9C7FF] px-2 py-0.5 rounded-full font-bold">
                    {lines.length} Lines
                  </span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Pipelines, tractor paths, boundary fences, and power channels.
                </p>
              </div>

              {/* Existing Lines List */}
              <div className="space-y-2 text-xs">
                {lines.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 bg-gray-50 dark:bg-gray-800/30 rounded-xl">
                    No linear features plotted yet.
                  </div>
                ) : (
                  lines.map((line, idx) => {
                    const p = line.properties || {}
                    return (
                      <div
                        key={line.id || idx}
                        className="p-3 bg-white dark:bg-[#2A0C58]/20 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#2A0C58] dark:text-[#D9C7FF] flex items-center gap-2">
                            <span
                              className="w-3.5 h-3.5 rounded-full inline-block"
                              style={{ backgroundColor: p.color || '#7C3AED' }}
                            />
                            <span>{p.name || 'Farmland Line'}</span>
                          </span>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                            {p.line_style || 'solid'}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                          📏 {p.length_meters || 0} m ({p.length_feet || 0} ft) · Weight: {p.weight || 4}px
                        </div>
                        {isEditable && (
                          <div className="flex justify-end pt-1 border-t border-gray-100 dark:border-gray-800">
                            <button
                              type="button"
                              onClick={() => handleDeleteLine(p.id)}
                              className="text-rose-600 hover:text-rose-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 size={12} />
                              <span>Remove</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          ) : (
            /* ── Tab 3: Field Devices & Assets Panel ── */
            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center justify-between">
                  <span>Farm Devices & Infrastructure</span>
                  <span className="text-xs bg-purple-100 dark:bg-purple-950/60 text-[#2A0C58] dark:text-[#D9C7FF] px-2 py-0.5 rounded-full font-bold">
                    {devices.length} Active
                  </span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Solar borewells, CCTV security cameras, and multi-depth soil probes.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                {devices.map((f, i) => {
                  const p = f.properties || {}
                  const isSolarBorewell =
                    (p.resource_type === 'borewell_pump' && (p.power_source?.toLowerCase().includes('solar') || p.name?.toLowerCase().includes('solar'))) ||
                    p.device_type === 'solar_borewell'
                  const isSolarStation =
                    p.resource_type === 'solar_station' || p.device_type === 'solar_station'
                  const isWater = p.resource_type === 'borewell_pump' || p.device_type === 'borewell'
                  const isCamera = p.device_type === 'cctv_camera'

                  return (
                    <div
                      key={`dev-card-${p.id || i}`}
                      className="p-3 bg-white dark:bg-[#2A0C58]/20 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm space-y-2 transition-all hover:border-[#8A57C0]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#2A0C58] dark:text-[#D9C7FF] flex items-center gap-1.5">
                          <span>
                            {isSolarStation ? '⚡' : isSolarBorewell ? '☀️' : isWater ? '💧' : isCamera ? '📹' : '📡'}
                          </span>
                          <span>{p.name || p.device_name}</span>
                        </span>
                        <div className="flex items-center gap-1">
                          {(isSolarBorewell || isSolarStation) && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/40">
                              ☀️ Solar {p.solar_capacity_kw ? `${p.solar_capacity_kw}kW` : 'Active'}
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                            {p.status}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                        GPS: {f.geometry?.coordinates?.[1]?.toFixed(5)}° N, {f.geometry?.coordinates?.[0]?.toFixed(5)}° E
                      </div>

                      {(isWater || isSolarBorewell) && (
                        <div className="text-[11px] text-gray-600 dark:text-gray-300">
                          Capacity: {p.pump_capacity_hp || '10 HP'} · Depth: {p.depth_feet || 450} ft · Flow: {p.flow_rate_lpm || 150} L/min · Power: {p.power_source || 'Solar Hybrid'}
                        </div>
                      )}

                      {isSolarStation && (
                        <div className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                          ⚡ 12kW Solar Inverter & Grid Feedback · High-Efficiency Monocrystalline Panels
                        </div>
                      )}

                      {isCamera && (
                        <div className="text-[11px] text-gray-600 dark:text-gray-300">
                          {p.camera_model || 'Hikvision 4K Solar Dome'} · {p.resolution || '4K UHD'}
                        </div>
                      )}

                      {isEditable && (
                        <div className="flex items-center justify-between pt-1.5 border-t border-gray-100 dark:border-gray-800">
                          <button
                            type="button"
                            onClick={() => handleOpenEditDevice(f)}
                            className="text-[#8A57C0] dark:text-[#D9C7FF] hover:text-[#2A0C58] text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Edit point GPS coordinates, solar capacity, and telemetry"
                          >
                            <Edit3 size={12} />
                            <span>Edit Point & Solar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDevice(p.id)}
                            className="text-rose-600 hover:text-rose-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Area Mismatch Policy Dialog ── */}
      {showMismatchDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E1035] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-amber-300 dark:border-amber-800/80 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Cadastral Area Mismatch Resolution
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Cadastral policy regarding survey bounds vs deed records
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 leading-relaxed space-y-2">
              <p>
                <strong>Current State:</strong> The mapped boundary enclosed area is{' '}
                <span className="font-mono font-bold">{mappedAcres} acres</span>, whereas the registered land title record states{' '}
                <span className="font-mono font-bold">{registeredAcres} acres</span> (+{areaDiffPercent.toFixed(1)}% difference).
              </p>
              <p>
                <strong>Non-Destructive Policy:</strong> In agricultural digital twins, saved title deeds and survey revenue records are immutable without formal land re-survey approvals. Stored cadastral records are preserved.
              </p>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowMismatchDialog(false)}
                className="px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                Keep Registered Record
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMismatchDialog(false)
                  toast.info('👉 Click "Edit mode" in map toolbar to adjust corner points.')
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#8A57C0] to-[#2A0C58] text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Adjust in Edit Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Device / Solar Point Modal ── */}
      {showAddDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E1035] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>☀️</span>
                <span>Add Infrastructure / Solar Point</span>
              </h3>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-[#2A0C58] dark:text-[#D9C7FF] font-mono">
                {currentFarmer?.full_name}
              </span>
            </div>

            <form onSubmit={handleAddDevice} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Point / Device Name</label>
                <input
                  type="text"
                  value={deviceForm.device_name}
                  onChange={(e) => setDeviceForm({ ...deviceForm, device_name: e.target.value })}
                  placeholder="e.g. Primary Solar Borewell #2 (12kW)"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#2A0C58]/30 text-gray-900 dark:text-white focus:outline-none focus:border-[#8A57C0]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Device / Resource Type</label>
                  <select
                    value={deviceForm.device_type}
                    onChange={(e) => setDeviceForm({ ...deviceForm, device_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white focus:outline-none focus:border-[#8A57C0]"
                  >
                    <option value="solar_borewell">☀️ Solar Hybrid Borewell</option>
                    <option value="solar_station">⚡ 12kW Solar Power Station</option>
                    <option value="borewell">💧 Grid Electric Borewell</option>
                    <option value="cctv_camera">📹 4K AI CCTV Camera</option>
                    <option value="soil_sensor">📡 IoT Multi-Depth Soil Sensor</option>
                    <option value="valve">🚰 Automated Irrigation Valve</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Operating Status</label>
                  <select
                    value={deviceForm.status}
                    onChange={(e) => setDeviceForm({ ...deviceForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white focus:outline-none focus:border-[#8A57C0]"
                  >
                    <option value="ACTIVE_RUNNING">ACTIVE_RUNNING</option>
                    <option value="ONLINE">ONLINE</option>
                    <option value="STANDBY">STANDBY</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                  </select>
                </div>
              </div>

              {/* Precision GPS Coordinates */}
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-[#8A57C0]/30 space-y-2">
                <span className="text-[11px] font-bold text-[#2A0C58] dark:text-[#D9C7FF] flex items-center gap-1">
                  <MapPin size={13} />
                  <span>GPS Point Coordinates (Editable on Farmland)</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">Latitude (°N)</label>
                    <input
                      type="number"
                      step="any"
                      value={deviceForm.lat}
                      onChange={(e) => setDeviceForm({ ...deviceForm, lat: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white font-mono text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">Longitude (°E)</label>
                    <input
                      type="number"
                      step="any"
                      value={deviceForm.lng}
                      onChange={(e) => setDeviceForm({ ...deviceForm, lng: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white font-mono text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Solar & Pump Specifics */}
              {(deviceForm.device_type === 'solar_borewell' || deviceForm.device_type === 'borewell') && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-medium">Pump (HP)</label>
                    <input
                      type="number"
                      value={deviceForm.pump_capacity_hp}
                      onChange={(e) => setDeviceForm({ ...deviceForm, pump_capacity_hp: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-medium">Flow (LPM)</label>
                    <input
                      type="number"
                      value={deviceForm.flow_rate_lpm}
                      onChange={(e) => setDeviceForm({ ...deviceForm, flow_rate_lpm: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-medium">Depth (ft)</label>
                    <input
                      type="number"
                      value={deviceForm.depth_feet}
                      onChange={(e) => setDeviceForm({ ...deviceForm, depth_feet: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white text-xs"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDeviceModal(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#8A57C0] to-[#2A0C58] text-white font-bold shadow-md cursor-pointer hover:opacity-95"
                >
                  Add Solar / Device Point
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Device & Solar Point Modal ── */}
      {showEditDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E1035] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#8A57C0]/60">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Edit3 size={18} className="text-[#8A57C0]" />
                <span>Edit Point & Solar Telemetry</span>
              </h3>
              <span className="text-[11px] font-mono text-gray-500 dark:text-gray-400">
                ID: {editingDeviceId}
              </span>
            </div>

            <form onSubmit={handleSaveEditDevice} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Point / Device Name</label>
                <input
                  type="text"
                  value={editDeviceForm.device_name}
                  onChange={(e) => setEditDeviceForm({ ...editDeviceForm, device_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#2A0C58]/30 text-gray-900 dark:text-white focus:outline-none focus:border-[#8A57C0]"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Point / Resource Type</label>
                  <select
                    value={editDeviceForm.device_type}
                    onChange={(e) => setEditDeviceForm({ ...editDeviceForm, device_type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white focus:outline-none focus:border-[#8A57C0]"
                  >
                    <option value="solar_borewell">☀️ Solar Hybrid Borewell</option>
                    <option value="solar_station">⚡ 12kW Solar Power Station</option>
                    <option value="borewell">💧 Grid Electric Borewell</option>
                    <option value="cctv_camera">📹 4K AI CCTV Camera</option>
                    <option value="soil_sensor">📡 IoT Multi-Depth Soil Sensor</option>
                    <option value="valve">🚰 Automated Irrigation Valve</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Status</label>
                  <select
                    value={editDeviceForm.status}
                    onChange={(e) => setEditDeviceForm({ ...editDeviceForm, status: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white focus:outline-none focus:border-[#8A57C0]"
                  >
                    <option value="ACTIVE_RUNNING">ACTIVE_RUNNING</option>
                    <option value="ONLINE">ONLINE</option>
                    <option value="STANDBY">STANDBY</option>
                    <option value="MAINTENANCE">MAINTENANCE</option>
                    <option value="OFFLINE">OFFLINE</option>
                  </select>
                </div>
              </div>

              {/* Exact Point Coordinates Editing */}
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-xl border border-[#8A57C0]/30 space-y-2">
                <span className="text-[11px] font-bold text-[#2A0C58] dark:text-[#D9C7FF] flex items-center gap-1">
                  <MapPin size={13} />
                  <span>Edit Exact GPS Coordinates</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">Latitude (°N)</label>
                    <input
                      type="number"
                      step="any"
                      value={editDeviceForm.lat}
                      onChange={(e) => setEditDeviceForm({ ...editDeviceForm, lat: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white font-mono text-xs"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">Longitude (°E)</label>
                    <input
                      type="number"
                      step="any"
                      value={editDeviceForm.lng}
                      onChange={(e) => setEditDeviceForm({ ...editDeviceForm, lng: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white font-mono text-xs"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Power & Solar Specs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium">Power Source</label>
                  <input
                    type="text"
                    value={editDeviceForm.power_source}
                    onChange={(e) => setEditDeviceForm({ ...editDeviceForm, power_source: e.target.value })}
                    placeholder="e.g. 12kW Solar Array + 3-Phase Grid"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium">Solar Array Rating (kW)</label>
                  <input
                    type="number"
                    value={editDeviceForm.solar_capacity_kw}
                    onChange={(e) => setEditDeviceForm({ ...editDeviceForm, solar_capacity_kw: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditDeviceModal(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#8A57C0] to-[#2A0C58] text-white font-bold shadow-md cursor-pointer hover:opacity-95"
                >
                  Save Point Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Quick Add New Farmer Modal ── */}
      {showNewFarmerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#1E1035] rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-emerald-300 dark:border-emerald-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <UserPlus size={20} className="text-emerald-600" />
                <span>Register New Farmer & Farmland</span>
              </h3>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                Instant Twin
              </span>
            </div>

            <form onSubmit={handleCreateNewFarmer} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Farmer Full Name *</label>
                <input
                  type="text"
                  value={newFarmerForm.full_name}
                  onChange={(e) => setNewFarmerForm({ ...newFarmerForm, full_name: e.target.value })}
                  placeholder="e.g. Suresh Kumar"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#2A0C58]/30 text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={newFarmerForm.phone}
                    onChange={(e) => setNewFarmerForm({ ...newFarmerForm, phone: e.target.value })}
                    placeholder="+91 98421 00000"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 dark:text-gray-300 mb-1">Khata / Patta Number</label>
                  <input
                    type="text"
                    value={newFarmerForm.khata_number}
                    onChange={(e) => setNewFarmerForm({ ...newFarmerForm, khata_number: e.target.value })}
                    placeholder="e.g. TN-POL-5501"
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium">Village</label>
                  <input
                    type="text"
                    value={newFarmerForm.village}
                    onChange={(e) => setNewFarmerForm({ ...newFarmerForm, village: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium">District</label>
                  <input
                    type="text"
                    value={newFarmerForm.district}
                    onChange={(e) => setNewFarmerForm({ ...newFarmerForm, district: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium">Total Acres</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newFarmerForm.total_acres}
                    onChange={(e) => setNewFarmerForm({ ...newFarmerForm, total_acres: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white text-xs font-bold"
                  />
                </div>
              </div>

              {/* Initial Map Centroid */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-300/40 space-y-2">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                  <MapPin size={13} />
                  <span>Initial Farmland Coordinates (Auto-generates starter boundary & solar pump)</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">Latitude (°N)</label>
                    <input
                      type="number"
                      step="any"
                      value={newFarmerForm.lat}
                      onChange={(e) => setNewFarmerForm({ ...newFarmerForm, lat: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">Longitude (°E)</label>
                    <input
                      type="number"
                      step="any"
                      value={newFarmerForm.lng}
                      onChange={(e) => setNewFarmerForm({ ...newFarmerForm, lng: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#1E1035] text-gray-900 dark:text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFarmerModal(false)}
                  className="flex-1 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md cursor-pointer transition-colors"
                >
                  Create & Launch Studio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Scratch Map Digitizer Modal ── */}
      <ScratchMapDigitizerModal
        isOpen={showScratchModal}
        onClose={() => setShowScratchModal(false)}
        onSaved={(newFarmer) => {
          const fList = farmStorage.getFarmers()
          setFarmers(fList)
          setSelectedFieldId(newFarmer.field_id)
          setGeojson(farmStorage.getFieldGeoJSON(newFarmer.field_id))
          navigate(`/admin/editor/${newFarmer.field_id}`)
        }}
        onCreatedFarmer={(newFarmer) => {
          const fList = farmStorage.getFarmers()
          setFarmers(fList)
          setSelectedFieldId(newFarmer.field_id)
          setGeojson(farmStorage.getFieldGeoJSON(newFarmer.field_id))
          navigate(`/admin/editor/${newFarmer.field_id}`)
        }}
      />
    </div>
  )
}
