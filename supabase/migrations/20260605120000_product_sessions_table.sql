-- Optional server-side active product audit (client uses sessionStorage primary).

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
