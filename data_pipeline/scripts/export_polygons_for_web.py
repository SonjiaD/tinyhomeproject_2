"""
Builds the browser copy of the parking polygons from
data/polygons/parking_polygons_latest.geojson.

The website used to fetch this file from a Flask endpoint (/api/polygon_map) on Render's
free tier, which meant every visitor after an idle period waited out a cold boot before the
map could draw. The file is now a static asset built into the frontend bundle, so it is
served straight from Netlify's CDN with a content-hashed, immutable URL.

The output uses a .json extension rather than .geojson on purpose: CDNs compress by
content type, and an unrecognised .geojson type can be served uncompressed - which would
mean shipping 41.8 MB instead of 2.7 MB. GeoJSON is JSON, so the extension is accurate.

The only transformation is rounding. Source coordinates carry ~17 decimal places, which is
float64 print noise on geometry derived from OSM street centrelines that are themselves
accurate to roughly 1-5 m. Rounding to 6 dp (~11 cm) and distances to 0.1 m discards digits
that never encoded anything, and roughly halves the transfer size. No geometry is
simplified and no property is dropped, so every field the UI reads survives intact.

Guardrails: the run aborts if the feature count changes or if any coordinate moves more than
MAX_SHIFT_M, so a future change to this script cannot quietly degrade the map.

Usage:
    python data_pipeline/scripts/export_polygons_for_web.py [--notes "..."]

Outputs:
    frontend/src/assets/parking_polygons.json      (imported with ?url by ParkingVotePage)
    frontend/src/lib/parkingMeta.ts                (TOTAL_SPOTS, replaces /api/polygon_count)
    data/runs/<timestamp>_export_polygons_for_web/manifest.yaml  (history record)
"""

import argparse
import gzip
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import run_history

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "data" / "polygons" / "parking_polygons_latest.geojson"
ASSET_OUT = ROOT / "frontend" / "src" / "assets" / "parking_polygons.json"
META_OUT = ROOT / "frontend" / "src" / "lib" / "parkingMeta.ts"
SCRIPT_NAME = "export_polygons_for_web"

COORD_DP = 6        # ~11 cm; OSM centrelines are accurate to ~1-5 m
DIST_DP = 1         # distances are in metres, 0.1 m is far past meaningful
MAX_SHIFT_M = 0.10  # abort if rounding moves any coordinate further than this

# Latitude degrees are ~111,320 m everywhere; longitude degrees shrink with latitude.
M_PER_DEG_LAT = 111_320.0
M_PER_DEG_LON = M_PER_DEG_LAT * math.cos(math.radians(37.8))  # Oakland


def round_coords(node):
    """Recursively round a GeoJSON coordinate array to COORD_DP."""
    if isinstance(node, list):
        return [round_coords(c) for c in node]
    return round(node, COORD_DP)


def max_shift_m(before, after):
    """Largest distance, in metres, that rounding moved any point of one geometry."""
    worst = 0.0
    for ring_before, ring_after in zip(before, after):
        for (lon0, lat0), (lon1, lat1) in zip(ring_before, ring_after):
            worst = max(worst,
                        abs(lon0 - lon1) * M_PER_DEG_LON,
                        abs(lat0 - lat1) * M_PER_DEG_LAT)
    return worst


