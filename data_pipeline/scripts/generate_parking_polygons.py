#!/usr/bin/env python3
"""
generate_parking_polygons.py

Run from any directory:
    python data_pipeline/scripts/generate_parking_polygons.py [--notes "..."]

Outputs:
    data/polygons/parking_polygons_latest.geojson       (latest tag — what the backend serves)
    data/runs/<timestamp>_generate_parking_polygons/    (history snapshot + manifest.yaml)

For each Oakland street edge that has a candidate parking point within 20 m,
packs as many 30 ft x 10 ft (9.14 m x 3.05 m) rectangles as possible.

Setback applied (California Daylighting Law AB 413 / CVC §22500):
  - 20 ft (6.10 m) from each block end (intersection / crosswalk clearance)

Three overlap guards prevent spurious duplicate/overlapping spots:
  - Duplicate directional OSM edges (a two-way block appears as both u->v and v->u
    with identical geometry) are collapsed to one before packing.
  - Within a single edge, a rectangle that would overlap one already placed on that
    edge (either side) is skipped — handles streets that curve back near themselves
    (hairpins/switchbacks), where two along-curve-distant positions can be
    physically close enough that their independently-offset rectangles collide.
  - A final global pass checks the finished spot set for overlaps across DIFFERENT
    edges (e.g. near complex intersections) that the per-edge guard can't see.
"""

import json
import math
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import run_history

ROOT = Path(__file__).resolve().parents[2]
START_TAG = datetime.now().strftime("%Y-%m-%d_%H-%M")
SCRIPT_NAME = "generate_parking_polygons"

import geopandas as gpd
from shapely.geometry import LineString, Polygon
from shapely.strtree import STRtree

try:
    import osmnx as ox
except ImportError:
    print("ERROR: osmnx is not installed. Run: pip install osmnx")
    sys.exit(1)

def _safe_float(val, default=0.0):
    try:
        v = float(val)
        return default if math.isnan(v) else v
    except (TypeError, ValueError):
        return default

# ── Constants ──────────────────────────────────────────────────────────────────
SPOT_LENGTH  = 9.144   # 30 ft in metres (length along the kerb)
SPOT_WIDTH   = 3.048   # 10 ft in metres (width into the road)
END_SETBACK  = 10.668  # 35 ft from OSM edge endpoint (= intersection centerline).
               #          OSM nodes sit at the intersection center, not the kerb.
               #          20 ft (6.096 m) California daylighting clearance from the
               #          near kerb of the cross-street, plus ~4.5 m cross-street
               #          half-width = ~10.6 m total from centerline-to-centerline.
SNAP_RADIUS  = 20.0    # Max distance (m) to snap a candidate point to a street edge
UTM_CRS      = 26910   # EPSG for UTM Zone 10N — metric operations
WGS84_CRS    = 4326

# Real end-to-end spots on the same edge touch at ~0 m²; anything above this is a
# genuine overlap (e.g. a hairpin/switchback street looping back near itself, where
# offsets computed from the local tangent at two different along-curve positions
# land on top of each other even though those positions are far apart "along the road").
OVERLAP_TOLERANCE_M2 = 0.5

# Road types that never have on-street parking (freeways, ramps, etc.)
NO_PARKING_TYPES = {
    "motorway", "motorway_link", "trunk", "trunk_link",
    "busway", "raceway", "escape",
}

