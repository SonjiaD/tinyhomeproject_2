# Archived polygon datasets

Superseded versions of `parking_polygons_latest.geojson`, kept for provenance.

| File | Spots | Notes |
|---|---|---|
| `parking_polygons_pre-2026-07-01_58988spots.geojson` | 58,988 | Predates the recorded run history in `data/runs/`. Generated before the hairpin self-overlap fix and the duplicate directional OSM edge fix, so its spot count is inflated relative to the corrected 46,996 → 46,970 lineage. |

**Tracked in git deliberately**, as an exception to the
`data/polygons/parking_polygons_2*.geojson` rule in `.gitignore`. That rule keeps routine
timestamped pipeline output out of the repo, but this file is not routine output: it is the
only surviving copy of the pre-bugfix dataset and cannot be regenerated, since the pipeline
now contains the fixes that changed it. It was previously tracked anyway, at
`frontend/public/parking_polygons.geojson`, where it was also being served to every visitor.
