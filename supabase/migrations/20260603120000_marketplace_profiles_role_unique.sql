-- PostgREST upsert uses ON CONFLICT (auth_user_id, desk_role).
-- product_isolation added UNIQUE (auth_user_id) only; marketplace core added a partial unique index.
-- Replace with an explicit unique constraint on (auth_user_id, desk_role).

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
