-- Attribute suggestions to an account, and cap how fast one account can file them.
--
-- Found during a security review. The suggestions table had three compounding problems:
--
--   1. No user_id column at all, so a suggestion could not be traced to anyone.
--   2. suggestions_insert_authenticated used WITH CHECK (true) — any signed-in account could
--      insert anything the CHECK constraints allowed.
--   3. No rate limit anywhere.
--
-- Together those meant one account could POST unlimited pins straight at PostgREST, bypassing
-- the frontend entirely, and every one of them would render on the public map through
-- suggestions_public. With no user_id there was then no way to attribute the spam, rate limit
-- the account, or clean it up in bulk. The bbox and length CHECKs bounded the *shape* of each
-- row but said nothing about volume.
--
-- This needs no coordinated frontend deploy. submitSuggestion() never sends user_id, so the
-- column default fills it in and the tightened policy passes unchanged.

begin;

-- DEFAULT auth.uid() is what makes this a one-phase change. PostgREST only sends the columns
-- present in the payload, so user_id is absent and the default applies; an explicit NULL would
-- override a default, but the client never sends one.
alter table public.suggestions
  add column if not exists user_id uuid
  references auth.users(id) on delete cascade
  default auth.uid();

-- Serves the rate-limit lookup below, and makes "remove everything from this account" cheap.
create index if not exists suggestions_user_id_idx on public.suggestions (user_id);

-- Was WITH CHECK (true). Now a row must be stamped with the caller's own id, so one account
-- cannot file suggestions attributed to another.
drop policy if exists suggestions_insert_authenticated on public.suggestions;
create policy suggestions_insert_authenticated on public.suggestions
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- Volume cap. Enforced in the database rather than the client because the client is not in the
-- path at all for anyone posting directly to the API, which is exactly the case that matters.
create or replace function public.enforce_suggestion_rate_limit()
returns trigger
language plpgsql
security definer            -- suggestions has no SELECT policy, so an invoker-rights function
set search_path = public    -- would count 0 rows and the limit would never fire
as $$
declare
  recent integer;
begin
  -- auth.uid() is null for the service role, i.e. the data pipeline and admin tooling. Those
  -- are not the threat here and must not be throttled.
  if auth.uid() is null then
    return new;
  end if;

  select count(*) into recent
  from public.suggestions
  where user_id = new.user_id
    and created_at > now() - interval '1 hour';

  -- Generous for real use — a person suggesting spots files a handful — while turning
  -- scripted mass submission into something that dies after twenty rows.
  if recent >= 20 then
    raise exception 'Too many suggestions in the last hour. Please try again later.'
      using errcode = '54000';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_suggestion_rate_limit() from public, anon, authenticated;

drop trigger if exists suggestions_rate_limit on public.suggestions;
create trigger suggestions_rate_limit
  before insert on public.suggestions
  for each row execute function public.enforce_suggestion_rate_limit();

commit;
