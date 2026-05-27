-- Product isolation: profile uniqueness, preferences, sessions, indexes

-- platform_users email uniqueness (case-insensitive via lower)
create unique index if not exists platform_users_email_lower_unique_idx
  on public.platform_users (lower(email));

create index if not exists platform_users_email_idx on public.platform_users (email);

-- ownerr_profiles: one row per auth user
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'ownerr_profiles_auth_user_id_key'
      and conrelid = 'public.ownerr_profiles'::regclass
  ) then
    alter table public.ownerr_profiles
      add constraint ownerr_profiles_auth_user_id_key unique (auth_user_id);
  end if;
end $$;

-- marketplace_profiles: one row per auth user
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'marketplace_profiles_auth_user_id_key'
      and conrelid = 'public.marketplace_profiles'::regclass
  ) then
    alter table public.marketplace_profiles
      add constraint marketplace_profiles_auth_user_id_key unique (auth_user_id);
  end if;
end $$;

-- unemployed_profiles: one row per auth user
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'unemployed_profiles_auth_user_id_key'
      and conrelid = 'public.unemployed_profiles'::regclass
  ) then
    alter table public.unemployed_profiles
      add constraint unemployed_profiles_auth_user_id_key unique (auth_user_id);
  end if;
end $$;

create index if not exists unemployed_profiles_job_status_idx
  on public.unemployed_profiles ((metadata->>'job_status'));

-- user_preferences
create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_preferences_auth_user_id_idx on public.user_preferences (auth_user_id);

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row
  execute function public.set_updated_at();

alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences_select_own" on public.user_preferences;
create policy "user_preferences_select_own"
  on public.user_preferences for select to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "user_preferences_insert_own" on public.user_preferences;
create policy "user_preferences_insert_own"
  on public.user_preferences for insert to authenticated
  with check (auth_user_id = auth.uid());

drop policy if exists "user_preferences_update_own" on public.user_preferences;
create policy "user_preferences_update_own"
  on public.user_preferences for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- product_sessions (active product lock in DB; client still uses sessionStorage)
create table if not exists public.product_sessions (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  product text not null check (product in ('ownerr_os', 'marketplace', 'unemployed')),
  last_active_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists product_sessions_product_idx on public.product_sessions (product);
create index if not exists product_sessions_last_active_at_idx on public.product_sessions (last_active_at);

drop trigger if exists product_sessions_set_updated_at on public.product_sessions;
create trigger product_sessions_set_updated_at
  before update on public.product_sessions
  for each row
  execute function public.set_updated_at();

alter table public.product_sessions enable row level security;

drop policy if exists "product_sessions_select_own" on public.product_sessions;
create policy "product_sessions_select_own"
  on public.product_sessions for select to authenticated
  using (auth_user_id = auth.uid());

drop policy if exists "product_sessions_insert_own" on public.product_sessions;
create policy "product_sessions_insert_own"
  on public.product_sessions for insert to authenticated
  with check (auth_user_id = auth.uid());

drop policy if exists "product_sessions_update_own" on public.product_sessions;
create policy "product_sessions_update_own"
  on public.product_sessions for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());
