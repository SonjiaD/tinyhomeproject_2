-- Exported verbatim from supabase_migrations.schema_migrations on 2026-09-13.
-- Applied to the live project as version 20260702062532 (recreate_votes_and_vote_events).
-- Already applied there: this file exists so the schema can be rebuilt from the repo.

-- Old votes table (94k anonymous-allowed rows) is intentionally discarded.
drop table if exists public.votes cascade;

-- votes: one current row per (user, site). Login now required (user_id NOT NULL).
create table public.votes (
  id         uuid primary key default gen_random_uuid(),
  site_id    text not null,
  user_id    uuid not null references auth.users(id) on delete cascade,
  support    boolean not null,
  comment    text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, site_id)
);

create index votes_site_id_idx on public.votes(site_id);
create index votes_user_id_idx on public.votes(user_id);

create trigger votes_set_updated_at
  before update on public.votes
  for each row execute function public.set_updated_at();

-- vote_events: append-only history of every cast / changed / retracted action.
-- No FK to votes so retracted (deleted) votes keep their history.
create table public.vote_events (
  id        uuid primary key default gen_random_uuid(),
  vote_id   uuid,
  site_id   text,
  user_id   uuid,
  action    text not null,   -- 'cast' | 'changed' | 'retracted'
  support   boolean,
  comment   text,
  event_at  timestamptz default now()
);

create index vote_events_site_id_idx on public.vote_events(site_id);
create index vote_events_user_id_idx on public.vote_events(user_id);

create or replace function public.log_vote_event()
returns trigger
language plpgsql
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

create trigger votes_log_event
  after insert or update or delete on public.votes
  for each row execute function public.log_vote_event();
