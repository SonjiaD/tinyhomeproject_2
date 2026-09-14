"""
Rebuild frontend/public/oakland_boundary.geojson from the neighbourhoods layer.

The city outline drawn on the map is not a legal city-limits file. It is the land footprint of
Oakland, produced by dissolving the 137 polygons in oakland_neighborhoods.geojson into one
shape. The previous version of the file was made that way by hand and the dissolve did not
fully close: 8 seams between neighbourhood polygons survived as out-and-back spurs up to 850 m
long and mostly under 3 m wide, and one neighbourhood ("Not Named3") never merged at all and
was carried as a second, detached polygon. On the map those looked like the boundary folding
inward on itself. Every spur tip sat 57 m to 1.7 km *inside* the real city limit, so none of
them was boundary.

This script does the same dissolve properly and records how, so the file can be regenerated
whenever the neighbourhoods layer changes.

How the seams are closed
------------------------
A morphological closing: buffer outward by CLOSE_M metres, then back inward by the same amount.
Any gap narrower than 2 * CLOSE_M is filled; everything wider comes back to within floating
point of where it was. A closing is not free of side effects — it also fillets concave corners
by up to CLOSE_M — so the radius is kept as small as the data allows.

A sweep of 5–60 m showed every seam, both inlets and the detached piece close at 5 m: the gaps
were hair-thin, never real corridors. 10 m is used for margin. At that radius, with mitred
joins, no vertex of the plain dissolve moves more than 8 m (95th percentile: 0 m), which is
invisible at any zoom this map is used at. The narrowest genuine feature on the outline, the
Alameda estuary, is several hundred metres wide and cannot be touched.

Holes: the neighbourhoods layer does not cover Piedmont, a separate city entirely inside
Oakland, so the dissolve naturally has a ~4.4 km² hole there. That hole is real and is kept, so
the file describes Oakland's land minus Piedmont and the frontend needs no geometry surgery of
its own. It is identified geometrically — the hole that contains a vertex of
piedmont_boundary.geojson — not by size. Every other hole is filled. Almost all are seams
between neighbourhood polygons; the one that is not is Lake Merritt (~0.6 km²), which the layer
does not cover and which is nonetheless Oakland — a city outline should not ring its own lake.
Any filled hole larger than a seam is printed with its centroid so a new one would be noticed.

The result must be exactly one polygon. If more than one survives with any real area, the
script exits non-zero rather than silently dropping a piece of the city.

Why not the legal boundary from OpenStreetMap? It is authoritative, but it runs miles out into
the Bay to the county line, which reads as a large box in the water behind a parking map. The
land footprint is the better outline for this purpose; it just has to be built correctly.

Usage:
    venv/Scripts/python data_pipeline/scripts/build_oakland_boundary.py
"""

from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

from shapely.geometry import MultiPolygon, Point, Polygon, mapping, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

REPO = Path(__file__).resolve().parents[2]
NEIGHBOURHOODS = REPO / "frontend" / "public" / "oakland_neighborhoods.geojson"
PIEDMONT = REPO / "frontend" / "public" / "piedmont_boundary.geojson"
OUTPUT = REPO / "frontend" / "public" / "oakland_boundary.geojson"

# Closing radius. Fills gaps narrower than twice this. See module docstring for how it was chosen.
CLOSE_M = 10.0

# Metres per degree at Oakland's latitude, so the buffer distance can be given in metres while
# the geometry stays in lon/lat. Latitude is fixed; the outline spans 0.19 degrees, over which
# the longitude scale varies by well under 1%, which is noise next to a 10 m buffer.
LAT = 37.8
M_PER_DEG_LAT = 110_574.0
M_PER_DEG_LON = 111_320.0 * math.cos(math.radians(LAT))

# Sharp-reversal detector, shared with the verification so "no spurs" means the same thing
# before and after. A turn sharper than this is the ring doubling back on itself.
REVERSAL_DEG = 170.0


