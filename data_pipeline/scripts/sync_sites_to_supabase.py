"""
Syncs every parking spot from data/polygons/parking_polygons_latest.geojson into
the Supabase `sites` table, so votes (which reference site_id) can be joined to each
spot's real location, address, amenity distances, and Oakland neighborhood for research.

Each spot's neighborhood is derived here via a spatial join against
frontend/public/oakland_neighborhoods.geojson (the same Oakland Open Data neighborhood
boundaries the onboarding UI lists), so vote data can be sliced by BOTH the respondent's
neighborhood (from profiles) and the site's neighborhood (from sites).

Requires a SERVICE ROLE key (not the anon key): the `sites` table has RLS enabled with a
public-read-only policy, so writes must come from the trusted service role. Add
SUPABASE_SERVICE_ROLE_KEY to .env at the repo root (Supabase dashboard -> Settings -> API ->
service_role secret). Never expose this key in the frontend.

Usage:
    python data_pipeline/scripts/sync_sites_to_supabase.py [--notes "..."]

Outputs:
    Upserts all current spots into Supabase `sites`, prunes rows no longer in the geojson.
    data/runs/<timestamp>_sync_sites_to_supabase/manifest.yaml  (history record)
"""

import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import geopandas as gpd
from dotenv import load_dotenv
import os

import run_history

ROOT = Path(__file__).resolve().parents[2]
POLYGONS_FILE = ROOT / "data" / "polygons" / "parking_polygons_latest.geojson"
NEIGHBORHOODS_FILE = ROOT / "frontend" / "public" / "oakland_neighborhoods.geojson"
UTM_CRS = 26910
SCRIPT_NAME = "sync_sites_to_supabase"
BATCH_SIZE = 200        # keep each PostgREST payload small enough to avoid disconnects
MAX_RETRIES = 4

# Columns copied straight from each geojson feature's properties into the sites row.
PASSTHROUGH_FIELDS = [
    "parent_id", "address", "side", "spot_index", "bearing_deg",
    "transit_dist", "water_infrastructure_dist", "city_facility_dist",
    "homeless_service_dist", "water_fountain_dist", "streams_oakland_dist", "grocery_dist",
    "transit_nearest_lat", "transit_nearest_lon",
    "city_facility_nearest_lat", "city_facility_nearest_lon",
    "water_fountain_nearest_lat", "water_fountain_nearest_lon",
    "streams_oakland_nearest_lat", "streams_oakland_nearest_lon",
    "grocery_nearest_lat", "grocery_nearest_lon",
]


def get_client():
    load_dotenv(ROOT / ".env")
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env at the repo root")
        print("  The sites table has RLS enabled, so writes require the service_role key")
        print("  (Supabase dashboard -> Settings -> API -> service_role secret).")
        sys.exit(1)
    from supabase import create_client
    return create_client(url, key)


def _with_retry(fn):
    """Run a Supabase call, retrying transient disconnects with backoff."""
    for attempt in range(MAX_RETRIES):
        try:
            return fn()
        except Exception as e:
            if attempt == MAX_RETRIES - 1:
                raise
            wait = 2 ** attempt
            print(f"    transient error ({type(e).__name__}); retry {attempt + 1}/{MAX_RETRIES - 1} in {wait}s")
            time.sleep(wait)


def _num(v):
    """None for NaN/missing, else a plain float/int for JSON serialization."""
    if v is None:
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if f != f:  # NaN
        return None
    return f


