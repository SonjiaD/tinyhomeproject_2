-- Step 2 of 2: lock the database down so the browser can safely talk to it directly.
--
-- ⚠️ DO NOT APPLY until the new frontend is deployed and verified. Step 1
-- (20260830_01_add_public_views.sql) must already be applied.
--
-- CUTOVER ORDER
--   1. Apply 20260830_01_add_public_views.sql            (safe any time, purely additive)
--   2. Deploy the frontend that reads Supabase directly  (Netlify build from main)
--   3. Confirm voting works live — RLS is still off, so nothing can break yet
--   4. Apply THIS file
--   5. Re-confirm voting, then delete the Render service
--
-- BACKGROUND
-- The previous attempt at this (20260704_enable_rls_security.sql, deleted) enabled RLS with
-- *zero* policies. That denies anon and authenticated outright, which forces every request
-- through a server holding the service-role key — exactly what made Render mandatory, and
-- Render's free tier is what made every cold first visit wait 30-60s. It was never applied.
--
-- This takes the opposite approach: real policies, so the database itself enforces "you may
-- only touch your own votes" using auth.uid() from the caller's signed JWT. That is the same
-- rule require_user() enforced in backend/app.py, moved to where the data lives.
--
-- WHAT THIS FIXES
-- Right now votes, vote_events, suggestions and submissions have RLS OFF while anon holds
-- SELECT/INSERT/UPDATE/DELETE. The anon key ships inside the JS bundle, so anyone can read,
-- forge, or delete the entire vote dataset. That is the current state, not a hypothetical.

begin;

-- ---------------------------------------------------------------------------
-- 1. The audit trigger has to survive RLS.
-- ---------------------------------------------------------------------------
-- log_vote_event() is SECURITY INVOKER today, so its INSERT into vote_events runs as the
-- calling role. The moment RLS is enabled on vote_events with no policies, that INSERT is
-- denied and EVERY vote write fails. SECURITY DEFINER lets the audit log stay completely
-- unreachable from the browser while the trigger keeps writing to it.
-- search_path is pinned: a SECURITY DEFINER function without one is hijackable.
create or replace function public.log_vote_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.vote_events(vote_id, site_id, user_id, action, support, comment)
    values (new.id, new.site_id, new.user_id, 'cast', new.support, new.comment);
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into public.vote_events(vote_id, site_id, user_id, action, support, comment)
    values (new.id, new.site_id, new.user_id, 'changed', new.support, new.comment);
    return new;
  elsif (tg_op = 'DELETE') then
    insert into public.vote_events(vote_id, site_id, user_id, action, support, comment)
    values (old.id, old.site_id, old.user_id, 'retracted', old.support, old.comment);
    return old;
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. votes — own-row access only.
-- ---------------------------------------------------------------------------
alter table public.votes enable row level security;

revoke all on public.votes from anon;
grant select, insert, update, delete on public.votes to authenticated;

-- auth.uid() is wrapped in a scalar subquery so Postgres evaluates it once per statement
-- instead of once per row; one user here already holds over 10,000 vote rows.
drop policy if exists votes_select_own on public.votes;
create policy votes_select_own on public.votes
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists votes_insert_own on public.votes;
create policy votes_insert_own on public.votes
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists votes_update_own on public.votes;
create policy votes_update_own on public.votes
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists votes_delete_own on public.votes;
create policy votes_delete_own on public.votes
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Input limits app.py used to apply in Python (it truncated comments to 500 chars).
alter table public.votes drop constraint if exists votes_comment_len;
alter table public.votes
  add constraint votes_comment_len
  check (comment is null or char_length(comment) <= 500);

-- Deliberately permissive: pipeline ids look like "296553310_L_3" but manually added spots
-- use a name prefix ("mandela_001_L_0"). This rejects junk and oversized values without
-- encoding a format the pipeline is free to change. Verified: 0 existing rows violate it.
--
-- Hyphens are allowed because add_manual_points.py's id_prefix is a hand-written slug
-- (TARGET_STREETS), and the natural next entry after "mandela" is something like "san-pablo".
-- A prefix this rejected would still sync into sites and render on the map, but every vote on
-- that street would fail with nothing in the UI to explain why — so the charset is kept wider
-- than today's data strictly requires.
alter table public.votes drop constraint if exists votes_site_id_shape;
alter table public.votes
  add constraint votes_site_id_shape
  check (site_id ~ '^[A-Za-z0-9_-]{1,64}$');

-- NO foreign key from votes.site_id to sites.site_id, on purpose.
-- sync_sites_to_supabase.py prunes sites absent from a regenerated geojson, and spot ids
-- shift between pipeline reruns. ON DELETE CASCADE would therefore silently destroy research
-- data on a routine rerun, and ON DELETE RESTRICT would break the prune. Tolerating orphaned
-- votes is the intended behaviour: a vote records that someone expressed a preference, and
-- that should outlive a regeneration of the site geometry.

-- ---------------------------------------------------------------------------
-- 3. vote_events — append-only audit log, invisible to the browser.
-- ---------------------------------------------------------------------------
-- Written only by the SECURITY DEFINER trigger above, read only by the service role, which
-- is what export_research_data.py uses. No policies, so both API roles are denied entirely.
alter table public.vote_events enable row level security;
revoke all on public.vote_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. suggestions — insert-only for logged-in users, readable only through the view.
-- ---------------------------------------------------------------------------
-- /suggest is already wrapped in <AuthGuard>, so requiring auth here only makes the database
-- enforce what the UI already required. It also closes the anonymous write surface that the
-- backend's per-IP rate limiter was the sole defence for — and that limiter has no PostgREST
-- equivalent, so removing the anonymous path is what replaces it.
alter table public.suggestions enable row level security;
revoke all on public.suggestions from anon, authenticated;
grant insert on public.suggestions to authenticated;

drop policy if exists suggestions_insert_authenticated on public.suggestions;
create policy suggestions_insert_authenticated on public.suggestions
  for insert to authenticated
  with check (true);

-- Length caps mirror the truncation app.py applied; the bbox keeps pins in the study area.
alter table public.suggestions drop constraint if exists suggestions_field_lengths;
alter table public.suggestions
  add constraint suggestions_field_lengths
  check (
    char_length(coalesce(reason, ''))     <= 500 and
    char_length(coalesce(name, ''))       <= 200 and
    char_length(coalesce(occupation, '')) <= 200
  );

alter table public.suggestions drop constraint if exists suggestions_bbox;
alter table public.suggestions
  add constraint suggestions_bbox
  check (lat between 37.5 and 38.1 and lng between -122.5 and -122.0);

-- ---------------------------------------------------------------------------
-- 5. submissions — dead since the AHP/WSM removal. Locked, not dropped.
-- ---------------------------------------------------------------------------
alter table public.submissions enable row level security;
revoke all on public.submissions from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Research views — service role only.
-- ---------------------------------------------------------------------------
-- Both remain in use by export_research_data.py, which authenticates as the service role and
-- is unaffected by these revokes. vote_research_view joins profiles, and site_vote_summary
-- exposes supporter/opposer user-id arrays; neither belongs in a browser.
revoke all on public.vote_research_view from anon, authenticated;
revoke all on public.site_vote_summary  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. Defence in depth on the already-protected tables.
-- ---------------------------------------------------------------------------
-- sites has a public-read policy and profiles has own-row policies, so RLS already blocks
-- these. Dropping the grants means a future policy change cannot silently widen them.
revoke insert, update, delete, truncate on public.sites    from anon, authenticated;
revoke delete, truncate                 on public.profiles from anon, authenticated;

commit;
