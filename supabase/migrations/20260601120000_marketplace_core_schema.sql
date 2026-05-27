-- Marketplace core: startups, deals, messaging, multi-role profiles

-- ---------------------------------------------------------------------------
-- marketplace_profiles: buyer + seller rows per auth user
-- ---------------------------------------------------------------------------
alter table public.marketplace_profiles
  drop constraint if exists marketplace_profiles_auth_user_id_key;

alter table public.marketplace_profiles
  drop constraint if exists marketplace_profiles_desk_role_check;

alter table public.marketplace_profiles
  add column if not exists status text not null default 'active';

alter table public.marketplace_profiles
  add constraint marketplace_profiles_desk_role_check
  check (
    desk_role is null
    or desk_role in ('buyer', 'seller', 'founder')
  );

alter table public.marketplace_profiles
  add constraint marketplace_profiles_status_check
  check (status in ('active', 'suspended', 'pending'));

create unique index if not exists marketplace_profiles_auth_user_role_uidx
  on public.marketplace_profiles (auth_user_id, desk_role)
  where desk_role is not null;

-- ---------------------------------------------------------------------------
-- startups
-- ---------------------------------------------------------------------------
create table if not exists public.startups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  founder_user_id uuid references auth.users (id) on delete set null,
  founder_handle text,
  title text not null,
  tagline text,
  description text not null default '',
  industry text,
  business_model text,
  stage text,
  country text,
  city text,
  asking_price numeric,
  currency text not null default 'USD',
  annual_revenue numeric,
  profit numeric,
  growth_rate numeric,
  team_size integer,
  founded_year integer,
  verified boolean not null default false,
  visibility text not null default 'public',
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint startups_visibility_check check (visibility in ('public', 'private', 'unlisted')),
  constraint startups_status_check check (status in ('draft', 'published', 'archived', 'sold'))
);

create index if not exists startups_status_idx on public.startups (status);
create index if not exists startups_industry_idx on public.startups (industry);
create index if not exists startups_asking_price_idx on public.startups (asking_price);
create index if not exists startups_verified_idx on public.startups (verified);
create index if not exists startups_visibility_status_idx on public.startups (visibility, status);

drop trigger if exists startups_set_updated_at on public.startups;
create trigger startups_set_updated_at
  before update on public.startups
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- startup_media
-- ---------------------------------------------------------------------------
create table if not exists public.startup_media (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups (id) on delete cascade,
  type text not null default 'image',
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists startup_media_startup_id_idx on public.startup_media (startup_id);

-- ---------------------------------------------------------------------------
-- startup_metrics
-- ---------------------------------------------------------------------------
create table if not exists public.startup_metrics (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null unique references public.startups (id) on delete cascade,
  mrr numeric,
  arr numeric,
  revenue_ttm numeric,
  ebitda numeric,
  burn_rate numeric,
  cac numeric,
  ltv numeric,
  runway_months integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists startup_metrics_startup_id_idx on public.startup_metrics (startup_id);

drop trigger if exists startup_metrics_set_updated_at on public.startup_metrics;
create trigger startup_metrics_set_updated_at
  before update on public.startup_metrics
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- startup_interests
-- ---------------------------------------------------------------------------
create table if not exists public.startup_interests (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups (id) on delete cascade,
  buyer_profile_id uuid not null references public.marketplace_profiles (id) on delete cascade,
  status text not null default 'interested',
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint startup_interests_status_check check (
    status in ('interested', 'contacted', 'negotiating', 'closed', 'withdrawn')
  ),
  constraint startup_interests_unique unique (startup_id, buyer_profile_id)
);

create index if not exists startup_interests_startup_id_idx on public.startup_interests (startup_id);
create index if not exists startup_interests_buyer_profile_id_idx on public.startup_interests (buyer_profile_id);

drop trigger if exists startup_interests_set_updated_at on public.startup_interests;
create trigger startup_interests_set_updated_at
  before update on public.startup_interests
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- bids
-- ---------------------------------------------------------------------------
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups (id) on delete cascade,
  buyer_profile_id uuid not null references public.marketplace_profiles (id) on delete cascade,
  amount numeric not null,
  currency text not null default 'USD',
  status text not null default 'submitted',
  message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bids_status_check check (
    status in ('submitted', 'countered', 'accepted', 'rejected', 'withdrawn')
  )
);

create index if not exists bids_startup_id_idx on public.bids (startup_id);
create index if not exists bids_buyer_profile_id_idx on public.bids (buyer_profile_id);
create index if not exists bids_status_idx on public.bids (status);

drop trigger if exists bids_set_updated_at on public.bids;
create trigger bids_set_updated_at
  before update on public.bids
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- seller_listings
-- ---------------------------------------------------------------------------
create table if not exists public.seller_listings (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups (id) on delete cascade,
  seller_profile_id uuid not null references public.marketplace_profiles (id) on delete cascade,
  status text not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seller_listings_status_check check (
    status in ('draft', 'published', 'paused', 'sold', 'archived')
  ),
  constraint seller_listings_unique unique (startup_id, seller_profile_id)
);

create index if not exists seller_listings_seller_profile_id_idx on public.seller_listings (seller_profile_id);
create index if not exists seller_listings_startup_id_idx on public.seller_listings (startup_id);
create index if not exists seller_listings_status_idx on public.seller_listings (status);

drop trigger if exists seller_listings_set_updated_at on public.seller_listings;
create trigger seller_listings_set_updated_at
  before update on public.seller_listings
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- conversations + messages
-- ---------------------------------------------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid not null references public.startups (id) on delete cascade,
  buyer_profile_id uuid not null references public.marketplace_profiles (id) on delete cascade,
  seller_profile_id uuid not null references public.marketplace_profiles (id) on delete cascade,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  constraint conversations_status_check check (status in ('open', 'closed', 'archived')),
  constraint conversations_unique unique (startup_id, buyer_profile_id, seller_profile_id)
);

