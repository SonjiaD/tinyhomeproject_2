/**
 * Every data call the app makes, in one place.
 *
 * These used to be ad-hoc axios/fetch calls to a Flask backend on Render's free tier,
 * scattered across the pages with three separate reads of VITE_API_URL. The backend was
 * a thin proxy in front of Supabase, so the calls now go straight to Supabase and the
 * server is gone — along with the 30-60s cold start it imposed on the first visit after
 * any idle period.
 *
 * Identity is no longer asserted by the client. Row Level Security derives it from the
 * caller's signed JWT via auth.uid(), so a request simply cannot touch another user's
 * votes — the guarantee require_user() used to provide in Python, enforced at the database.
 */

import { supabase } from './supabase'
import type { VoteCountsMap } from './types'
import polygonAssetUrl from '../assets/parking_polygons.json?url'

export { TOTAL_SPOTS } from './parkingMeta'

/**
 * The parking polygons, as a content-hashed bundle asset.
 *
 * Vite fingerprints the filename, so Netlify can serve it immutable (see public/_headers)
 * and a repeat visit spends no network at all. The old /api/polygon_map sent a weak ETag with
 * `Cache-Control: no-cache`, so even a cached copy cost a revalidation round trip to a server
 * that was usually asleep.
 *
 * The .json extension is deliberate: CDNs choose compression by content type, and an
 * unrecognised .geojson type can be served uncompressed — 41.8 MB instead of 2.7 MB.
 */
export const POLYGON_URL = polygonAssetUrl

/** PostgREST caps a single response at 1000 rows; anything unbounded has to page. */
const PAGE_SIZE = 1000

/** Max rows per batch write. Matches the old endpoint's limit and keeps payloads modest. */
export const BATCH_CHUNK = 500

/** Longest note we store, mirroring the votes_comment_len CHECK constraint. */
const MAX_COMMENT = 500

export interface MyVotes {
  votes: Record<string, boolean>
  comments: Record<string, string>
}

export interface SuggestionPin {
  id: string
  lat: number
  lng: number
  reason: string | null
  created_at: string
}

/**
 * The current user's id, for use as a row value on writes.
 *
 * This is not a security check — RLS independently rejects any row whose user_id is not
 * auth.uid(), so a tampered value fails at the database. It exists so writes carry the
 * column at all, and so the UI can fail with a clear message instead of a 403.
 */
async function requireUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  const id = session?.user?.id
  if (!id) throw new Error('You must be logged in to vote')
  return id
}

/**
 * Strictly interpret a support value, mirroring app.py's parse_support().
 *
 * The Python original guarded against bool("false") being True, which would have silently
 * recorded opposition as support. JS has no equivalent trap, but the strictness is worth
 * keeping: it means a malformed value fails loudly here rather than being coerced into a
 * wrong row that quietly corrupts the research dataset.
 */
export function parseSupport(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === 0) return value === 1
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase()
    if (s === 'true' || s === 'yes' || s === '1') return true
    if (s === 'false' || s === 'no' || s === '0') return false
  }
  throw new Error(`Invalid support value: ${String(value)}`)
}

/** Read every row of a table/view, a page at a time. */
async function selectAllPages<T>(table: string, columns: string): Promise<T[]> {
  const rows: T[] = []
  for (let page = 0; ; page++) {
    const from = page * PAGE_SIZE
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE_SIZE - 1)
    if (error) throw error
    const batch = (data ?? []) as T[]
    rows.push(...batch)
    if (batch.length < PAGE_SIZE) return rows
  }
}

// ── Reads ────────────────────────────────────────────────────────────────────

/**
 * Per-site tallies for the whole map. Replaces GET /api/votes.
 *
 * site_vote_counts aggregates from votes alone, so it already contains only sites that have
 * been voted on — the old query had to filter total_votes > 0 because site_vote_summary left
 * joined all 46,970 sites.
 */
export async function fetchVoteCounts(): Promise<VoteCountsMap> {
  const rows = await selectAllPages<{
    site_id: string; support_count: number; oppose_count: number; total_votes: number
  }>('site_vote_counts', 'site_id, support_count, oppose_count, total_votes')

  const counts: VoteCountsMap = {}
  for (const row of rows) {
    counts[row.site_id] = {
      yes: row.support_count ?? 0,
      no: row.oppose_count ?? 0,
      total: row.total_votes ?? 0,
    }
  }
  return counts
}

/** Community-wide yes count for the header stat. Replaces GET /api/votes/summary. */
export async function fetchTotalYes(): Promise<number> {
  const { data, error } = await supabase
    .from('vote_totals')
    .select('total_yes')
    .single()
  if (error) throw error
  return data?.total_yes ?? 0
}

/**
 * This user's votes and notes. Replaces GET /api/votes/mine.
 *
 * Paging is not optional: a single user already holds more than 10,000 vote rows, well past
 * PostgREST's 1000-row cap. RLS restricts the result to the caller's own rows, so no user_id
 * filter is needed — and unlike the old query-param approach, no user_id can be supplied to
 * read somebody else's record.
 *
 * The old endpoint smuggled notes back under a reserved "__comments__" key because the
 * frontend and backend deployed separately and reshaping the response would have broken
 * older bundles. They ship together now, so the shape can just be honest.
 */
