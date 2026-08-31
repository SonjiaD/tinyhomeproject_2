import { TOTAL_SPOTS } from './parkingMeta'

/**
 * Total on-street parking spots in the dataset.
 *
 * This used to fetch GET /api/polygon_count on mount, which meant the number was briefly
 * unknown on every page load — and unknown for 30-60s whenever Render's free instance was
 * cold. Callers papered over that with hardcoded fallbacks that had drifted out of date, so
 * a cold backend showed visitors a stale count. The value is now baked in at build time by
 * export_polygons_for_web.py, so it is always present and always matches the shipped map.
 *
 * Kept as a hook rather than inlining TOTAL_SPOTS at its four call sites so the value has a
 * single import path, and so it can go back to being dynamic without touching callers.
 */
export function useParkingCount(): number {
  return TOTAL_SPOTS
}