create index if not exists conversations_startup_id_idx on public.conversations (startup_id);
create index if not exists conversations_buyer_profile_id_idx on public.conversations (buyer_profile_id);
create index if not exists conversations_seller_profile_id_idx on public.conversations (seller_profile_id);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_user_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on public.messages (conversation_id);
create index if not exists messages_sender_user_id_idx on public.messages (sender_user_id);

-- ---------------------------------------------------------------------------
-- verification_requests
-- ---------------------------------------------------------------------------
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  seller_profile_id uuid not null references public.marketplace_profiles (id) on delete cascade,
  startup_id uuid not null references public.startups (id) on delete cascade,
  status text not null default 'pending',
  notes text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint verification_requests_status_check check (
    status in ('pending', 'approved', 'rejected', 'needs_info')
  )
);

create index if not exists verification_requests_seller_profile_id_idx
  on public.verification_requests (seller_profile_id);
create index if not exists verification_requests_startup_id_idx on public.verification_requests (startup_id);
create index if not exists verification_requests_status_idx on public.verification_requests (status);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.startups enable row level security;
alter table public.startup_media enable row level security;
alter table public.startup_metrics enable row level security;
alter table public.startup_interests enable row level security;
alter table public.bids enable row level security;
alter table public.seller_listings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.verification_requests enable row level security;

-- Public browse published startups
drop policy if exists startups_select_public on public.startups;
create policy startups_select_public
  on public.startups for select
  using (visibility = 'public' and status = 'published');

drop policy if exists startups_select_own on public.startups;
create policy startups_select_own
  on public.startups for select to authenticated
  using (founder_user_id = auth.uid());

drop policy if exists startups_insert_seller on public.startups;
create policy startups_insert_seller
  on public.startups for insert to authenticated
  with check (founder_user_id = auth.uid());

drop policy if exists startups_update_own on public.startups;
create policy startups_update_own
  on public.startups for update to authenticated
  using (founder_user_id = auth.uid())
  with check (founder_user_id = auth.uid());

-- Interests: buyer owns row
drop policy if exists startup_interests_select_own on public.startup_interests;
create policy startup_interests_select_own
  on public.startup_interests for select to authenticated
  using (
    buyer_profile_id in (
      select id from public.marketplace_profiles mp
      where mp.auth_user_id = auth.uid() and mp.desk_role = 'buyer'
    )
  );

drop policy if exists startup_interests_insert_buyer on public.startup_interests;
create policy startup_interests_insert_buyer
  on public.startup_interests for insert to authenticated
  with check (
    buyer_profile_id in (
      select id from public.marketplace_profiles mp
      where mp.auth_user_id = auth.uid() and mp.desk_role = 'buyer'
    )
  );