def round_properties(props):
    """Round float properties in place: coordinate-ish fields to COORD_DP, the rest
    (distances in metres) to DIST_DP. Non-floats and nulls pass through untouched."""
    for key, value in props.items():
        if isinstance(value, float):
            is_coord = key.endswith("_lat") or key.endswith("_lon")
            props[key] = round(value, COORD_DP if is_coord else DIST_DP)
    return props


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--notes", default="", help="Free-text note recorded in the manifest")
    args = parser.parse_args()

    start_tag = datetime.now().strftime("%Y-%m-%d_%H-%M")

    if not SOURCE.exists():
        print(f"ERROR: {SOURCE} not found. Run generate_parking_polygons.py first.")
        sys.exit(1)

    # compute_spot_distances.py can emit bare NaN, which is invalid JSON. app.py patched this
    # at read time; do it here instead so the shipped asset is valid JSON for the browser.
    raw = SOURCE.read_text(encoding="utf-8")
    nan_fixes = raw.count(":NaN") + raw.count(": NaN")
    if nan_fixes:
        raw = raw.replace(":NaN", ":null").replace(": NaN", ": null")

    data = json.loads(raw)
    source_bytes = len(raw.encode("utf-8"))
    source_count = len(data["features"])
    total_spots = data.get("total_spots", source_count)

    worst_shift = 0.0
    for feature in data["features"]:
        geometry = feature["geometry"]
        original = geometry["coordinates"]
        rounded = round_coords(original)
        worst_shift = max(worst_shift, max_shift_m(original, rounded))
        geometry["coordinates"] = rounded
        feature["properties"] = round_properties(feature["properties"])

    # Guardrails - fail loudly rather than silently shipping degraded geometry.
    if len(data["features"]) != source_count:
        print(f"ERROR: feature count changed ({source_count} -> {len(data['features'])})")
        sys.exit(1)
    if worst_shift > MAX_SHIFT_M:
        print(f"ERROR: rounding moved a coordinate {worst_shift:.3f} m "
              f"(limit {MAX_SHIFT_M} m). Aborting.")
        sys.exit(1)

    # Compact separators: this is machine-read only, and whitespace is pure transfer cost.
    out = json.dumps(data, separators=(",", ":"))
    ASSET_OUT.parent.mkdir(parents=True, exist_ok=True)
    ASSET_OUT.write_text(out, encoding="utf-8")
    out_bytes = len(out.encode("utf-8"))
    gzip_bytes = len(gzip.compress(out.encode("utf-8"), 9))

    META_OUT.parent.mkdir(parents=True, exist_ok=True)
    META_OUT.write_text(
        "// Generated by data_pipeline/scripts/export_polygons_for_web.py - do not edit.\n"
        "// Replaces the old GET /api/polygon_count round trip with a build-time constant.\n"
        f"export const TOTAL_SPOTS = {total_spots}\n",
        encoding="utf-8",
    )

    prev, _ = run_history.previous_manifest(SCRIPT_NAME)
    manifest = {
        "script": SCRIPT_NAME,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "spots": {"total": total_spots, "features": source_count},
        "rounding": {
            "coord_decimals": COORD_DP,
            "distance_decimals": DIST_DP,
            "max_coord_shift_m": round(worst_shift, 4),
            "limit_m": MAX_SHIFT_M,
        },
        "size_bytes": {
            "source": source_bytes,
            "output": out_bytes,
            "output_gzip": gzip_bytes,
        },
        "nan_literals_fixed": nan_fixes,
        "previous_run": (str(prev["generated_at"]) if prev else None),
        "diff_vs_previous": (
            {"spot_count_delta": total_spots - prev["spots"]["total"]} if prev else None
        ),
        "notes": args.notes,
    }
    # No geojson snapshot: the source file is already snapshotted by
    # generate_parking_polygons.py, and this output is derived from it deterministically.
    run_dir = run_history.write_run(SCRIPT_NAME, start_tag, manifest, {})

    pct = 100 * (1 - gzip_bytes / source_bytes)
    print(f"Wrote {ASSET_OUT.relative_to(ROOT)}")
    print(f"  {source_count:,} features, {total_spots:,} spots, all properties retained")
    print(f"  {source_bytes/1e6:.1f} MB source -> {out_bytes/1e6:.1f} MB raw "
          f"-> {gzip_bytes/1e6:.1f} MB gzipped ({pct:.0f}% smaller over the wire)")
    print(f"  max coordinate shift {worst_shift*100:.2f} cm (limit {MAX_SHIFT_M*100:.0f} cm)")
    if nan_fixes:
        print(f"  fixed {nan_fixes} bare NaN literal(s)")
    print(f"Wrote {META_OUT.relative_to(ROOT)} (TOTAL_SPOTS = {total_spots:,})")
    print(f"History: {run_dir.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
