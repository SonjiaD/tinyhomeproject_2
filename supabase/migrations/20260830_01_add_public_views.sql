-- Step 1 of 2: add the read-only views the browser needs. Purely additive.
--
-- This creates three new views and grants SELECT on them. It changes nothing that already
-- exists, so it is safe to apply at any time — the Flask backend (if still running) and the
-- currently deployed frontend are both unaffected, since neither references these names.
--
-- It has to land BEFORE the new frontend deploys. The frontend reads its tallies from
-- site_vote_counts and vote_totals, so deploying first would leave the map showing zero
-- votes everywhere until this ran.
--
-- Step 2 (20260830_02_enable_rls.sql) does the actual lockdown and must NOT run until the
-- new frontend is deployed and verified.
--
-- These views expose no data that anon cannot already reach: RLS is still off on votes and
-- suggestions at this point, so the anon key can read those tables directly. After step 2
-- they become the *only* way to read aggregate vote data, which is the point.

begin;

-- security_invoker = off is the default, but it is stated explicitly here because the two
-- pre-existing views (vote_research_view, site_vote_summary) set it ON. Once step 2 restricts
-- votes to own-rows, an invoker view would show each visitor only their own votes as though
-- it were the global tally. Running as the view owner is what makes a public count possible.

-- Replaces GET /api/votes.
-- The old site_vote_summary LEFT JOINs all 46,970 sites and exposes supporter_user_ids /
-- opposer_user_ids. This groups from votes alone, so it returns only sites that have actually
-- been voted on and carries no per-user identity.
drop view if exists public.site_vote_counts;
create view public.site_vote_counts with (security_invoker = off) as
select
  site_id,
  count(*) filter (where support)     as support_count,
  count(*) filter (where not support) as oppose_count,
  count(*)                            as total_votes
from public.votes
group by site_id;

-- Replaces GET /api/votes/summary, which the progress header polls every 30 seconds.
drop view if exists public.vote_totals;
create view public.vote_totals with (security_invoker = off) as
select count(*) filter (where support) as total_yes
from public.votes;

-- Replaces GET /api/suggestions, reproducing that endpoint's deliberate omission of name and
-- occupation — submitter PII the public map never needed.
drop view if exists public.suggestions_public;
create view public.suggestions_public with (security_invoker = off) as
select id, lat, lng, reason, created_at
from public.suggestions;

grant select on public.site_vote_counts   to anon, authenticated;
grant select on public.vote_totals        to anon, authenticated;
grant select on public.suggestions_public to anon, authenticated;

-- site_vote_counts scans votes and groups by site_id on every map load; the per-user index
-- serves the hydration query in step 2. Both are safe to create now.
create index if not exists votes_site_id_idx on public.votes (site_id);
create index if not exists votes_user_id_idx on public.votes (user_id);

commit;