export async function fetchMyVotes(): Promise<MyVotes> {
  const rows = await selectAllPages<{
    site_id: string; support: boolean; comment: string | null
  }>('votes', 'site_id, support, comment')

  const votes: Record<string, boolean> = {}
  const comments: Record<string, string> = {}
  for (const row of rows) {
    votes[row.site_id] = row.support
    if (row.comment) comments[row.site_id] = row.comment
  }
  return { votes, comments }
}

/** Public suggestion pins. Replaces GET /api/suggestions. */
export async function fetchSuggestions(): Promise<SuggestionPin[]> {
  const { data, error } = await supabase
    .from('suggestions_public')
    .select('id, lat, lng, reason, created_at')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as SuggestionPin[]
}

// ── Writes ───────────────────────────────────────────────────────────────────

/**
 * Build an upsert payload, including `comment` only when the caller supplied one.
 *
 * This is the whole trick behind note preservation. PostgREST builds its
 * ON CONFLICT DO UPDATE SET list from the keys present in the payload, so omitting `comment`
 * leaves the stored note untouched, while including it (even as an empty string) sets or
 * clears it. app.py achieved the same thing with a read-before-write on every vote; this
 * needs no extra round trip.
 *
 * Verified against PostgREST directly: flipping `support` with `comment` absent preserved
 * the existing note and kept the same row id, so the vote_events audit trail stays intact.
 */
function voteRow(userId: string, siteId: string, support: boolean, comment?: string | null) {
  const row: Record<string, unknown> = { user_id: userId, site_id: siteId, support }
  if (comment !== undefined && comment !== null) {
    row.comment = comment.slice(0, MAX_COMMENT) || null
  }
  return row
}

/**
 * Cast or change one vote. Replaces POST /api/votes.
 *
 * Pass `comment` to set or clear the note; omit it to leave whatever is stored alone.
 */
export async function submitVote(
  siteId: string,
  support: boolean,
  comment?: string | null,
): Promise<void> {
  const userId = await requireUserId()
  const { error } = await supabase
    .from('votes')
    .upsert(voteRow(userId, siteId, parseSupport(support), comment), {
      onConflict: 'user_id,site_id',
    })
  if (error) throw error
}

/** Retract one vote. Replaces DELETE /api/votes. */
export async function deleteVote(siteId: string): Promise<void> {
  const userId = await requireUserId()
  // RLS already scopes deletes to the caller; the explicit user_id is belt and braces.
  const { error } = await supabase
    .from('votes')
    .delete()
    .eq('site_id', siteId)
    .eq('user_id', userId)
  if (error) throw error
}

/**
 * Cast one vote across many sites at once. Replaces POST /api/votes/batch.
 *
 * Callers chunk to BATCH_CHUNK and report progress between chunks. An empty or absent
 * `comment` preserves each site's existing note; a non-empty one overwrites all of them,
 * which is what the batch comment box has always meant.
 */
export async function submitBatch(
  siteIds: string[],
  support: boolean,
  comment?: string | null,
): Promise<void> {
  if (siteIds.length === 0) return
  if (siteIds.length > BATCH_CHUNK) {
    throw new Error(`Too many site_ids (max ${BATCH_CHUNK})`)
  }
  const userId = await requireUserId()
  const checked = parseSupport(support)
  const text = comment?.trim() ? comment : undefined
  const { error } = await supabase
    .from('votes')
    .upsert(siteIds.map(id => voteRow(userId, id, checked, text)), {
      onConflict: 'user_id,site_id',
    })
  if (error) throw error
}

/** Retract many votes at once. Replaces DELETE /api/votes/batch. */
export async function deleteBatch(siteIds: string[]): Promise<void> {
  if (siteIds.length === 0) return
  if (siteIds.length > BATCH_CHUNK) {
    throw new Error(`Too many site_ids (max ${BATCH_CHUNK})`)
  }
  const userId = await requireUserId()
  const { error } = await supabase
    .from('votes')
    .delete()
    .in('site_id', siteIds)
    .eq('user_id', userId)
  if (error) throw error
}

/**
 * Submit a suggested location. Replaces POST /api/suggestions.
 *
 * Truncation mirrors the suggestions_field_lengths CHECK constraint, so an over-long field
 * is trimmed here rather than rejected by the database.
 */
export async function submitSuggestion(input: {
  lat: number
  lng: number
  name?: string | null
  occupation?: string | null
  reason?: string | null
}): Promise<void> {
  const { error } = await supabase.from('suggestions').insert({
    lat: Number(input.lat),
    lng: Number(input.lng),
    name: (input.name ?? '').slice(0, 200) || null,
    occupation: (input.occupation ?? '').slice(0, 200) || null,
    reason: (input.reason ?? '').slice(0, MAX_COMMENT) || null,
  })
  if (error) throw error
}