drop policy if exists startup_interests_update_buyer on public.startup_interests;
create policy startup_interests_update_buyer
  on public.startup_interests for update to authenticated
  using (
    buyer_profile_id in (
      select id from public.marketplace_profiles mp
      where mp.auth_user_id = auth.uid() and mp.desk_role = 'buyer'
    )
  );

-- Seller sees interests on their startups
drop policy if exists startup_interests_select_seller on public.startup_interests;
create policy startup_interests_select_seller
  on public.startup_interests for select to authenticated
  using (
    startup_id in (
      select s.id from public.startups s
      where s.founder_user_id = auth.uid()
    )
  );

-- Bids: buyer CRUD own
drop policy if exists bids_select_buyer on public.bids;
create policy bids_select_buyer
  on public.bids for select to authenticated
  using (
    buyer_profile_id in (
      select id from public.marketplace_profiles mp
      where mp.auth_user_id = auth.uid() and mp.desk_role = 'buyer'
    )
  );

drop policy if exists bids_insert_buyer on public.bids;
create policy bids_insert_buyer
  on public.bids for insert to authenticated
  with check (
    buyer_profile_id in (
      select id from public.marketplace_profiles mp
      where mp.auth_user_id = auth.uid() and mp.desk_role = 'buyer'
    )
  );

drop policy if exists bids_select_seller on public.bids;
create policy bids_select_seller
  on public.bids for select to authenticated
  using (
    startup_id in (select id from public.startups where founder_user_id = auth.uid())
  );

-- Seller listings
drop policy if exists seller_listings_select_public on public.seller_listings;
create policy seller_listings_select_public
  on public.seller_listings for select
  using (status = 'published');

drop policy if exists seller_listings_all_seller on public.seller_listings;
create policy seller_listings_all_seller
  on public.seller_listings for all to authenticated
  using (
    seller_profile_id in (
      select id from public.marketplace_profiles mp
      where mp.auth_user_id = auth.uid() and mp.desk_role in ('seller', 'founder')
    )
  )
  with check (
    seller_profile_id in (
      select id from public.marketplace_profiles mp
      where mp.auth_user_id = auth.uid() and mp.desk_role in ('seller', 'founder')
    )
  );

-- Conversations / messages (participants only)
drop policy if exists conversations_participants on public.conversations;
create policy conversations_participants
  on public.conversations for select to authenticated
  using (
    buyer_profile_id in (select id from public.marketplace_profiles where auth_user_id = auth.uid())
    or seller_profile_id in (select id from public.marketplace_profiles where auth_user_id = auth.uid())
  );

drop policy if exists messages_participants on public.messages;
create policy messages_participants
  on public.messages for select to authenticated
  using (
    conversation_id in (
      select c.id from public.conversations c
      join public.marketplace_profiles mp on mp.auth_user_id = auth.uid()
      where mp.id = c.buyer_profile_id or mp.id = c.seller_profile_id
    )
  );

drop policy if exists messages_insert_participants on public.messages;
create policy messages_insert_participants
  on public.messages for insert to authenticated
  with check (sender_user_id = auth.uid());

-- Verification
drop policy if exists verification_requests_seller on public.verification_requests;
create policy verification_requests_seller
  on public.verification_requests for all to authenticated
  using (
    seller_profile_id in (
      select id from public.marketplace_profiles mp
      where mp.auth_user_id = auth.uid() and mp.desk_role in ('seller', 'founder')
    )
  )
  with check (
    seller_profile_id in (
      select id from public.marketplace_profiles mp
      where mp.auth_user_id = auth.uid() and mp.desk_role in ('seller', 'founder')
    )
  );

-- Media/metrics: public read for published startups
drop policy if exists startup_media_public on public.startup_media;
create policy startup_media_public
  on public.startup_media for select
  using (
    startup_id in (select id from public.startups where visibility = 'public' and status = 'published')
  );

drop policy if exists startup_metrics_public on public.startup_metrics;
create policy startup_metrics_public
  on public.startup_metrics for select
  using (
    startup_id in (select id from public.startups where visibility = 'public' and status = 'published')
  );
