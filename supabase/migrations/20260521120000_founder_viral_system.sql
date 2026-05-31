-- OWNERR OS viral founder-sharing (Supabase / Postgres)
-- Run in Supabase SQL editor or via CLI: supabase db push

create extension if not exists "pgcrypto";

create table if not exists public.founder_submissions (
  id uuid primary key default gen_random_uuid(),
  founder_name text not null,
  startup_name text not null,
  tagline text not null,
  description text not null,
  website text,
  social_links jsonb not null default '{}'::jsonb,
  founder_photo text,
  category text,
  location text,
  referral_code text not null,
  referral_link text not null,
  share_card_url text,
  visit_count integer not null default 0,
  referral_signup_count integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists founder_submissions_referral_code_idx
  on public.founder_submissions (referral_code);

create index if not exists founder_submissions_created_at_idx
  on public.founder_submissions (created_at desc);

create table if not exists public.founder_referral_events (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references public.founder_submissions (id) on delete cascade,
  event_type text not null check (event_type in ('visit', 'signup')),
  source_platform text,
  created_at timestamptz not null default now()
);

create index if not exists founder_referral_events_founder_id_idx
  on public.founder_referral_events (founder_id);

create index if not exists founder_referral_events_event_type_idx
  on public.founder_referral_events (event_type);

-- Row Level Security (enable when using Supabase Auth; service role bypasses RLS)
alter table public.founder_submissions enable row level security;
alter table public.founder_referral_events enable row level security;

drop policy if exists "Public read founder submissions" on public.founder_submissions;
create policy "Public read founder submissions"
  on public.founder_submissions for select
  using (true);

drop policy if exists "Service insert founder submissions" on public.founder_submissions;
create policy "Service insert founder submissions"
  on public.founder_submissions for insert
  with check (true);

drop policy if exists "Service update founder analytics" on public.founder_submissions;
create policy "Service update founder analytics"
  on public.founder_submissions for update
  using (true);

drop policy if exists "Public insert referral events" on public.founder_referral_events;
create policy "Public insert referral events"
  on public.founder_referral_events for insert
  with check (true);

drop policy if exists "Public read referral events" on public.founder_referral_events;
create policy "Public read referral events"
  on public.founder_referral_events for select
  using (true);
