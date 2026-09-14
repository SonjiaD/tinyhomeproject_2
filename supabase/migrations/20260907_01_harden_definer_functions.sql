-- Exported verbatim from supabase_migrations.schema_migrations on 2026-09-13.
-- Applied to the live project as version 20260907051830 (harden_definer_functions),
-- directly after enable_rls and before public_site_notes.
-- Already applied there: this file exists so the schema can be rebuilt from the repo.

-- Follow-up hardening flagged by the Supabase security advisors after enabling RLS.

-- 1. Neither trigger function should be callable through the REST API. PostgREST already
-- refuses to expose them (they return `trigger`, so they never enter the schema cache), but
-- the EXECUTE grant is unnecessary and the advisor is right to flag a SECURITY DEFINER
-- function reachable by anon. Revoking EXECUTE does not stop a trigger firing: Postgres
-- checks that privilege when the trigger is created, not each time it runs.
revoke execute on function public.log_vote_event() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 2. set_updated_at had a mutable search_path. It is SECURITY INVOKER so the risk is lower
-- than for a definer function, but pinning it is free and removes the warning.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
