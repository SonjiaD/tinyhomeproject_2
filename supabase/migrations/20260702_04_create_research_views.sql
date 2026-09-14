-- Exported verbatim from supabase_migrations.schema_migrations on 2026-09-13.
-- Applied to the live project as version 20260702062604 (create_research_views).
-- Already applied there: this file exists so the schema can be rebuilt from the repo.

-- Master research table: one row per vote, fully expanded with the voter's
-- profile and the site's location/amenities. security_invoker so it honours
-- the underlying profiles RLS when read by the anon/authenticated roles;
-- the service_role export script and the SQL editor (postgres) still see all rows.
create view public.vote_research_view
with (security_invoker = on) as
select
  v.id            as vote_id,
  v.support,
  v.comment,
  v.created_at,
  v.updated_at,
  v.site_id,
  s.parent_id,
  s.address,
  s.neighborhood  as site_neighborhood,
  s.city          as site_city,
  s.lat,
  s.lng,
  s.side,
  s.transit_dist,
  s.water_infrastructure_dist,
  s.city_facility_dist,
  s.homeless_service_dist,
  s.water_fountain_dist,
  s.streams_oakland_dist,
  s.grocery_dist,
  v.user_id,
  p.full_name,
  p.email,
  p.occupation,
  p.age_range,
  p.household_type,
  p.income_range,
  p.goal,
  p.neighborhood  as voter_neighborhood,
  p.roles,
  p.ownership_model,
  p.ownership_other
from public.votes v
left join public.sites    s on s.site_id = v.site_id
left join public.profiles p on p.id      = v.user_id;

-- Pre-aggregated leaderboard: one row per site with tallies + who voted which way.
create view public.site_vote_summary
with (security_invoker = on) as
select
  s.site_id,
  s.address,
  s.neighborhood,
  s.city,
  s.lat,
  s.lng,
  s.transit_dist,
  s.city_facility_dist,
  s.grocery_dist,
  s.water_fountain_dist,
  s.streams_oakland_dist,
  s.water_infrastructure_dist,
  s.homeless_service_dist,
  count(v.*) filter (where v.support is true)  as support_count,
  count(v.*) filter (where v.support is false) as oppose_count,
  count(v.*)                                   as total_votes,
  array_remove(array_agg(v.user_id) filter (where v.support is true),  null) as supporter_user_ids,
  array_remove(array_agg(v.user_id) filter (where v.support is false), null) as opposer_user_ids
from public.sites s
left join public.votes v on v.site_id = s.site_id
group by
  s.site_id, s.address, s.neighborhood, s.city, s.lat, s.lng,
  s.transit_dist, s.city_facility_dist, s.grocery_dist,
  s.water_fountain_dist, s.streams_oakland_dist,
  s.water_infrastructure_dist, s.homeless_service_dist;
