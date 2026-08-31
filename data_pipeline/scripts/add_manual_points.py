"""
Adds hand-picked candidate points to data/candidates/candidates_with_features.geojson
to patch known coverage gaps where the SpotAngels scrape has no listings, even though
real-world parking exists (e.g. informal/unregulated curb and RV parking that a paid
parking app wouldn't catalogue).

Currently covers: Mandela Parkway (flagged by a stakeholder review — heavy real-world
RV/curb parking with almost no selectable spots on the map).

How it works:
- Downloads the Oakland street graph from OSM (same source generate_parking_polygons.py
  uses) and finds every edge tagged with the target street name.
- Drops one candidate point per street edge/segment. generate_parking_polygons.py packs
  spots along the *entire* matched edge, not just near the candidate, so one point per
  block is enough to activate that block for packing.
- Computes real transit_dist and city_facility_dist (the only two proximity fields shown
  to users, in SitePanel's "Transit Access" and "Parks" amenity bars) via live OSM/Overpass
  queries, since the original government-source layers used for the rest of the dataset
  aren't available in this repo (see data/README.md).
- Fills the other proximity fields (not shown in the main UI, only used by the separate
  AHP/WSM ranking pages) with the dataset median, rather than 0, so these points don't look
  artificially closest-to or farthest-from anything in those rankings.

Usage:
    python data_pipeline/scripts/add_manual_points.py

Outputs:
    data/candidates/candidates_with_features_YYYY-MM-DD_HH-MM.geojson  (dated archive)
    data/candidates/candidates_with_features.geojson                    (latest, committed)

Next step: run data_pipeline/scripts/generate_parking_polygons.py to regenerate polygons.
"""

import json
import shutil
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CANDIDATES_DIR = ROOT / "data" / "candidates"
LATEST_FILE = CANDIDATES_DIR / "candidates_with_features.geojson"

# Proximity fields shown to users — computed for real via OSM/Overpass below.
VISIBLE_DIST_FIELDS = ["transit_dist", "city_facility_dist"]

# Remaining proximity fields (not shown in the main map UI, only used by AHP/WSM ranking
# pages) — filled with the dataset median so new points don't skew those rankings.
OTHER_DIST_FIELDS = [
    "homeless_service_dist", "assisted_housing_dist", "general_plan_dist",
    "public_housing_dist", "water_fountain_dist", "man_water_dist",
    "mobile_vending_dist", "water_infrastructure_dist", "streams_oakland_dist",
    "sewer_collection_dist", "wildfire_dist",
]

# Corridors to patch: OSM street name -> short id prefix / address label.
#
# id_prefix must be a slug of [A-Za-z0-9_-] only. It ends up inside every generated site_id
# ("<id_prefix>_<NNN>_<L|R>_<n>"), and the votes table enforces that charset via the
# votes_site_id_shape CHECK. A prefix with a space or punctuation would still sync into `sites`
# and render on the map, but every vote on that street would be rejected by the database with
# nothing in the UI to explain it. Keep it lowercase, no spaces.
TARGET_STREETS = [
    {"osm_name": "Mandela Parkway", "id_prefix": "mandela", "label": "Mandela Parkway"},
]


def find_street_edges(edges, osm_name):
    """Return one row per unique physical segment for the given street name.

    `graph_from_place` returns a directed graph, so a two-way block often appears as two
    edges (u->v and v->u) with identical geometry. Dedupe by node pair so we only place
    one candidate per physical block.
    """
    def matches(name):
        if isinstance(name, list):
            return any(osm_name.lower() in str(n).lower() for n in name)
        return osm_name.lower() in str(name).lower()

    matched = edges[edges["name"].apply(matches)].copy()
    matched["_pair"] = matched.apply(lambda r: frozenset({r["u"], r["v"]}), axis=1)
    return matched.drop_duplicates(subset="_pair")


def nearest_distances_m(points_gdf, features_gdf, utm_crs):
    """Distance in meters from each point to its nearest feature. Returns a list of
    floats, or a list of `None` if `features_gdf` is empty."""
    import geopandas as gpd

    if features_gdf.empty:
        return [None] * len(points_gdf)

    pts_utm = points_gdf.to_crs(utm_crs)
    feats_utm = features_gdf.to_crs(utm_crs)
    feats_utm = feats_utm[feats_utm.geometry.notnull()]
    feats_utm["geometry"] = feats_utm.geometry.centroid  # polygons (e.g. parks) -> point

    joined = gpd.sjoin_nearest(pts_utm, feats_utm[["geometry"]], how="left", distance_col="_d")
    # sjoin_nearest can return multiple equally-near matches per point; keep the first.
    joined = joined[~joined.index.duplicated(keep="first")]
    return joined.loc[points_gdf.index, "_d"].tolist()


