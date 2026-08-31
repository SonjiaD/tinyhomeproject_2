import { useEffect, useState } from 'react'
import { fetchSuggestions, submitSuggestion, isInStudyArea } from '../lib/api'
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMapEvents } from 'react-leaflet'

interface Suggestion {
  id: string
  lat: number
  lng: number
  /** Submitter PII, deliberately absent from anything fetched. The public read goes through
   *  the suggestions_public view, which omits these exactly as GET /api/suggestions did — so
   *  they are only ever populated on the row appended locally right after you submit. */
  name?: string | null
  occupation?: string | null
  reason: string | null
  created_at: string
}

type PanelState = 'closed' | 'confirm' | 'form'

const inputClass =
  'w-full bg-white border border-border-input rounded-lg px-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 hover:border-primary-500/50 transition-colors'

function MapClickHandler({
  onMapClick,
  enabled,
}: {
  onMapClick: (lat: number, lng: number) => void
  enabled: boolean
}) {
  useMapEvents({
    click(e) {
      if (enabled) onMapClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function SuggestPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [pendingLatLng, setPendingLatLng] = useState<{ lat: number; lng: number } | null>(null)
  const [areaError, setAreaError] = useState<string | null>(null)
  const [pendingAddress, setPendingAddress] = useState<string | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [panelState, setPanelState] = useState<PanelState>('closed')
  const [svError, setSvError] = useState(false)

  const [name, setName] = useState('')
  const [occupation, setOccupation] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSuggestions()
      .then(rows => setSuggestions(rows))
      .catch(() => {
        // Non-fatal — map is still usable without existing suggestions
        setLoadError(true)
      })
      .finally(() => setLoading(false))
  }, [])

  async function handleMapClick(lat: number, lng: number) {
    // The database enforces this bbox too (suggestions_bbox). Checking here means an
    // out-of-area click fails immediately with a reason, instead of after the user has
    // filled in the form only to be told "please try again" — which would never work.
    if (!isInStudyArea(lat, lng)) {
      setAreaError('That spot is outside Oakland. Please choose a location within the city.')
      setPanelState('closed')
      setPendingLatLng(null)
      return
    }
    setAreaError(null)
    setPendingLatLng({ lat, lng })
    setPendingAddress(null)
    setGeocoding(true)
    setPanelState('confirm')
    setSubmitted(false)
    setName('')
    setOccupation('')
    setReason('')
    setError(null)
    setSvError(false)

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      )
      const data = await res.json()
      const addr = data.address ?? {}
      const street = [addr.house_number, addr.road].filter(Boolean).join(' ')
      const city = addr.city || addr.town || addr.village || 'Oakland'
      setPendingAddress(street ? `${street}, ${city}` : (data.display_name ?? null))
    } catch {
      // Non-fatal — coordinates are still shown as fallback
    } finally {
      setGeocoding(false)
    }
  }

  function handleCancel() {
    setPendingLatLng(null)
    setPanelState('closed')
  }

  function handleConfirm() {
    setPanelState('form')
  }

  async function handleSubmit() {
    if (!pendingLatLng) return
    setSubmitting(true)
    setError(null)
    try {
      await submitSuggestion({
        lat: pendingLatLng.lat,
        lng: pendingLatLng.lng,
        name: name.trim() || null,
        occupation: occupation.trim() || null,
        reason: reason.trim() || null,
      })
      // Add to local state so marker appears immediately without refetch
      setSuggestions(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          lat: pendingLatLng.lat,
          lng: pendingLatLng.lng,
          name: name.trim() || null,
          occupation: occupation.trim() || null,
          reason: reason.trim() || null,
          created_at: new Date().toISOString(),
        },
      ])
      setPendingLatLng(null)
      setSubmitted(true)
      setPanelState('closed')
    } catch {
      setError('Failed to save your suggestion. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const panelOpen = panelState !== 'closed'
  const mapHeight = 'calc(100vh - 140px)'

  return (
    <div className="flex flex-1 flex-col" style={{ minHeight: 0 }}>
      {/* Page header */}
      <div className="px-6 py-4 border-b border-border bg-white">
        <h1 className="text-xl font-semibold text-gray-900">Suggest a Location</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Click anywhere on the map to suggest where a tiny home parklet should go.
        </p>
      </div>

      {/* Map area */}
      <div className="relative" style={{ height: mapHeight }}>

        {/* Instruction label */}
        {!panelOpen && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]
            bg-white/95 backdrop-blur-sm border border-border rounded-full
            px-4 py-1.5 shadow-sm text-sm text-gray-600 pointer-events-none">
            Click anywhere on the map to drop a pin
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="absolute inset-0 z-[3000] flex items-center justify-center bg-white/90">
            <div className="flex flex-col items-center gap-4 text-center px-6">
              <svg className="w-10 h-10 text-primary-700 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-gray-800">Loading map…</p>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  Just a moment while we fetch existing suggestions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Out-of-area click. Rendered here rather than in the form panel, because that guard
            closes the panel — the panel's own error block would never be seen. */}
        {areaError && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]
            bg-accent-100 border border-accent-500 rounded-lg px-3 py-2 shadow-sm
            text-xs text-accent-700 max-w-xs text-center">
            {areaError}
          </div>
        )}

        {/* Non-blocking error — existing suggestions unavailable but map still works */}
        {loadError && (
          <div className="absolute top-3 right-3 z-[1000]
            bg-accent-100 border border-accent-500 rounded-lg px-3 py-2 shadow-sm
            text-xs text-accent-700 max-w-xs">
            Could not load existing suggestions. You can still add your own.
          </div>
        )}

        {/* Success toast */}
        {submitted && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]
            bg-primary-700 text-white rounded-full px-5 py-2 text-sm font-medium shadow-md pointer-events-none">
            Your suggestion has been saved. Thank you!
          </div>
        )}

        <div className="relative w-full" style={{ height: mapHeight }}>
          <MapContainer
            center={[37.8044, -122.2712]}
            zoom={13}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapClickHandler onMapClick={handleMapClick} enabled={!panelOpen} />

            {/* Saved suggestion markers */}
            {suggestions.map(s => (
              <CircleMarker
                key={s.id}
                center={[s.lat, s.lng]}
                radius={7}
                pathOptions={{
                  color: '#1a3a3a',
                  fillColor: '#2d6363',
                  fillOpacity: 0.85,
                  weight: 1.5,
                }}
              >
                <Tooltip direction="top" offset={[0, -8]} opacity={1}>
                  <div className="text-xs space-y-0.5">
                    {s.name && <div className="font-semibold">{s.name}</div>}
                    {s.occupation && <div className="text-gray-500">{s.occupation}</div>}
                    {s.reason && <div className="text-gray-600 max-w-[180px]">{s.reason}</div>}
                    {!s.name && !s.occupation && !s.reason && (
                      <div className="text-gray-400 italic">Anonymous suggestion</div>
                    )}
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}

            {/* Pending marker */}
            {pendingLatLng && (
              <CircleMarker
                center={[pendingLatLng.lat, pendingLatLng.lng]}
                radius={9}
                pathOptions={{
                  color: '#9a4a2f',
                  fillColor: '#c96d4f',
                  fillOpacity: 0.9,
                  weight: 2,
                }}
              />
            )}
          </MapContainer>
        </div>
      </div>

      {/* Slide-in panel */}
      <div
        className={`fixed right-0 top-0 h-full w-80 bg-white z-[2000] flex flex-col
          border-l-2 border-primary-800 shadow-[-4px_0_16px_rgba(0,0,0,0.12)]
          transition-transform duration-300 ease-in-out
          ${panelOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {panelState === 'confirm' && pendingLatLng && (
          <>
            <div className="flex items-start justify-between p-4 border-b border-gray-200 bg-primary-900">
              <div>
                <p className="text-xs text-primary-100 uppercase tracking-wide font-medium mb-0.5">New Pin</p>
                <p className="text-sm font-semibold text-white leading-snug">Confirm location</p>
              </div>
              <button onClick={handleCancel} className="ml-3 mt-0.5 text-primary-200 hover:text-white transition-colors shrink-0" aria-label="Cancel">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Street view */}
            <div className="w-full bg-gray-100 shrink-0 flex items-center justify-center" style={{ height: '160px' }}>
              {svError ? (
                <p className="text-xs text-gray-400 italic px-4 text-center">No street view available for this location</p>
              ) : (
                <img
                  src={`https://maps.googleapis.com/maps/api/streetview?size=320x160&location=${pendingLatLng.lat},${pendingLatLng.lng}&return_error_code=true&key=${import.meta.env.VITE_GOOGLE_SV_KEY}`}
                  alt="Street view"
                  className="w-full h-full object-cover"
                  onError={() => setSvError(true)}
                />
              )}
            </div>

            <div className="flex-1 p-4 flex flex-col gap-4">
              <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                {geocoding ? (
                  <p className="text-xs text-gray-400 italic">Looking up address…</p>
                ) : pendingAddress ? (
                  <>
                    <p className="text-xs text-gray-500 mb-1">Selected location</p>
                    <p className="text-sm font-medium text-gray-800">{pendingAddress}</p>
                    <p className="text-xs font-mono text-gray-400 mt-1">
                      {pendingLatLng.lat.toFixed(5)}, {pendingLatLng.lng.toFixed(5)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-1">Selected coordinates</p>
                    <p className="text-sm font-mono text-gray-700">
                      {pendingLatLng.lat.toFixed(5)}, {pendingLatLng.lng.toFixed(5)}
                    </p>
                  </>
                )}
              </div>

              <p className="text-sm text-gray-700">
                Is this where you'd suggest a tiny home parklet?
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleConfirm}
                  className="flex-1 rounded-md bg-primary-700 text-white text-sm font-medium py-2 hover:bg-primary-800 transition-colors"
                >
                  Yes, continue
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 rounded-md border border-gray-200 text-gray-600 text-sm font-medium py-2 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </>
        )}

        {panelState === 'form' && (
          <>
            <div className="flex items-start justify-between p-4 border-b border-gray-200 bg-primary-900">
              <div>
                <p className="text-xs text-primary-100 uppercase tracking-wide font-medium mb-0.5">Tell us about yourself</p>
                <p className="text-sm font-semibold text-white leading-snug">All fields optional</p>
              </div>
              <button onClick={handleCancel} className="ml-3 mt-0.5 text-primary-200 hover:text-white transition-colors shrink-0" aria-label="Cancel">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {error && (
                <div className="rounded-md bg-accent-100 border border-accent-500 px-3 py-2">
                  <p className="text-xs text-accent-700">{error}</p>
                </div>
              )}

              <input
                type="text"
                className={inputClass}
                placeholder="Your name (optional)"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={200}
              />
              <input
                type="text"
                className={inputClass}
                placeholder="Occupation or role (optional)"
                value={occupation}
                onChange={e => setOccupation(e.target.value)}
                maxLength={200}
              />
              <textarea
                className={inputClass}
                placeholder="Why this location? (optional)"
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={4}
                maxLength={500}
              />

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full rounded-md bg-primary-700 text-white text-sm font-medium py-2.5
                  hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving…' : 'Save my suggestion'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
