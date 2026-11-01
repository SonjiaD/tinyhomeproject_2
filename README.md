# 🏡 TinyHome-Oakland: Community Siting Map

A community mapping site where Oakland residents vote on which street parking spaces could host a tiny home. It maps **~47,000 legal-size parking spaces** across Oakland and collects votes and comments for research by UBC's Kalyan Lab and Neighborship.

**Live site:** https://tinyhomeproject.netlify.app/

> This repository is what the live site builds from. It replaced an earlier version that ran a
> Flask backend on Render ([tinyhomeproject](https://github.com/SonjiaD/tinyhomeproject)); see
> [Project History](#-project-history).

---

## 🧪 Features

- **Interactive map** of ~47,000 parking spaces, each 30 ft x 10 ft (room for one tiny home)
- **Vote** support or oppose on any space, with optional notes shown to everyone without names
- **Selection tools:** single click, paint brush, polygon draw, neighborhood quick-vote, and batch voting
- **Space details:** distance to transit, parks, grocery stores, water fountains and streams, plus a Street View preview
- **Suggest a location** that isn't on the map yet
- **Google sign-in**, a short onboarding survey, and privacy and terms pages

---

## 🗺️ How the Map Data Is Built

The `data_pipeline/` scripts turn raw parking listings into individual, legally sized spaces:

1. **Scrape:** a headless Playwright browser sweeps a ~3,100-tile grid over Oakland on SpotAngels, saving a checkpoint every 100 tiles.
2. **Merge + dedup:** combines the scrape with Oakland open data and collapses near-duplicates within 8 m (8,967 → 7,860 locations).
3. **Generate spaces:** snaps each location to its OpenStreetMap street and packs 30 ft x 10 ft rectangles along the curb, with a 20 ft setback at intersections (California daylighting law, AB 413) and overlap checks for curved and two-way streets (**46,970 spaces**).
4. **Proximity:** computes each space's distance to transit, parks, grocery stores, water fountains and streams from OpenStreetMap.
5. **Publish:** syncs spaces to Supabase and exports the map as a bundled frontend asset.

Each step writes a run manifest with counts to `data/runs/`.

---

## 🛠 Tech Stack

- **Frontend:** React + TypeScript (Vite), Tailwind CSS, Leaflet
- **Data:** Supabase (PostgreSQL) accessed directly from the browser, with Row Level Security and Google sign-in through Supabase Auth
- **Pipeline:** Python, Playwright, GeoPandas, OSMnx, Shapely
- **Hosting:** Netlify (frontend), Supabase (database), GitHub Actions (keepalive)

---

## 📦 Project History

1. **Streamlit prototype** (Streamlit, Folium, Pydeck), a rapid MVP for collecting feedback. Past repository: https://github.com/SonjiaD/tinyhome-backend
2. **Flask + React ranking tool:** users weighted criteria with the Analytical Hierarchy Process (AHP) or linear weighting to rank ~8,900 candidate sites and surface the top 500. Presented at MURC 2026. Repository: https://github.com/SonjiaD/tinyhomeproject
3. **Community voting map (current):** replaced the ranking with resident voting on individual parking spaces, rebuilt as a React + Supabase app with no backend server of its own.

**Why the Flask backend was removed:** it had become a thin proxy in front of Supabase plus a file server for the 52 MB parking map. Running it on Render's free tier meant the instance slept after 15 minutes and the next visitor waited 30-60s for it to boot. The map is now a CDN asset and the database enforces access with Row Level Security, so there is nothing left to keep warm.

---

## 🚀 Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/SonjiaD/tinyhomeproject_2
cd tinyhomeproject_2
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173`. That is the only server you need; there is no backend to start.

> Create `frontend/.env.local` with your Supabase project credentials:
> ```ini
> VITE_SUPABASE_URL=your-supabase-project-url
> VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
> VITE_GOOGLE_SV_KEY=your-google-street-view-key
> ```
> The anon key is safe to ship in the bundle: Row Level Security decides what it can actually
> do. The same variables are configured in the Netlify dashboard for production.

### 3. Map data

The parking map ships as a bundle asset, generated from the pipeline output:

```bash
python data_pipeline/scripts/export_polygons_for_web.py
```

This writes `frontend/src/assets/parking_polygons.json` and `frontend/src/lib/parkingMeta.ts`.
Both are committed, so you only need to rerun it after regenerating the polygons.

> **Admin scripts only:** `sync_sites_to_supabase.py` and `export_research_data.py` need a
> service-role key in `.env` at the repo root. That key bypasses Row Level Security, so it
> must never reach the frontend.
> ```ini
> SUPABASE_URL=your-supabase-project-url
> SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret
> ```

---

## 🚀 Deployment

There is no server to deploy. Netlify builds the frontend from `main`, and the browser talks to
Supabase directly.

### Netlify

Build settings come from [`netlify.toml`](netlify.toml) (base `frontend/`, `npm run build`,
publish `dist`, Node 20), so they are version-controlled rather than set in the dashboard.

Three environment variables must be set in **Site configuration → Environment variables**
(see [`frontend/.env.example`](frontend/.env.example)):

| Variable | Notes |
|---|---|
| `VITE_SUPABASE_URL` | |
| `VITE_SUPABASE_ANON_KEY` | Public: it ships in the bundle. RLS is what restricts it. |
| `VITE_GOOGLE_SV_KEY` | Street View thumbnails only |

`frontend/public/_headers` marks `/assets/*` immutable. Vite content-hashes those filenames, so
the ~2.7 MB (gzipped) parking map downloads once and is free on every repeat visit.

### Database

Migrations in `supabase/migrations/` are applied through the Supabase SQL editor. Row Level
Security is what makes direct browser access safe: each user can read and write only their own
votes, aggregate tallies are exposed through views, and the service-role key stays on your
machine for the `data_pipeline/` admin scripts.

### Keepalive

Supabase pauses a free project after ~7 days of inactivity, so
[`.github/workflows/keepalive.yml`](.github/workflows/keepalive.yml) touches the REST API 10x a
day. It needs two repository secrets, `SUPABASE_URL` and `SUPABASE_ANON_KEY`, under
**Settings → Secrets and variables → Actions**. It fails loudly on purpose, so a red run in the
Actions tab means the database is genuinely unreachable.

---

## 👩‍🔬 Research Use

Votes and suggestions are collected to support research by the Kalyan Lab at the University of British Columbia (UBC) in partnership with Neighborship, a nonprofit focused on housing justice.