def compute_medians(existing_features):
    medians = {}
    for field in OTHER_DIST_FIELDS + VISIBLE_DIST_FIELDS:
        values = [
            f["properties"][field]
            for f in existing_features
            if isinstance(f["properties"].get(field), (int, float))
        ]
        medians[field] = statistics.median(values) if values else 0.0
    return medians


def main():
    import geopandas as gpd
    import osmnx as ox

    print("Loading existing candidates …")
    with open(LATEST_FILE, encoding="utf-8") as f:
        existing_data = json.load(f)
    existing_features = existing_data["features"]
    existing_ids = {str(f["properties"]["id"]) for f in existing_features}
    medians = compute_medians(existing_features)

    print("Downloading Oakland street network from OSM (may take ~30s) …")
    G = ox.graph_from_place("Oakland, California, USA", network_type="drive")
    edges = ox.graph_to_gdfs(G, nodes=False).reset_index()

    new_features = []

    for street in TARGET_STREETS:
        segments = find_street_edges(edges, street["osm_name"])
        print(f"\n{street['osm_name']}: {len(segments)} street segments found")
        if segments.empty:
            print(f"  WARNING: no OSM edges matched '{street['osm_name']}' — skipping.")
            continue

        midpoints = segments.geometry.apply(lambda g: g.interpolate(0.5, normalized=True))
        points_gdf = gpd.GeoDataFrame(
            {"segment_idx": range(len(segments))}, geometry=midpoints.values, crs=edges.crs,
        )

        # Buffer the corridor's bounding box before querying Overpass for nearby transit
        # stops and parks, so edge-of-corridor points still find real nearby features.
        minx, miny, maxx, maxy = segments.total_bounds
        pad_deg_lat = 1500 / 111_320
        pad_deg_lon = 1500 / (111_320 * 0.79)  # approx cos(latitude) at Oakland's latitude
        bbox = (minx - pad_deg_lon, miny - pad_deg_lat, maxx + pad_deg_lon, maxy + pad_deg_lat)

        print("  Querying OSM for nearby transit stops …")
        transit = ox.features_from_bbox(bbox, tags={
            "highway": "bus_stop",
            "railway": ["stop", "station", "halt"],
            "public_transport": "stop_position",
        })
        print(f"    {len(transit)} transit stops found nearby")

        print("  Querying OSM for nearby parks …")
        parks = ox.features_from_bbox(bbox, tags={
            "leisure": ["park", "garden"],
            "landuse": "recreation_ground",
        })
        print(f"    {len(parks)} parks found nearby")

        transit_dists = nearest_distances_m(points_gdf, transit, utm_crs=26910)
        park_dists = nearest_distances_m(points_gdf, parks, utm_crs=26910)

        for i, (_, seg) in enumerate(segments.iterrows()):
            candidate_id = f"{street['id_prefix']}_{i + 1:03d}"
            if candidate_id in existing_ids:
                continue  # already added in a previous run

            pt = points_gdf.geometry.iloc[i]
            props = {
                "id": candidate_id,
                "address": f"{street['label']}, Oakland, CA",
                "max_stay": "unknown",
                "name": "Manually added — known coverage gap",
                "type": "free",
                "reason": (
                    "Manual addition: real-world curb/RV parking observed on this "
                    "corridor, not captured by the SpotAngels scrape."
                ),
                "transit_dist": transit_dists[i] if transit_dists[i] is not None else medians["transit_dist"],
                "city_facility_dist": park_dists[i] if park_dists[i] is not None else medians["city_facility_dist"],
            }
            for field in OTHER_DIST_FIELDS:
                props[field] = medians[field]

            new_features.append({
                "type": "Feature",
                "properties": props,
                "geometry": {"type": "Point", "coordinates": [pt.x, pt.y]},
            })

        print(f"  Prepared {len(new_features)} new candidate point(s) for {street['osm_name']}")

    if not new_features:
        print("\nNo new points to add (already present, or no streets matched). Exiting.")
        sys.exit(0)

    # Archive the current version before overwriting, same pattern as merge_data.py
    start_tag = datetime.now(timezone.utc).strftime("%Y-%m-%d_%H-%M")
    dated_output = CANDIDATES_DIR / f"candidates_with_features_{start_tag}.geojson"
    CANDIDATES_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(LATEST_FILE, dated_output)
    print(f"\nArchived current version to: {dated_output.name}")

    merged_features = existing_features + new_features
    merged_geojson = {
        "type": "FeatureCollection",
        "merged_at": datetime.now(timezone.utc).isoformat(),
        "total_spots": len(merged_features),
        "features": merged_features,
    }
    with open(LATEST_FILE, "w", encoding="utf-8") as f:
        json.dump(merged_geojson, f, indent=2, ensure_ascii=False)

    print(f"Added {len(new_features)} new candidate point(s).")
    print(f"Total candidates now: {len(merged_features)}")
    print(f"Updated latest: {LATEST_FILE.name}")
    print("\nNext step: run data_pipeline/scripts/generate_parking_polygons.py")


if __name__ == "__main__":
    main()