# Half road width (m) by OSM highway type — used to place spot centers at the kerb.
# OSM edges are road centerlines; kerbs are ~half-width away.
HALF_WIDTHS: dict[str, float] = {
    "primary": 6.5, "primary_link": 5.5,
    "secondary": 5.5, "secondary_link": 5.0,
    "tertiary": 5.0, "tertiary_link": 4.5,
    "residential": 4.5, "unclassified": 4.5,
    "living_street": 4.0, "service": 3.5,
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def edge_bearing(line: LineString) -> float:
    """Bearing of a LineString in degrees (east = 0, counter-clockwise)."""
    coords = list(line.coords)
    dx = coords[-1][0] - coords[0][0]
    dy = coords[-1][1] - coords[0][1]
    return math.degrees(math.atan2(dy, dx))


def make_rectangle(cx: float, cy: float, length: float, width: float, bearing: float) -> Polygon:
    """Rectangle centred at (cx, cy), oriented to bearing (east = 0°)."""
    hl, hw = length / 2.0, width / 2.0
    rad = math.radians(bearing)
    cos_b, sin_b = math.cos(rad), math.sin(rad)
    local = [(-hl, -hw), (hl, -hw), (hl, hw), (-hl, hw)]
    return Polygon([
        (cx + lx * cos_b - ly * sin_b, cy + lx * sin_b + ly * cos_b)
        for lx, ly in local
    ])


def classify_side(edge_geom: LineString, cands_gdf) -> 'pd.Series':
    """Returns boolean Series: True = left of directed edge, False = right."""
    coords = list(edge_geom.coords)
    ax, ay = coords[0]
    bx, by = coords[-1]
    dx, dy = bx - ax, by - ay
    px = cands_gdf.geometry.x - ax
    py = cands_gdf.geometry.y - ay
    cross = dx * py - dy * px   # >0 → left of direction, <0 → right
    return cross >= 0


def pack_centres(seg_len: float) -> list:
    """
    Return along-segment centre positions for parking spots.

    Valid parking zone: [END_SETBACK, seg_len - END_SETBACK]
    Spots are placed end-to-end (SPOT_LENGTH apart) within that zone.
    Returns empty list if the zone is shorter than one spot.
    """
    zone_start = END_SETBACK
    zone_end   = seg_len - END_SETBACK
    if zone_end - zone_start < SPOT_LENGTH:
        return []
    centres = []
    pos = zone_start + SPOT_LENGTH / 2.0
    while pos + SPOT_LENGTH / 2.0 <= zone_end:
        centres.append(pos)
        pos += SPOT_LENGTH
    return centres


# ── Main ───────────────────────────────────────────────────────────────────────

def _parse_notes(argv):
    if "--notes" in argv:
        i = argv.index("--notes")
        if i + 1 < len(argv):
            return argv[i + 1]
    return ""


def main():
    notes = _parse_notes(sys.argv[1:])
    candidates_path = ROOT / "data" / "candidates" / "candidates_with_features.geojson"
    latest_output   = ROOT / "data" / "polygons" / "parking_polygons_latest.geojson"
    latest_output.parent.mkdir(parents=True, exist_ok=True)

    # 1. Load candidate points ──────────────────────────────────────────────────
    print("Loading candidate points …")
    cands = gpd.read_file(candidates_path).to_crs(UTM_CRS)
    print(f"  {len(cands):,} candidates loaded")

    # 2. Download Oakland street network ────────────────────────────────────────
    print("Downloading Oakland street network from OSM (may take ~30 s) …")
    G = ox.graph_from_place("Oakland, California, USA", network_type="drive")
    edges = ox.graph_to_gdfs(G, nodes=False).reset_index().to_crs(UTM_CRS)
    print(f"  {len(edges):,} street edges downloaded")

    # graph_from_place returns a directed graph, so a two-way block often appears as
    # two edges (u->v and v->u) with identical geometry. Packing both independently
    # would double every spot on that block. Same dedup pattern as
    # add_manual_points.py:find_street_edges — collapse by unordered node pair.
    n_edges_before_dedup = len(edges)
    edges["_pair"] = edges.apply(lambda r: frozenset({r["u"], r["v"]}), axis=1)
    edges = edges.drop_duplicates(subset="_pair").drop(columns="_pair").reset_index(drop=True)
    n_duplicate_directional_edges = n_edges_before_dedup - len(edges)
    print(f"  {n_duplicate_directional_edges:,} duplicate directional edges dropped "
          f"({len(edges):,} unique physical edges remain)")

    # 3. Snap each candidate to its nearest street edge ─────────────────────────
    print("Snapping candidates to nearest edges …")
    edges_slim = edges[["geometry", "highway"]].copy()
    joined = gpd.sjoin_nearest(
        cands, edges_slim,
        how="left",
        max_distance=SNAP_RADIUS,
        distance_col="_snap_d",
    )
    assigned = joined.dropna(subset=["index_right"])
    active_indices = assigned["index_right"].astype(int).unique()
    print(f"  {len(active_indices):,} street edges have candidate points")

    # 4. Pack rectangles along each active edge ─────────────────────────────────
    print("Packing parking spots …")
    features = []
    feature_rects_utm = []  # parallel to `features` — kept for the cross-edge pass below
    total = 0
    skipped_short = 0
    skipped_overlap = 0

    for edge_idx in active_indices:
        edge_row = edges.iloc[edge_idx]
        geom = edge_row.geometry

        # Use longest piece if MultiLineString
        if geom.geom_type == "MultiLineString":
            geom = max(geom.geoms, key=lambda g: g.length)
        if geom.geom_type != "LineString":
            continue

        seg_len = geom.length
        centres = pack_centres(seg_len)
        if not centres:
            skipped_short += 1
            continue

        highway_val = edge_row.get("highway", "residential")
        if isinstance(highway_val, list):
            highway_val = highway_val[0]
        highway_val = str(highway_val)
        if highway_val in NO_PARKING_TYPES:
            continue  # freeways, ramps — no street parking

        lateral = HALF_WIDTHS.get(highway_val, 4.5)  # metres from centerline to kerb

        # Metadata from the nearest candidates on this edge
        cands_here = assigned[assigned["index_right"] == edge_idx]
        if cands_here.empty:
            continue

        # Classify each candidate as left or right of the directed edge using
        # the overall edge direction (first→last point).
        is_left     = classify_side(geom, cands_here)
        left_cands  = cands_here[is_left]
        right_cands = cands_here[~is_left]

        sides = []
        if not right_cands.empty: sides.append((+1, "R", right_cands))
        if not left_cands.empty:  sides.append((-1, "L", left_cands))
        if not sides:             sides = [(+1, "R", cands_here)]  # fallback

        # Rectangles already placed on this edge (both sides) — checked against so
        # that a hairpin/switchback street (where a position near the start ends up
        # physically close to one near the end, even though far apart "along the
        # road") can't produce two independently-offset rectangles that overlap.
        edge_accepted = []

        for side_sign, side_label, side_cands in sides:
            ref = side_cands.iloc[0]

            for i, dist in enumerate(centres):
                pt = geom.interpolate(dist)

                # Local tangent at this position — handles curved roads correctly.
                # Sample 0.5 m ahead and behind; clamp to segment bounds.
                pt_a = geom.interpolate(min(dist + 0.5, seg_len))
                pt_b = geom.interpolate(max(dist - 0.5, 0.0))
                local_bearing = math.degrees(math.atan2(
                    pt_a.y - pt_b.y, pt_a.x - pt_b.x
                ))
                local_rad = math.radians(local_bearing)
                local_sin = math.sin(local_rad)
                local_cos = math.cos(local_rad)

                # Perpendicular offset: right=(sin,−cos), left=(−sin,cos)
                cx = pt.x + lateral * side_sign * local_sin
                cy = pt.y + lateral * (-side_sign) * local_cos
                rect_utm = make_rectangle(cx, cy, SPOT_LENGTH, SPOT_WIDTH, local_bearing)

                if any(rect_utm.intersection(r).area > OVERLAP_TOLERANCE_M2 for r in edge_accepted):
                    skipped_overlap += 1
                    continue
                edge_accepted.append(rect_utm)

                # Reproject to WGS84
                rect_wgs = (
                    gpd.GeoDataFrame(geometry=[rect_utm], crs=UTM_CRS)
                    .to_crs(WGS84_CRS)
                    .geometry.iloc[0]
                )

                # GeoJSON requires closed rings: first point == last point
                exterior = list(rect_wgs.exterior.coords)  # [(lon, lat), ...]
                ring = [[lon, lat] for lon, lat in exterior]
                if ring[0] != ring[-1]:
                    ring.append(ring[0])

                features.append({
                    "type": "Feature",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [ring],
                    },
                    "properties": {
                        "id":           f"{ref['id']}_{side_label}_{i}",
                        "parent_id":    str(ref["id"]),
                        "address":      str(ref.get("address", "")),
                        "spot_index":   i,
                        "side":         side_label,
                        "bearing_deg":  round(local_bearing, 2),
                        "transit_dist": _safe_float(ref.get("transit_dist")),
                        "water_infrastructure_dist": _safe_float(ref.get("water_infrastructure_dist")),
                        "city_facility_dist":        _safe_float(ref.get("city_facility_dist")),
                        "homeless_service_dist":     _safe_float(ref.get("homeless_service_dist")),
                    },
                })
                feature_rects_utm.append(rect_utm)
                total += 1

    # 4.5 Cross-edge overlap guard ────────────────────────────────────────────
    # The per-edge guard above only catches overlaps within a single OSM edge
    # (e.g. a hairpin/switchback street looping back near itself). Two DIFFERENT
    # edges — e.g. near a complex intersection — can still each independently
    # place a spot that overlaps the other's. One global pass over the finished
    # set catches those too.
    print("Checking for cross-edge overlaps …")
    tree = STRtree(feature_rects_utm)
    keep = [True] * len(features)
    skipped_cross_edge = 0
    for i, rect in enumerate(feature_rects_utm):
        if not keep[i]:
            continue
        for j in tree.query(rect):
            j = int(j)
            if j <= i or not keep[j]:
                continue
            if rect.intersection(feature_rects_utm[j]).area > OVERLAP_TOLERANCE_M2:
                keep[j] = False
                skipped_cross_edge += 1
    features = [f for f, k in zip(features, keep) if k]
    total = len(features)

    # 5. Write GeoJSON ───────────────────────────────────────────────────────────
    collection = {
        "type": "FeatureCollection",
        "total_spots": total,
        "features": features,
    }
    # Compact, no spaces — export_polygons_for_web.py reads total_spots from this file
    # (r'"total_spots":(\d+)') that requires no space after the colon. Do not
    # pretty-print this file.
    with open(latest_output, "w") as f:
        json.dump(collection, f, separators=(",", ":"))

    print(f"\n  Skipped {skipped_short:,} edges too short for even one spot")
    print(f"  Skipped {skipped_overlap:,} spots that would have overlapped an already-placed spot on the same edge")
    print(f"  Skipped {skipped_cross_edge:,} spots that overlapped a spot from a different edge")
    print(f"\nDone! {total:,} parking spots written.")
    print(f"  Latest: {latest_output}")

    prev, prev_dir = run_history.previous_manifest(SCRIPT_NAME)
    manifest = {
        "script": SCRIPT_NAME,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "candidates_input": len(cands),
        "osm": {
            "street_edges_downloaded": n_edges_before_dedup,
            "duplicate_directional_edges_dropped": n_duplicate_directional_edges,
            "active_edges": len(active_indices),
        },
        "spots": {
            "total": total,
            "skipped_short_edges": skipped_short,
            "skipped_overlapping_same_edge": skipped_overlap,
            "skipped_overlapping_cross_edge": skipped_cross_edge,
        },
        "previous_run": None,
        "diff_vs_previous": None,
        "notes": notes,
    }
    if prev_dir is not None:
        manifest["previous_run"] = f"data/runs/{prev_dir.name}/manifest.yaml"
        prev_total = (prev or {}).get("spots", {}).get("total")
        if prev_total is not None:
            manifest["diff_vs_previous"] = {"spot_count_delta": total - prev_total}
    run_dir = run_history.write_run(
        SCRIPT_NAME, START_TAG, manifest,
        snapshot_files={
            "parking_polygons.geojson": latest_output,
            "candidates_with_features.geojson": candidates_path,
        },
    )
    print(f"  Run history: {run_dir}")


if __name__ == "__main__":
    main()