def sharp_reversals(ring: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Vertices where the ring turns through more than REVERSAL_DEG, i.e. spur tips."""
    pts = ring[:-1] if ring[0] == ring[-1] else ring
    n = len(pts)
    tips = []
    for k in range(n):
        p0, p1, p2 = pts[k - 1], pts[k], pts[(k + 1) % n]
        v1 = (p1[0] - p0[0], p1[1] - p0[1])
        v2 = (p2[0] - p1[0], p2[1] - p1[1])
        l1, l2 = math.hypot(*v1), math.hypot(*v2)
        if not (l1 and l2):
            continue
        cos = (v1[0] * v2[0] + v1[1] * v2[1]) / (l1 * l2)
        if math.degrees(math.acos(max(-1.0, min(1.0, cos)))) > REVERSAL_DEG:
            tips.append(p1)
    return tips


def area_km2(geom) -> float:
    """Planar area in km² using a local equirectangular scale. Good to well under 1% here."""
    return geom.area * M_PER_DEG_LAT * M_PER_DEG_LON / 1e6


def to_metre_scale(geom):
    """Stretch lon/lat so one unit ≈ one metre on both axes, so a buffer is isotropic."""
    from shapely.affinity import scale
    return scale(geom, xfact=M_PER_DEG_LON, yfact=M_PER_DEG_LAT, origin=(0, 0))


def from_metre_scale(geom):
    from shapely.affinity import scale
    return scale(geom, xfact=1 / M_PER_DEG_LON, yfact=1 / M_PER_DEG_LAT, origin=(0, 0))


def main() -> int:
    data = json.loads(NEIGHBOURHOODS.read_text(encoding="utf-8"))
    shapes = [shape(f["geometry"]).buffer(0) for f in data["features"]]  # buffer(0) repairs
    print(f"neighbourhood polygons: {len(shapes)}")

    raw = unary_union(shapes)
    raw_polys = list(raw.geoms) if isinstance(raw, MultiPolygon) else [raw]
    holes = [h for p in raw_polys for h in p.interiors]
    print(f"plain dissolve: {len(raw_polys)} polygon(s), {len(holes)} interior hole(s), "
          f"{sum(len(sharp_reversals(list(p.exterior.coords))) for p in raw_polys)} spur tip(s)")

    # Closing in metre space so the radius means the same thing north-south and east-west.
    metric = to_metre_scale(raw)
    closed = metric.buffer(CLOSE_M, join_style="mitre").buffer(-CLOSE_M, join_style="mitre")
    closed = from_metre_scale(closed)

    polys = list(closed.geoms) if isinstance(closed, MultiPolygon) else [closed]
    polys.sort(key=lambda p: p.area, reverse=True)
    stragglers = [p for p in polys[1:] if area_km2(p) > 0.001]
    if stragglers:
        print(f"ERROR: {len(stragglers)} polygon(s) still detached after closing: "
              f"{[round(area_km2(p), 3) for p in stragglers]} km2. Not writing.", file=sys.stderr)
        return 1

    # Keep the Piedmont hole, fill the rest. See docstring.
    piedmont_pt = Point(json.loads(PIEDMONT.read_text(encoding="utf-8"))
                        ["features"][0]["geometry"]["coordinates"][0][0])
    keep = [h for h in polys[0].interiors if Polygon(h).contains(piedmont_pt)]
    filled = [h for h in polys[0].interiors if not Polygon(h).contains(piedmont_pt)]
    if len(keep) != 1:
        print(f"ERROR: expected exactly one hole around Piedmont, found {len(keep)}. Not writing.",
              file=sys.stderr)
        return 1
    print(f"holes: kept Piedmont ({area_km2(Polygon(keep[0])):.2f} km2), filled {len(filled)}")
    for h in filled:
        hp = Polygon(h)
        if area_km2(hp) > 0.05:
            c = hp.centroid
            print(f"  note: filled a {area_km2(hp):.2f} km2 hole centred at "
                  f"({c.y:.4f}, {c.x:.4f}): Lake Merritt is expected here")

    outline = Polygon(polys[0].exterior, [keep[0]])
    coords = [(round(x, 7), round(y, 7)) for x, y in outline.exterior.coords]
    hole = [(round(x, 7), round(y, 7)) for x, y in outline.interiors[0].coords]

    # Rounding to 7 dp (~1 cm) can fold two nearly coincident vertices into a tiny bowtie, so
    # validity is checked on the rounded ring, which is what actually gets written.
    rounded = Polygon(coords, [hole])
    if not rounded.is_valid:
        fixed = make_valid(rounded)
        pieces = list(fixed.geoms) if hasattr(fixed, "geoms") else [fixed]
        pieces = sorted((g for g in pieces if isinstance(g, Polygon)), key=lambda g: g.area, reverse=True)
        rounded = pieces[0]
        coords = [(round(x, 7), round(y, 7)) for x, y in rounded.exterior.coords]
        hole = [(round(x, 7), round(y, 7)) for x, y in rounded.interiors[0].coords] if rounded.interiors else []
        print(f"note: rounded ring was invalid; repaired, {len(coords)} vertices")
    if not hole or not Polygon(coords, [hole]).is_valid:
        print("ERROR: outline invalid or Piedmont hole lost after repair. Not writing.", file=sys.stderr)
        return 1
    tips = sharp_reversals(coords) + sharp_reversals(hole)

    print(f"result: 1 polygon with Piedmont hole, {len(coords)} outer + {len(hole)} hole vertices, "
          f"{area_km2(outline):.1f} km2, {len(tips)} spur tip(s)")
    if tips:
        print(f"ERROR: spurs remain at {tips}. Not writing.", file=sys.stderr)
        return 1

    feature = {
        "type": "Feature",
        "properties": {
            "name": "Oakland",
            "description": "Land footprint of Oakland minus Piedmont: dissolve of "
                           "oakland_neighborhoods.geojson. Not the legal city limit, which "
                           "extends into the Bay.",
            "generated_by": "data_pipeline/scripts/build_oakland_boundary.py",
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "closing_radius_m": CLOSE_M,
        },
        "geometry": mapping(Polygon(coords, [hole])),
    }
    OUTPUT.write_text(
        json.dumps({"type": "FeatureCollection", "features": [feature]}, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"wrote {OUTPUT.relative_to(REPO)} ({OUTPUT.stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
