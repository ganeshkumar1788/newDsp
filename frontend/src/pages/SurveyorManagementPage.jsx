import React, { useState, useEffect } from 'react'
import Icon from '../components/common/Icon'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import farmStorage from '../lib/farmStorage'
import toast from '../components/ui/Toast'

export default function SurveyorManagementPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  
  const [surveyors, setSurveyors] = useState([])
  const [activities, setActivities] = useState([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingSurveyor, setEditingSurveyor] = useState(null)
  
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    contact_number: '',
    area_place: '',
    password: 'surveyor123',
  })

  const loadSurveyors = () => {
    setSurveyors(farmStorage.getSurveyors())
  }

  const loadActivities = () => {
    setActivities(farmStorage.getSurveyorActivities())
  }

  useEffect(() => {
    if (user?.role !== 'admin' && user?.role !== 'land_verifier') {
      navigate('/admin/farmers')
      return
    }
    loadSurveyors()
    loadActivities()
  }, [user, navigate])

  const openAddModal = () => {
    setForm({
      full_name: '',
      email: '',
      contact_number: '',
      area_place: '',
      password: 'surveyor123',
    })
    setShowAddModal(true)
  }

  const openEditModal = (surveyor) => {
    setEditingSurveyor(surveyor)
    setForm({
      full_name: surveyor.full_name || '',
      email: surveyor.email || '',
      contact_number: surveyor.contact_number || '',
      area_place: surveyor.area_place || '',
      password: surveyor.password || 'surveyor123',
    })
    setShowAddModal(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (editingSurveyor) {
      farmStorage.saveUserCredential({
        ...editingSurveyor,
        ...form,
      })
      toast.success(`Surveyor ${form.full_name} updated successfully!`)
      setEditingSurveyor(null)
    } else {
      farmStorage.createSurveyor(form)
      toast.success(`New surveyor ${form.full_name} created successfully!`)
    }
    setShowAddModal(false)
    loadSurveyors()
  }

  const handleDelete = (surveyorId) => {
    if (confirm('Are you sure you want to delete this surveyor?')) {
      const creds = farmStorage.getUserCredentials()
      const filtered = creds.filter(c => !(c.id === surveyorId && c.role === 'surveyor'))
      localStorage.setItem('farmxt_user_credentials_v1', JSON.stringify(filtered))
      toast.success('Surveyor removed successfully.')
      loadSurveyors()
    }
  }

  const handleUpdateStatus = (surveyorId, isOnline) => {
    farmStorage.updateSurveyorStatus(surveyorId, { is_online: isOnline })
    loadSurveyors()
    toast.success(`Surveyor ${isOnline ? 'marked online' : 'marked offline'}`)
  }

  const groupedActivities = activities.reduce((acc, activity) => {
    if (!acc[activity.surveyor_id]) {
      acc[activity.surveyor_id] = []
    }
    acc[activity.surveyor_id].push(activity)
    return acc
  }, {})

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-v2v-deep/10 dark:bg-purple-950/80 text-v2v-deep dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50 text-xs font-bold mb-2">
            <Icon name="user" size={16} />
            <span>Surveyor Management</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-v2v-deep dark:text-purple-300 tracking-tight">
            Surveyor Directory & Activity
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Create new surveyors, monitor their activity, and manage field operations.
          </p>
        </div>
        {user?.role === 'admin' && (
          <button
            onClick={openAddModal}
            className="btn-v2v-gradient text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <span>+</span>
            <span>Create New Surveyor</span>
          </button>
        )}
        {user?.role === 'land_verifier' && (
          <Link
            to="/admin/farmers"
            className="btn-secondary text-xs sm:text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Icon name="map" size={16} />
            <span>Back to Farmers</span>
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-semibold">Total Surveyors</div>
          <div className="text-2xl font-extrabold text-v2v-deep dark:text-purple-300 mt-1">{surveyors.length}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Registered</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-semibold">Online Now</div>
          <div className="text-2xl font-extrabold text-v2v-deep dark:text-purple-300 mt-1">{surveyors.filter(s => s.is_online).length}</div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">Active</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-semibold">Activities Today</div>
          <div className="text-2xl font-extrabold text-v2v-deep dark:text-purple-300 mt-1">
            {activities.filter(a => new Date(a.timestamp).toDateString() === new Date().toDateString()).length}
          </div>
          <div className="text-[11px] text-v2v-secondary dark:text-purple-400 font-medium mt-0.5">Logged</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-gray-500 dark:text-slate-400 uppercase font-semibold">Total Activities</div>
          <div className="text-2xl font-extrabold text-v2v-deep dark:text-purple-300 mt-1">{activities.length}</div>
          <div className="text-[11px] text-gray-500 dark:text-slate-400 font-medium mt-0.5">All Time</div>
        </div>
      </div>

      {/* Surveyors List */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-v2v-deep dark:text-purple-300 mb-4">
          Surveyor List {user?.role === 'land_verifier' && <span className="text-xs font-normal text-gray-500 ml-2">(View Only)</span>}
        </h2>
        {surveyors.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-purple-500 mb-2 flex justify-center"><Icon name="user" size={36} /></div>
            <p className="font-semibold">No surveyors registered yet.</p>
            <p className="text-xs mt-1">Create your first surveyor to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {surveyors.map((surveyor) => (
              <div key={surveyor.id} className="p-4 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${surveyor.is_online ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                  <div>
                    <div className="font-bold text-sm">{surveyor.full_name}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">
                      {surveyor.email} · {surveyor.contact_number || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Area: {surveyor.area_place || 'Not specified'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user?.role === 'admin' && (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(surveyor.id, !surveyor.is_online)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                          surveyor.is_online
                            ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        }`}
                      >
                        {surveyor.is_online ? 'Set Offline' : 'Set Online'}
                      </button>
                      <button
                        onClick={() => openEditModal(surveyor)}
                        className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-bold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(surveyor.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 text-xs font-bold"
                      >
                        Delete
                      </button>
                    </>
                  )}
                  {user?.role === 'surveyor' && (
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      surveyor.is_online
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {surveyor.is_online ? '● Online' : '○ Offline'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activities */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-v2v-deep dark:text-purple-300 mb-4">Recent Surveyor Activities</h2>
        {activities.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-purple-500 mb-2 flex justify-center"><Icon name="file" size={36} /></div>
            <p className="font-semibold">No activities recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activities.slice(0, 20).map((activity) => {
              const surveyor = surveyors.find(s => s.id === activity.surveyor_id)
              return (
                <div key={activity.id} className="p-3 rounded-xl border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm">{surveyor?.full_name || 'Unknown Surveyor'}</span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(activity.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 dark:text-slate-400">
                    {activity.action || 'Activity logged'}
                    {activity.farmer_id && ` · Farmer: ${activity.farmer_id}`}
                    {activity.details && ` · ${activity.details}`}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-purple-200 dark:border-purple-800">
            <h3 className="text-lg font-bold text-v2v-deep dark:text-purple-300 mb-4">
              {editingSurveyor ? 'Edit Surveyor' : 'Create New Surveyor'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Contact Number</label>
                <input
                  type="text"
                  value={form.contact_number}
                  onChange={(e) => setForm({ ...form, contact_number: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Area / Region</label>
                <input
                  type="text"
                  value={form.area_place}
                  onChange={(e) => setForm({ ...form, area_place: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1">Password</label>
                <input
                  type="text"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setEditingSurveyor(null)
                  }}
                  className="flex-1 btn-secondary py-2"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-v2v-gradient py-2 font-bold">
                  {editingSurveyor ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
