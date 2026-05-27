-- PostgREST upsert(on_conflict=auth_user_id,desk_role) needs a non-partial UNIQUE constraint.
-- Partial index marketplace_profiles_auth_user_role_uidx is not enough.

alter table public.marketplace_profiles
  drop constraint if exists marketplace_profiles_auth_user_id_key;

drop index if exists public.marketplace_profiles_auth_user_role_uidx;

update public.marketplace_profiles
set desk_role = 'buyer'
where desk_role is null;

alter table public.marketplace_profiles
  drop constraint if exists marketplace_profiles_auth_user_desk_role_key;

alter table public.marketplace_profiles
  add constraint marketplace_profiles_auth_user_desk_role_key
  unique (auth_user_id, desk_role);