def build_rows():
    print("Loading parking spots ...")
    gdf = gpd.read_file(POLYGONS_FILE)
    print(f"  {len(gdf):,} spots loaded")

    # Centroid per spot in metric CRS, back to WGS84 lat/lng (matches the rest of the pipeline).
    cent = gdf.to_crs(UTM_CRS).geometry.centroid.to_crs(4326)
    gdf = gdf.assign(_lng=cent.x.values, _lat=cent.y.values)
    cent_gdf = gpd.GeoDataFrame(gdf.drop(columns="geometry"), geometry=cent, crs=4326)

    print("Deriving each spot's Oakland neighborhood ...")
    hoods = gpd.read_file(NEIGHBORHOODS_FILE)[["name", "geometry"]].to_crs(4326)
    joined = gpd.sjoin(cent_gdf, hoods, how="left", predicate="within")
    # sjoin can duplicate a point that lands on a boundary between two polygons; keep first.
    joined = joined[~joined.index.duplicated(keep="first")].reindex(gdf.index)
    neighborhoods = joined["name"].tolist()
    matched = sum(1 for n in neighborhoods if isinstance(n, str))
    print(f"  {matched:,}/{len(gdf):,} spots matched to a neighborhood")

    rows = []
    for i, (_, feat) in enumerate(gdf.iterrows()):
        row = {
            "site_id": str(feat["id"]),
            "lat": _num(feat["_lat"]),
            "lng": _num(feat["_lng"]),
            "neighborhood": neighborhoods[i] if isinstance(neighborhoods[i], str) else None,
            "city": "Oakland",
        }
        for field in PASSTHROUGH_FIELDS:
            val = feat[field] if field in feat.index else None
            if field in ("side", "address", "parent_id"):
                row[field] = None if val is None else str(val)
            elif field == "spot_index":
                n = _num(val)
                row[field] = int(n) if n is not None else None
            else:
                row[field] = _num(val)
        rows.append(row)
    return rows


def main():
    notes = sys.argv[sys.argv.index("--notes") + 1] if "--notes" in sys.argv else ""
    start_tag = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M")
    client = get_client()

    rows = build_rows()
    current_ids = {r["site_id"] for r in rows}

    print(f"Upserting {len(rows):,} sites in batches of {BATCH_SIZE} ...")
    for start in range(0, len(rows), BATCH_SIZE):
        chunk = rows[start:start + BATCH_SIZE]
        _with_retry(lambda: client.table("sites").upsert(chunk).execute())
        print(f"  upserted {min(start + BATCH_SIZE, len(rows)):,}/{len(rows):,}")

    # Prune sites that are no longer in the current geojson (spot IDs shift between
    # pipeline reruns). Fetch existing ids paginated, delete the difference.
    print("Pruning stale sites ...")
    existing_ids = []
    page = 0
    while True:
        resp = _with_retry(
            lambda: client.table("sites").select("site_id").range(page * 1000, page * 1000 + 999).execute()
        )
        batch = [r["site_id"] for r in resp.data]
        existing_ids.extend(batch)
        if len(batch) < 1000:
            break
        page += 1
    stale = [sid for sid in existing_ids if sid not in current_ids]
    for start in range(0, len(stale), BATCH_SIZE):
        chunk = stale[start:start + BATCH_SIZE]
        _with_retry(lambda: client.table("sites").delete().in_("site_id", chunk).execute())
    print(f"  pruned {len(stale):,} stale sites")

    print(f"\nDone. sites table now holds {len(current_ids):,} spots.")

    prev, prev_dir = run_history.previous_manifest(SCRIPT_NAME)
    manifest = {
        "script": SCRIPT_NAME,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sites_upserted": len(rows),
        "sites_pruned": len(stale),
        "neighborhoods_matched": sum(1 for r in rows if r["neighborhood"]),
        "previous_run": None,
        "diff_vs_previous": None,
        "notes": notes,
    }
    if prev_dir is not None:
        manifest["previous_run"] = f"data/runs/{prev_dir.name}/manifest.yaml"
        prev_total = (prev or {}).get("sites_upserted")
        if prev_total is not None:
            manifest["diff_vs_previous"] = {"site_count_delta": len(rows) - prev_total}
    run_dir = run_history.write_run(SCRIPT_NAME, start_tag, manifest, snapshot_files={})
    print(f"  Run history: {run_dir}")


if __name__ == "__main__":
    main()
