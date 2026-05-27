-- Unified platform identity + app membership (source of truth for app access)

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.platform_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  preferred_app_slug text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint platform_users_preferred_app_slug_check check (
    preferred_app_slug is null
    or preferred_app_slug in ('ownerr_os', 'marketplace', 'unemployed')
  )
);

create index if not exists platform_users_auth_user_id_idx on public.platform_users (auth_user_id);
create index if not exists platform_users_preferred_app_slug_idx on public.platform_users (preferred_app_slug);
create index if not exists platform_users_created_at_idx on public.platform_users (created_at);

drop trigger if exists platform_users_set_updated_at on public.platform_users;
create trigger platform_users_set_updated_at
  before update on public.platform_users
  for each row
  execute function public.set_updated_at();

create table if not exists public.user_app_access (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  app_slug text not null,
  role text not null default 'member',
  status text not null default 'active',
  profile_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_app_access_auth_user_id_app_slug_key unique (auth_user_id, app_slug),
  constraint user_app_access_app_slug_check check (
    app_slug in ('ownerr_os', 'marketplace', 'unemployed')
  ),
  constraint user_app_access_status_check check (
    status in ('active', 'invited', 'suspended')
  )
);

create index if not exists user_app_access_auth_user_id_idx on public.user_app_access (auth_user_id);
create index if not exists user_app_access_app_slug_idx on public.user_app_access (app_slug);
create index if not exists user_app_access_status_idx on public.user_app_access (status);
create index if not exists user_app_access_profile_id_idx on public.user_app_access (profile_id);
create index if not exists user_app_access_auth_user_status_idx on public.user_app_access (auth_user_id, status);
create index if not exists user_app_access_created_at_idx on public.user_app_access (created_at);

drop trigger if exists user_app_access_set_updated_at on public.user_app_access;
create trigger user_app_access_set_updated_at
  before update on public.user_app_access
  for each row
  execute function public.set_updated_at();

create table if not exists public.ownerr_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ownerr_profiles_auth_user_id_idx on public.ownerr_profiles (auth_user_id);
create index if not exists ownerr_profiles_created_at_idx on public.ownerr_profiles (created_at);

drop trigger if exists ownerr_profiles_set_updated_at on public.ownerr_profiles;
create trigger ownerr_profiles_set_updated_at
  before update on public.ownerr_profiles
  for each row
  execute function public.set_updated_at();

create table if not exists public.marketplace_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  desk_role text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint marketplace_profiles_desk_role_check check (
    desk_role is null
    or desk_role in ('buyer', 'seller', 'founder')
  )
);

create index if not exists marketplace_profiles_auth_user_id_idx on public.marketplace_profiles (auth_user_id);
create index if not exists marketplace_profiles_desk_role_idx on public.marketplace_profiles (desk_role);
create index if not exists marketplace_profiles_created_at_idx on public.marketplace_profiles (created_at);

drop trigger if exists marketplace_profiles_set_updated_at on public.marketplace_profiles;
create trigger marketplace_profiles_set_updated_at
  before update on public.marketplace_profiles
  for each row
  execute function public.set_updated_at();

create table if not exists public.unemployed_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists unemployed_profiles_auth_user_id_idx on public.unemployed_profiles (auth_user_id);
create index if not exists unemployed_profiles_created_at_idx on public.unemployed_profiles (created_at);

drop trigger if exists unemployed_profiles_set_updated_at on public.unemployed_profiles;
create trigger unemployed_profiles_set_updated_at
  before update on public.unemployed_profiles
  for each row
  execute function public.set_updated_at();

alter table public.platform_users enable row level security;
alter table public.user_app_access enable row level security;
alter table public.ownerr_profiles enable row level security;
alter table public.marketplace_profiles enable row level security;
alter table public.unemployed_profiles enable row level security;

drop policy if exists "platform_users_select_own" on public.platform_users;
create policy "platform_users_select_own"
  on public.platform_users for select to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "platform_users_insert_own" on public.platform_users;
create policy "platform_users_insert_own"
  on public.platform_users for insert to authenticated
  with check (auth_user_id = auth.uid());

drop policy if exists "platform_users_update_own" on public.platform_users;
create policy "platform_users_update_own"
  on public.platform_users for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

drop policy if exists "user_app_access_select_own" on public.user_app_access;
create policy "user_app_access_select_own"
  on public.user_app_access for select to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "ownerr_profiles_select_own" on public.ownerr_profiles;
create policy "ownerr_profiles_select_own"
  on public.ownerr_profiles for select to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "ownerr_profiles_insert_own" on public.ownerr_profiles;
create policy "ownerr_profiles_insert_own"
  on public.ownerr_profiles for insert to authenticated
  with check (auth_user_id = auth.uid());

drop policy if exists "ownerr_profiles_update_own" on public.ownerr_profiles;
create policy "ownerr_profiles_update_own"
  on public.ownerr_profiles for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

drop policy if exists "marketplace_profiles_select_own" on public.marketplace_profiles;
create policy "marketplace_profiles_select_own"
  on public.marketplace_profiles for select to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "marketplace_profiles_insert_own" on public.marketplace_profiles;
create policy "marketplace_profiles_insert_own"
  on public.marketplace_profiles for insert to authenticated
  with check (auth_user_id = auth.uid());

drop policy if exists "marketplace_profiles_update_own" on public.marketplace_profiles;
create policy "marketplace_profiles_update_own"
  on public.marketplace_profiles for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

drop policy if exists "unemployed_profiles_select_own" on public.unemployed_profiles;
create policy "unemployed_profiles_select_own"
  on public.unemployed_profiles for select to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "unemployed_profiles_insert_own" on public.unemployed_profiles;
create policy "unemployed_profiles_insert_own"
  on public.unemployed_profiles for insert to authenticated
  with check (auth_user_id = auth.uid());

drop policy if exists "unemployed_profiles_update_own" on public.unemployed_profiles;
create policy "unemployed_profiles_update_own"
  on public.unemployed_profiles for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());
