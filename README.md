# 🏡 TinyHome-Oakland: Site Selection Tool

This is a geospatial decision support web app for identifying optimal locations to place Tiny Homes for unhoused populations in Oakland, California.

It allows users to assign priorities to different urban planning criteria using the Analytical Hierarchy Process (AHP), visualize the ranked locations on a map, and optionally submit their preferences for research purposes.

---
## Website Deployed
Check out our website below and try it out!
https://tinyhomeproject.netlify.app/

> This repository is what that site builds from. It replaced an earlier version that ran a
> Flask backend on Render; see [Deployment](#-deployment) below.

## 📦 Project Evolution

This tool was originally built using **Streamlit** for rapid prototyping, then rebuilt as a **Flask + React** full-stack app, and is now a **React + Supabase** app with no backend server of its own.

The Flask layer was removed because it had become a thin proxy in front of Supabase plus a file server for the 52 MB parking map. Running it on Render's free tier meant the instance slept after 15 minutes and the next visitor waited 30-60s for it to boot. The map is now a CDN asset and the database enforces access with Row Level Security, so there is nothing left to keep warm.

---

## 🛠 Tech Stack

### Phase 1: Streamlit Prototype
- Built using `Streamlit`, `Folium`, and `Pydeck`
- Served as a rapid MVP for collecting feedback

#### Past Repository:
https://github.com/SonjiaD/tinyhome-backend

### Phase 2: Full-stack Migration
Now rebuilt with a modern architecture:

#### 🖥️ Frontend
- **React + TypeScript**
- **TailwindCSS** for styling
- **Leaflet** for interactive mapping
- **Recharts** for displaying AHP weights

#### ⚙️ Data layer
- **Supabase** (PostgreSQL) accessed directly from the browser
- **Row Level Security** so each user can only read and write their own votes
- **Python pipeline** (`data_pipeline/`) for generating and syncing the spatial data

#### ☁️ Deployment
- **Frontend:** [Netlify](https://www.netlify.com/) — builds from `main`, no other deploy step
- **Database:** [Supabase](https://supabase.com/) (PostgreSQL)

---

## 🧪 Features

✅ Interactive AHP weight assignment  
✅ Realtime ranked site map using GeoJSON data  
✅ Bar chart of feature priorities  
✅ Save your personalized map + feedback to a database  
✅ View saved submissions (coming soon: Gallery tab)  

---


## 🚀 Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/SonjiaD/tinyhomeproject
cd tinyhomeproject
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173`. That is the only server you need — there is no backend to start.

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

Build settings come from [`netlify.toml`](netlify.toml) — base `frontend/`, `npm run build`,
publish `dist`, Node 20 — so they are version-controlled rather than set in the dashboard.

Three environment variables must be set in **Site configuration → Environment variables**
(see [`frontend/.env.example`](frontend/.env.example)):

| Variable | Notes |
|---|---|
| `VITE_SUPABASE_URL` | |
| `VITE_SUPABASE_ANON_KEY` | Public — it ships in the bundle. RLS is what restricts it. |
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
day. It needs two repository secrets — `SUPABASE_URL` and `SUPABASE_ANON_KEY` — under
**Settings → Secrets and variables → Actions**. It fails loudly on purpose, so a red run in the
Actions tab means the database is genuinely unreachable.

---


## 👩‍🔬 Research Use

Submissions are collected to support research by the Kalyan Lab at the University of British Columbia (UBC) in partnership with Neighborship, a nonprofit focused on housing justice.

