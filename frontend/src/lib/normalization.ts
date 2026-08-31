import type { VoteSite } from './types'

export interface DistanceBounds {
  min: number
  max: number
}

export const DIST_FIELDS = [
  'transit_dist',
  'water_infrastructure_dist',
  'city_facility_dist',
  'homeless_service_dist',
] as const

// These 3 have no OSM equivalent and are display-only: they power the SitePanel amenity
// bars, and are deliberately kept off DIST_FIELDS.
export const DISPLAY_ONLY_FIELDS = [
  'water_fountain_dist',
  'streams_oakland_dist',
  'grocery_dist',
] as const

type DistField = typeof DIST_FIELDS[number]

export function computeAllBounds(
  sites: VoteSite[],
  fields: readonly string[] = DIST_FIELDS,
): Record<string, DistanceBounds> {
  const result: Record<string, DistanceBounds> = {}
  for (const field of fields) {
    // Single pass instead of Math.min(...vals): spreading ~47k args can throw
    // "RangeError: Maximum call stack size exceeded" (notably in Safari).
    let min = Infinity
    let max = -Infinity
    let count = 0
    for (const s of sites) {
      const v = (s as unknown as Record<string, number>)[field]
      if (v == null || !isFinite(v)) continue
      if (v < min) min = v
      if (v > max) max = v
      count++
    }
    // No finite values → neutral bounds (min === max makes normalize() return 1, not NaN).
    result[field] = count ? { min, max } : { min: 0, max: 0 }
  }
  return result
}

export function normalize(value: number, bounds: DistanceBounds): number {
  if (bounds.max === bounds.min) return 1
  // closer = higher score, so invert
  return 1 - (value - bounds.min) / (bounds.max - bounds.min)
}

export function formatDistance(meters: number): string {
  const feet = meters * 3.28084
  if (feet < 5280) return `${Math.round(feet)} ft away`
  return `${(feet / 5280).toFixed(1)} mi away`
}