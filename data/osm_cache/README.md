# OSM source snapshot

Raw HTTP responses captured by `generate_parking_polygons.py` (osmnx). Kept in version
control deliberately — this is the exact upstream input behind the current dataset.

| File | Source | Contents |
|---|---|---|
| `e0df1bdde929013c828623788907661f8f17482f.json` | Overpass API 0.7.62.11 | Oakland street network, `timestamp_osm_base` **2026-05-06T15:22:50Z** |
| `70cc0fa5839a53dd9e5f7c7f0407a94e9b62cb9d.json` | Nominatim | Oakland administrative boundary geocode |

**Why this is not disposable.** OpenStreetMap is continuously edited. Re-running the
pipeline downloads *today's* OSM, so it would no longer reproduce the 46,970-spot dataset
recorded in `data/runs/2026-07-01_19-24_generate_parking_polygons/manifest.yaml`
(22,144 street edges downloaded). These files are what make that run reproducible.

Previously at `backend/cache/`, purely because that was the working directory when the
pipeline ran. Moved here when the backend was removed.
