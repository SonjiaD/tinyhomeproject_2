-- Exported verbatim from supabase_migrations.schema_migrations on 2026-09-13.
-- Applied to the live project as version 20260907054652 (handle_new_user_oauth_names).
-- Already applied there: this file exists so the schema can be rebuilt from the repo.

-- Make profile creation work for OAuth signups as well as email ones.
--
-- The email signup form put the name into raw_user_meta_data.full_name, so this function only
-- read that key. Google populates its own set of fields and normally supplies both `full_name`
-- and `name`, but relying on a single key means a provider that only sends `name` silently
-- creates every profile with a null full_name. Fall back through the likely keys instead.
--
-- search_path is pinned for the same reason as the other definer functions.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      ''
    )), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- The function is not meant to be reachable through the API; it only runs as a trigger.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
