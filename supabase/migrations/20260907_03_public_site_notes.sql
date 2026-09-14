-- Make vote notes readable by everyone else using the map, without names attached.
--
-- Until now votes.comment was write-only in practice: RLS restricts votes to own-rows and no view
-- exposed the column, so the app asked people to explain their reasoning and then filed that
-- reasoning where nobody could read it. This view is what makes the notes worth collecting.
--
-- Purely additive. It creates one view and grants SELECT on it; nothing existing changes. The
-- frontend must ship the reading UI separately, and the privacy policy has to be corrected in the
-- same release — it currently promises that notes are private, which this makes untrue.

begin;

-- security_invoker = off, matching site_vote_counts and vote_totals in 20260830_01.
--
-- This is not stylistic. With invoker semantics the votes_select_own policy would apply to the
-- view's own scan, so every visitor would see only their own note while the UI presented it as
-- the whole community's. Running as the view owner is what makes a shared list possible at all.
drop view if exists public.site_vote_notes;
create view public.site_vote_notes with (security_invoker = off) as
select
  site_id,
  support,
  comment,
  -- Truncated to the month on purpose. A note plus an exact timestamp is the realistic way an
  -- anonymous note gets tied back to a person by someone who knows roughly when their neighbour
  -- voted. The cost is that notes within one month have no defined order between them, which is
  -- an acceptable trade at the handful-of-notes-per-site this sees.
  date_trunc('month', updated_at) as posted_month
from public.votes
where comment is not null
  and btrim(comment) <> ''
  -- Excludes the caller's own note, so it cannot appear twice: once in their editor as theirs,
  -- and again in the anonymous list. Doing it here rather than in the client also means user_id
  -- never has to be projected at all.
  --
  -- The coalesce is load-bearing. For a signed-out visitor auth.uid() is NULL and
  -- `user_id <> NULL` evaluates to NULL, not true — a bare comparison would silently return zero
  -- rows to exactly the audience this view exists to serve, while looking correct when signed in.
  and coalesce(user_id <> auth.uid(), true);

-- No user_id and no id in the projection above. Identity never leaves the database, rather than
-- being sent to the browser and hidden there.
grant select on public.site_vote_notes to anon, authenticated;

-- The per-site lookup is served by votes_site_id_idx, created in 20260830_01.

commit;
