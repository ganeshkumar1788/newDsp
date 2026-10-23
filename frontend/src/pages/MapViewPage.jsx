/**
 * MapViewPage — Interactive satellite map for a single field (Surveyor / Verifier Portal)
 *
 * Uses the ONE unified AgriMap component with role="surveyor".
 */
import React, { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import VerificationDrawer from '../components/verification/VerificationDrawer'
import SurveyEntryPanel from '../components/survey/SurveyEntryPanel'
import AIInsightsPanel from '../components/ai/AIInsightsPanel'
import toast from '../components/ui/Toast'
import AgriMap from '../components/map/AgriMap'

export default function MapViewPage() {
  const { fieldId } = useParams()
  const { user } = useAuth()

  const [geojson, setGeojson] = useState(null)
  const [field, setField] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [verifyTarget, setVerifyTarget] = useState(null)
  const [showSurvey, setShowSurvey] = useState(false)
  const [showAI, setShowAI] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [gj, fd] = await Promise.all([
        api.get(`/export/field/${fieldId}/geojson`),
        api.get(`/fields/${fieldId}`),
      ])
      setGeojson(gj.data)
      setField(fd.data)
      setFetchError(null)
    } catch (e) {
      console.warn('Backend offline, loading farm GeoJSON from local storage:', e.message)
      const { farmStorage } = await import('../lib/farmStorage')
      const localGj = farmStorage.getFieldGeoJSON(fieldId)
      setGeojson(localGj)
      const fieldFeat = localGj.features?.find((f) => f.properties?.entity_type === 'field')?.properties
      setField(fieldFeat || { id: fieldId, name: 'Smart Farmland' })
      setFetchError(null)
    } finally {
      setLoading(false)
    }
  }, [fieldId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="flex flex-col h-dvh bg-[#F4F3F9] dark:bg-[#131313]">
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-white dark:bg-[#1E1035] border-b border-gray-200 dark:border-gray-800 flex-shrink-0 z-20">
        <Link
          to={field?.project_id ? `/projects/${field.project_id}` : '/dashboard'}
          className="text-xs font-bold text-gray-500 hover:text-[#8A57C0] transition-colors"
        >
          ← Back to Projects
        </Link>
        <span className="text-gray-300 dark:text-gray-700">|</span>
        <span className="text-sm font-bold text-gray-900 dark:text-white truncate max-w-xs">
          {field?.name ?? 'Loading Farmland Cadastre…'}
        </span>
        <div className="flex-1" />

        <div className="flex gap-2 flex-shrink-0">
          {(user?.role === 'admin' || user?.role === 'verifier' || user?.role === 'surveyor') && (
            <button
              onClick={() => setShowSurvey(true)}
              className="bg-gradient-to-r from-[#8A57C0] to-[#2A0C58] text-white text-xs py-1.5 px-3 rounded-xl font-bold shadow-sm hover:opacity-95 cursor-pointer"
            >
              + Survey
            </button>
          )}
          <button
            onClick={() => setShowAI(true)}
            className="border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs py-1.5 px-3 rounded-xl font-bold transition-colors cursor-pointer"
          >
            🤖 AI
          </button>
        </div>
      </div>

      {/* Map Engine */}
      <div className="flex-1 relative min-h-0">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 dark:bg-black/60">
            <div className="w-8 h-8 border-4 border-[#8A57C0] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {fetchError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/90 dark:bg-black/80">
            <div className="text-center">
              <div className="text-red-600 mb-3 text-sm">Failed to load map data.</div>
              <button
                className="px-3 py-1.5 rounded-xl bg-[#8A57C0] text-white text-xs font-bold"
                onClick={fetchData}
              >
                Retry
              </button>
            </div>
          </div>
        )}
        <AgriMap
          key={`surveyor-map-${fieldId}`}
          role="surveyor"
          farm={field}
          geojson={geojson}
          user={user}
          height="100%"
          className="w-full h-full"
        />
      </div>

      {/* Panels */}
      {verifyTarget && (
        <VerificationDrawer
          resourceType={verifyTarget.type}
          item={verifyTarget.item}
          onClose={() => setVerifyTarget(null)}
          onVerified={() => {
            setVerifyTarget(null)
            fetchData()
          }}
        />
      )}
      {showSurvey && (
        <SurveyEntryPanel
          fieldId={fieldId}
          field={field}
          onClose={() => setShowSurvey(false)}
          onSaved={() => {
            setShowSurvey(false)
            fetchData()
          }}
        />
      )}
      {showAI && (
        <AIInsightsPanel fieldId={fieldId} onClose={() => setShowAI(false)} />
      )}
    </div>
  )
}
