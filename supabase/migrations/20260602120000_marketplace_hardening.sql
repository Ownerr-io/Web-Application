-- Marketplace hardening: bid statuses, claims, RLS, indexes

-- ---------------------------------------------------------------------------
-- bids status enum expansion
-- ---------------------------------------------------------------------------
alter table public.bids drop constraint if exists bids_status_check;

alter table public.bids
  alter column status set default 'submitted';

alter table public.bids
  add constraint bids_status_check check (
    status in (
      'draft',
      'submitted',
      'under_review',
      'accepted',
      'rejected',
      'withdrawn',
      'expired'
    )
  );

create index if not exists bids_created_at_idx on public.bids (created_at desc);

create index if not exists bids_startup_id_status_idx on public.bids (startup_id, status);

-- ---------------------------------------------------------------------------
-- startup_claims
-- ---------------------------------------------------------------------------
create table if not exists public.startup_claims (
  id uuid primary key default gen_random_uuid(),
  startup_id uuid references public.startups (id) on delete set null,
  claiming_user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint startup_claims_status_check check (
    status in ('pending', 'approved', 'rejected', 'withdrawn')
  )
);

create index if not exists startup_claims_startup_id_idx on public.startup_claims (startup_id);
create index if not exists startup_claims_claiming_user_id_idx on public.startup_claims (claiming_user_id);
create index if not exists startup_claims_status_idx on public.startup_claims (status);

create unique index if not exists startup_claims_user_pending_uidx
  on public.startup_claims (claiming_user_id)
  where status = 'pending';

drop trigger if exists startup_claims_set_updated_at on public.startup_claims;
create trigger startup_claims_set_updated_at
  before update on public.startup_claims
  for each row
  execute function public.set_updated_at();

alter table public.startup_claims enable row level security;

drop policy if exists startup_claims_select_own on public.startup_claims;
create policy startup_claims_select_own
  on public.startup_claims for select to authenticated
  using (claiming_user_id = auth.uid());

drop policy if exists startup_claims_insert_own on public.startup_claims;
create policy startup_claims_insert_own
  on public.startup_claims for insert to authenticated
  with check (claiming_user_id = auth.uid());

drop policy if exists startup_claims_update_own on public.startup_claims;
create policy startup_claims_update_own
  on public.startup_claims for update to authenticated
  using (claiming_user_id = auth.uid())
  with check (claiming_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- bids: buyer insert/update own; seller read/update on own startups
-- ---------------------------------------------------------------------------
drop policy if exists bids_update_buyer on public.bids;
create policy bids_update_buyer
  on public.bids for update to authenticated
  using (
    buyer_profile_id in (
      select id from public.marketplace_profiles mp
      where mp.auth_user_id = auth.uid() and mp.desk_role = 'buyer'
    )
  );

drop policy if exists bids_update_seller on public.bids;
create policy bids_update_seller
  on public.bids for update to authenticated
  using (
    startup_id in (select id from public.startups where founder_user_id = auth.uid())
  );

drop policy if exists bids_select_seller on public.bids;
create policy bids_select_seller
  on public.bids for select to authenticated
  using (
    startup_id in (select id from public.startups where founder_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- interests: buyer withdraw (update status)
-- ---------------------------------------------------------------------------
drop policy if exists startup_interests_update_buyer on public.startup_interests;
create policy startup_interests_update_buyer
  on public.startup_interests for update to authenticated
  using (
    buyer_profile_id in (
      select id from public.marketplace_profiles mp
      where mp.auth_user_id = auth.uid() and mp.desk_role = 'buyer'
    )
  );

-- ---------------------------------------------------------------------------
-- conversations: participants insert
-- ---------------------------------------------------------------------------
drop policy if exists conversations_insert_participants on public.conversations;
create policy conversations_insert_participants
  on public.conversations for insert to authenticated
  with check (
    buyer_profile_id in (select id from public.marketplace_profiles where auth_user_id = auth.uid())
    or seller_profile_id in (select id from public.marketplace_profiles where auth_user_id = auth.uid())
  );

drop policy if exists conversations_update_participants on public.conversations;
create policy conversations_update_participants
  on public.conversations for update to authenticated
  using (
    buyer_profile_id in (select id from public.marketplace_profiles where auth_user_id = auth.uid())
    or seller_profile_id in (select id from public.marketplace_profiles where auth_user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- messages: participants read; sender insert
-- ---------------------------------------------------------------------------
drop policy if exists messages_participants on public.messages;
create policy messages_select_participants
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
  with check (
    sender_user_id = auth.uid()
    and conversation_id in (
      select c.id from public.conversations c
      join public.marketplace_profiles mp on mp.auth_user_id = auth.uid()
      where mp.id = c.buyer_profile_id or mp.id = c.seller_profile_id
    )
  );

drop policy if exists messages_update_read on public.messages;
create policy messages_update_read
  on public.messages for update to authenticated
  using (
    conversation_id in (
      select c.id from public.conversations c
      join public.marketplace_profiles mp on mp.auth_user_id = auth.uid()
      where mp.id = c.buyer_profile_id or mp.id = c.seller_profile_id
    )
  );
