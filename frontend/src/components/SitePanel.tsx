import { useState, useEffect } from 'react'
import { formatDistance, normalize } from '../lib/normalization'
import { submitVote, deleteVote, fetchSiteNotes } from '../lib/api'
import type { SiteNote } from '../lib/api'
import type { VoteSite, VoteTally } from '../lib/types'
import type { DistanceBounds } from '../lib/normalization'

/**
 * Renders the deliberately coarse note date. The view truncates to the month precisely so an
 * anonymous note cannot be pinned to a day, so this must not reach for anything finer.
 */
function formatNoteMonth(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  if (d.getUTCFullYear() === now.getUTCFullYear() && d.getUTCMonth() === now.getUTCMonth()) {
    return 'this month'
  }
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** One anonymous note. No author is rendered because none is fetched. */
function NoteRow({ note }: { note: SiteNote }) {
  return (
    <li className="py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-semibold ${note.support ? 'text-green-700' : 'text-red-600'}`}>
          {note.support ? '▲ Support' : '▼ Oppose'}
        </span>
        <span className="text-[11px] text-gray-400">{formatNoteMonth(note.posted_month)}</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
        {note.comment}
      </p>
    </li>
  )
}

/** Notes shown before the list collapses behind "Show N more". */
const VISIBLE_NOTES = 3

interface AmenityBarProps {
  label: string
  rawMeters: number
  bounds: DistanceBounds
}

function AmenityBar({ label, rawMeters, bounds }: AmenityBarProps) {
  const fill = normalize(rawMeters, bounds)
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-400">{formatDistance(rawMeters)}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2">
        <div
          className="h-2 rounded-full bg-teal-500 transition-all duration-300"
          style={{ width: `${Math.round(fill * 100)}%` }}
        />
      </div>
    </div>
  )
}

interface SitePanelProps {
  site: VoteSite | null
  allBounds: Record<string, DistanceBounds>
  voteTally: VoteTally
  myVote: boolean | undefined
  /** The note this user already saved for this site, so the textarea can be edited rather
   *  than silently overwritten. */
  savedComment?: string
  onClose: () => void
  onVoteSubmitted: (siteId: string, newTally: VoteTally, support: boolean) => void
  onVoteUndone: (siteId: string, newTally: VoteTally) => void
  onCommentSaved?: (siteId: string, comment: string) => void
}

