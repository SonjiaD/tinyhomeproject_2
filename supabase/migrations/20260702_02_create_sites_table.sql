-- Exported verbatim from supabase_migrations.schema_migrations on 2026-09-13.
-- Applied to the live project as version 20260702062458 (create_sites_table).
-- Already applied there: this file exists so the schema can be rebuilt from the repo.

-- sites: one row per parking spot, synced from parking_polygons_latest.geojson
-- by data_pipeline/scripts/sync_sites_to_supabase.py. Public reference data.
create table public.sites (
  site_id                       text primary key,
  parent_id                     text,
  address                       text,
  lat                           double precision,
  lng                           double precision,
  neighborhood                  text,
  city                          text default 'Oakland',
  side                          text,
  spot_index                    integer,
  bearing_deg                   double precision,
  transit_dist                  double precision,
  water_infrastructure_dist     double precision,
  city_facility_dist            double precision,
  homeless_service_dist         double precision,
  water_fountain_dist           double precision,
  streams_oakland_dist          double precision,
  grocery_dist                  double precision,
  transit_nearest_lat           double precision,
  transit_nearest_lon           double precision,
  city_facility_nearest_lat     double precision,
  city_facility_nearest_lon     double precision,
  water_fountain_nearest_lat    double precision,
  water_fountain_nearest_lon    double precision,
  streams_oakland_nearest_lat   double precision,
  streams_oakland_nearest_lon   double precision,
  grocery_nearest_lat           double precision,
  grocery_nearest_lon           double precision,
  updated_at                    timestamptz default now()
);

-- Public reference data shown on the map: RLS on with a read-for-everyone policy.
-- Writes happen only via the sync script using the service_role key (bypasses RLS),
-- so no write policy is defined (users can never modify site data).
alter table public.sites enable row level security;

create policy "sites_public_read" on public.sites
  for select using (true);