export function SitePanel({ site, allBounds, voteTally, myVote, savedComment, onClose, onVoteSubmitted, onVoteUndone, onCommentSaved }: SitePanelProps) {
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [savingNote, setSavingNote] = useState(false)
  const [noteSaved, setNoteSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [svError, setSvError] = useState(false)
  const [notes, setNotes] = useState<SiteNote[]>([])
  const [notesLoading, setNotesLoading] = useState(false)
  const [showAllNotes, setShowAllNotes] = useState(false)
  /** The stance a pending flip would switch to, while we ask what to do with the note. */
  const [pendingFlip, setPendingFlip] = useState<boolean | null>(null)

  const isOpen = site !== null
  const commentDirty = comment.trim() !== (savedComment ?? '').trim()

  async function handleUndo() {
    if (!site || myVote === undefined) return
    setSubmitting(true)
    setError(null)
    const restore = myVote
    const newTally: VoteTally = {
      yes: voteTally.yes - (myVote ? 1 : 0),
      no: voteTally.no - (myVote ? 0 : 1),
      total: Math.max(0, voteTally.total - 1),
    }
    onVoteUndone(site.id, newTally)
    try {
      await deleteVote(site.id)
      // The note lived on the deleted vote row, so drop it from the panel and the cache too.
      setComment('')
      setLastSaved('')
      onCommentSaved?.(site.id, '')
    } catch {
      setError('Failed to undo your vote. Please try again.')
      onVoteSubmitted(site.id, voteTally, restore)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSaveNote() {
    if (!site || myVote === undefined) return
    setSavingNote(true)
    setError(null)
    const text = comment.trim()
    try {
      await submitVote(site.id, myVote, text)
      onCommentSaved?.(site.id, text)
      setNoteSaved(true)
      setTimeout(() => setNoteSaved(false), 2000)
    } catch {
      setError('Failed to save your note. Please try again.')
    } finally {
      setSavingNote(false)
    }
  }

  async function handleVote(support: boolean) {
    if (!site) return
    // Clicking the already-selected side used to retract the vote. That silently destroyed
    // real users' notes (people click the highlighted button expecting it to save), so undo
    // now lives on its own explicit "Remove my vote" control below.
    if (myVote === support) {
      if (commentDirty) await handleSaveNote()
      return
    }
    // Notes are public now, so carrying one across a flip would republish an argument under
    // the stance it argues against — "great transit access" filed under Oppose. Ask first.
    // Flipping with nothing written keeps its one-tap behaviour.
    if (myVote !== undefined && comment.trim()) {
      setPendingFlip(support)
      return
    }
    await commitVote(support, comment.trim())
  }

  async function commitVote(support: boolean, noteText: string) {
    if (!site) return
    setPendingFlip(null)
    setSubmitting(true)
    setError(null)
    const prev = myVote

    const newTally: VoteTally = prev === undefined
      ? { yes: voteTally.yes + (support ? 1 : 0), no: voteTally.no + (support ? 0 : 1), total: voteTally.total + 1 }
      : { yes: voteTally.yes + (support ? 1 : -1), no: voteTally.no + (support ? -1 : 1), total: voteTally.total }

    onVoteSubmitted(site.id, newTally, support)
    try {
      // noteText is decided by the caller: the textarea's contents normally, or '' when the
      // flip prompt was answered with Clear.
      await submitVote(site.id, support, noteText)
      setComment(noteText)
      onCommentSaved?.(site.id, noteText)
    } catch {
      setError('Failed to save your vote. Please try again.')
      if (prev !== undefined) {
        onVoteSubmitted(site.id, voteTally, prev)
      } else {
        onVoteUndone(site.id, voteTally)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Other people's notes for the open site. Fetched per site rather than in bulk, and cleared
  // first so a previous site's notes never render under a new address during the request.
  useEffect(() => {
    const siteId = site?.id
    if (!siteId) return
    let cancelled = false
    setNotes([])
    setShowAllNotes(false)
    setNotesLoading(true)
    fetchSiteNotes(siteId)
      .then(rows => { if (!cancelled) setNotes(rows) })
      .catch(() => { if (!cancelled) setNotes([]) })
      .finally(() => { if (!cancelled) setNotesLoading(false) })
    return () => { cancelled = true }
  }, [site?.id])

  // Reset error/street-view when switching sites, and prefill the textarea with the note
  // already saved for the newly selected site so it can be read and edited.
  const [lastSiteId, setLastSiteId] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string>('')
  if (site && site.id !== lastSiteId) {
    setLastSiteId(site.id)
    setLastSaved(savedComment ?? '')
    setComment(savedComment ?? '')
    setError(null)
    setSvError(false)
    setNoteSaved(false)
    setPendingFlip(null)
  } else if (site && (savedComment ?? '') !== lastSaved) {
    // Notes hydrate from the server after mount, so a site selected during that window
    // starts blank. Adopt the value when it lands — but only if the user hasn't typed,
    // which would otherwise clobber what they're mid-way through writing.
    const untouched = comment === lastSaved
    setLastSaved(savedComment ?? '')
    if (untouched) setComment(savedComment ?? '')
  }

  return (
    <div
      className={`fixed right-0 top-0 h-full w-80 bg-white z-[2000] flex flex-col
        border-l-2 border-primary-800 shadow-[-4px_0_16px_rgba(0,0,0,0.12)]
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
    >
      {site && (
        <>
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-gray-200 bg-primary-900">
            <div>
              <p className="text-xs text-primary-100 uppercase tracking-wide font-medium mb-0.5">Proposed Site</p>
              <p className="text-sm font-semibold text-white leading-snug">{site.address || 'Unnamed site'}</p>
              <p className="text-xs text-primary-200 mt-0.5">30 ft × 10 ft parking space</p>
            </div>
            <button
              onClick={onClose}
              className="ml-3 mt-0.5 text-primary-200 hover:text-white transition-colors shrink-0"
              aria-label="Close panel"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Street view image — clicks open Google Maps */}
          <a
            href={`https://maps.google.com/?q=${site.lat},${site.lon}`}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block w-full bg-gray-100 shrink-0 group"
            style={{ height: '160px' }}
          >
            {svError ? (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-xs text-gray-400 italic px-4 text-center">No street view available for this location</p>
              </div>
            ) : (
              <img
                src={`https://maps.googleapis.com/maps/api/streetview?size=320x160&location=${site.lat},${site.lon}&return_error_code=true&key=${import.meta.env.VITE_GOOGLE_SV_KEY}`}
                alt="Street view"
                className="w-full h-full object-cover"
                onError={() => setSvError(true)}
              />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded">
                Open in Google Maps ↗
              </span>
            </div>
          </a>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* Amenity bars */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Nearby Amenities</p>
              <div className="space-y-3">
                <AmenityBar label="Transit Access" rawMeters={site.transit_dist} bounds={allBounds['transit_dist']} />
                <AmenityBar label="Parks" rawMeters={site.city_facility_dist} bounds={allBounds['city_facility_dist']} />
                <AmenityBar label="Grocery Access" rawMeters={site.grocery_dist} bounds={allBounds['grocery_dist']} />
                <AmenityBar label="Water Fountains" rawMeters={site.water_fountain_dist} bounds={allBounds['water_fountain_dist']} />
                <AmenityBar label="Streams" rawMeters={site.streams_oakland_dist} bounds={allBounds['streams_oakland_dist']} />
              </div>
            </div>

            {/* Vote tally */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Community Votes</p>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-teal-600">{voteTally.yes}</p>
                  <p className="text-xs text-gray-500">Support</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent-600">{voteTally.no}</p>
                  <p className="text-xs text-gray-500">Oppose</p>
                </div>
              </div>
            </div>

            {/* Vote UI — Reddit/Google Maps toggle pattern */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Vote</p>

              {error && (
                <div className="rounded-md bg-accent-100 border border-accent-500 px-3 py-2 mb-3">
                  <p className="text-xs text-accent-700">{error}</p>
                </div>
              )}

              {pendingFlip !== null ? (
                /* Flipping with a note attached. Inline rather than a modal so the note being
                   discussed stays on screen while the choice is made. */
                <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3">
                  <p className="text-xs text-amber-900 leading-relaxed mb-2">
                    You wrote a note {myVote ? 'supporting' : 'opposing'} this spot. It will be
                    shown publicly under your new answer.
                  </p>
                  <p className="text-sm text-gray-700 italic border-l-2 border-amber-300 pl-2 mb-3 break-words">
                    {comment.trim()}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => commitVote(pendingFlip, comment.trim())}
                      disabled={submitting}
                      className="flex-1 rounded-md bg-teal-500 text-white text-sm font-medium py-2
                        hover:bg-teal-400 transition-colors disabled:opacity-50"
                    >
                      Keep note
                    </button>
                    <button
                      onClick={() => commitVote(pendingFlip, '')}
                      disabled={submitting}
                      className="flex-1 rounded-md border border-gray-300 text-gray-700 text-sm font-medium py-2
                        hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                      Clear it
                    </button>
                  </div>
                  <button
                    onClick={() => setPendingFlip(null)}
                    className="w-full text-xs text-gray-500 hover:text-gray-700 mt-2 underline underline-offset-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => handleVote(true)}
                  disabled={submitting}
                  className={`flex-1 rounded-md text-sm font-medium py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                    ${myVote === true
                      ? 'bg-green-600 text-white hover:bg-green-700 ring-2 ring-green-200'
                      : 'border border-green-500 text-green-700 hover:bg-green-50'}`}
                >
                  {myVote === true ? '✓ Supported' : 'Support'}
                </button>
                <button
                  onClick={() => handleVote(false)}
                  disabled={submitting}
                  className={`flex-1 rounded-md text-sm font-medium py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                    ${myVote === false
                      ? 'bg-red-600 text-white hover:bg-red-700 ring-2 ring-red-200'
                      : 'border border-red-400 text-red-600 hover:bg-red-50'}`}
                >
                  {myVote === false ? '✗ Opposed' : 'Oppose'}
                </button>
              </div>
              )}

              {/* Note editor. A note lives on the vote row (votes.support is NOT NULL), so
                  it can only be saved once a vote exists. */}
              <div className="mt-4">
                <div className="flex items-baseline justify-between mb-1.5">
                  <label htmlFor="site-note" className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Your note <span className="text-teal-600">· Public</span>
                  </label>
                  <span className="text-[11px] text-gray-400">{comment.length}/500</span>
                </div>
                <textarea
                  id="site-note"
                  value={comment}
                  onChange={e => { setComment(e.target.value); setNoteSaved(false) }}
                  placeholder={myVote === undefined ? 'Vote first, then add a note…' : 'Why this spot? Everyone on the map can read this.'}
                  rows={3}
                  maxLength={500}
                  disabled={myVote === undefined}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700
                    placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400
                    focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-400"
                />

                <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                  Shown to others without your name. Please don't include personal details like
                  your address.
                </p>

                {myVote === undefined ? (
                  <p className="text-xs text-gray-400 mt-2">
                    Choose Support or Oppose above to leave a note.
                  </p>
                ) : (
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={handleSaveNote}
                      disabled={savingNote || !commentDirty}
                      className="rounded-md bg-teal-500 text-white text-sm font-medium px-4 py-1.5
                        hover:bg-teal-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {savingNote ? 'Saving…' : 'Save note'}
                    </button>
                    {noteSaved && !commentDirty && (
                      <span className="text-xs text-green-600 font-medium">Saved ✓</span>
                    )}
                    {commentDirty && !savingNote && (
                      <span className="text-xs text-amber-600">Unsaved changes</span>
                    )}
                  </div>
                )}
              </div>

              {myVote !== undefined && (
                <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                  <button
                    onClick={handleUndo}
                    disabled={submitting}
                    className="text-xs text-gray-400 hover:text-red-600 transition-colors underline underline-offset-2 disabled:opacity-50"
                  >
                    Remove my vote
                  </button>
                </div>
              )}
            </div>

            {/* Everyone else's notes. Your own is deliberately absent: the view excludes the
                caller's row, so it appears once, in the editor above, where it is editable. */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-baseline justify-between mb-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Community Notes
                </p>
                {notes.length > 0 && (
                  <span className="text-[11px] text-gray-400">{notes.length}</span>
                )}
              </div>

              {notesLoading ? (
                <p className="text-xs text-gray-400 py-2">Loading notes…</p>
              ) : notes.length === 0 ? (
                <p className="text-xs text-gray-400 py-2 leading-relaxed">
                  No notes yet — be the first to say why this spot works, or doesn't.
                </p>
              ) : (
                <>
                  <p className="text-[11px] text-gray-400 mb-1">Shown without names.</p>
                  <ul>
                    {(showAllNotes ? notes : notes.slice(0, VISIBLE_NOTES)).map((note, i) => (
                      <NoteRow key={i} note={note} />
                    ))}
                  </ul>
                  {notes.length > VISIBLE_NOTES && (
                    <button
                      onClick={() => setShowAllNotes(v => !v)}
                      className="w-full text-xs text-teal-600 hover:text-teal-500 font-medium mt-2 py-1"
                    >
                      {showAllNotes
                        ? 'Show fewer'
                        : `Show ${notes.length - VISIBLE_NOTES} more`}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
