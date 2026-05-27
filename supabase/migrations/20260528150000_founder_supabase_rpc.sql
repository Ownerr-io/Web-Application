-- Founder viral flows via Supabase (RPC + admin secret table). No Express required.

-- Admin key for analytics RPC (update in Supabase SQL editor for production).
create table if not exists public.founder_admin_secrets (
  id int primary key default 1,
  constraint founder_admin_secrets_singleton check (id = 1),
  secret text not null
);

alter table public.founder_admin_secrets enable row level security;

insert into public.founder_admin_secrets (id, secret)
values (1, 'change-me-local-admin-key')
on conflict (id) do nothing;

-- Public founder card for share pages (no direct table read for anon).
create or replace function public.founder_public_by_referral_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row founder_submissions%rowtype;
begin
  if p_code is null or length(trim(p_code)) = 0 then
    return null;
  end if;
  select * into v_row
  from founder_submissions
  where referral_code = trim(p_code)
  limit 1;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'id', v_row.id,
    'founderName', v_row.founder_name,
    'startupName', v_row.startup_name,
    'tagline', v_row.tagline,
    'description', v_row.description,
    'website', v_row.website,
    'socialLinks', coalesce(v_row.social_links, '{}'::jsonb),
    'founderPhoto', v_row.founder_photo,
    'category', v_row.category,
    'location', v_row.location,
    'referralCode', v_row.referral_code,
    'referralLink', v_row.referral_link,
    'shareCardUrl', v_row.share_card_url,
    'visitCount', v_row.visit_count,
    'referralSignupCount', v_row.referral_signup_count,
    'createdAt', v_row.created_at
  );
end;
$$;

create or replace function public.founder_track_referral(
  p_referral_code text,
  p_event_type text,
  p_source_platform text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_founder founder_submissions%rowtype;
  v_platform text;
begin
  if p_referral_code is null or length(trim(p_referral_code)) = 0 then
    raise exception 'referral code required' using errcode = '22023';
  end if;
  if p_event_type not in ('visit', 'signup') then
    raise exception 'invalid event type' using errcode = '22023';
  end if;

  select * into v_founder
  from founder_submissions
  where referral_code = trim(p_referral_code)
  limit 1;
  if not found then
    raise exception 'referral code not found' using errcode = 'P0002';
  end if;

  v_platform := nullif(trim(p_source_platform), '');

  insert into founder_referral_events (founder_id, event_type, source_platform)
  values (v_founder.id, p_event_type, v_platform);

  if p_event_type = 'visit' then
    update founder_submissions
    set visit_count = visit_count + 1
    where id = v_founder.id
    returning * into v_founder;
  else
    update founder_submissions
    set referral_signup_count = referral_signup_count + 1
    where id = v_founder.id
    returning * into v_founder;
  end if;

  return jsonb_build_object(
    'ok', true,
    'visitCount', v_founder.visit_count,
    'referralSignupCount', v_founder.referral_signup_count
  );
end;
$$;

create or replace function public.founder_analytics_summary(p_admin_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_expected text;
  v_totals record;
  v_top_founder jsonb;
  v_top_startup jsonb;
  v_traffic jsonb;
begin
  select secret into v_expected from founder_admin_secrets where id = 1;
  if v_expected is null or p_admin_key is distinct from v_expected then
    raise exception 'Unauthorized' using errcode = '42501';
  end if;

  select
    count(*)::int as total_founders,
    coalesce(sum(visit_count), 0)::int as total_referral_clicks,
    coalesce(sum(referral_signup_count), 0)::int as total_conversions
  into v_totals
  from founder_submissions;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_top_founder
  from (
    select
      id,
      founder_name as "founderName",
      startup_name as "startupName",
      referral_code as "referralCode",
      visit_count as "visitCount",
      referral_signup_count as "referralSignupCount",
      (visit_count + referral_signup_count * 3) as "viralScore"
    from founder_submissions
    order by (visit_count + referral_signup_count * 3) desc
    limit 10
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_top_startup
  from (
    select
      startup_name as "startupName",
      count(*)::int as founders,
      coalesce(sum(visit_count), 0)::int as "visitCount",
      coalesce(sum(referral_signup_count), 0)::int as "referralSignupCount"
    from founder_submissions
    group by startup_name
    order by coalesce(sum(visit_count), 0) desc
    limit 10
  ) t;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  into v_traffic
  from (
    select source_platform as "sourcePlatform", count(*)::int as count
    from founder_referral_events
    where source_platform is not null
    group by source_platform
    order by count(*) desc
    limit 12
  ) t;

  return jsonb_build_object(
    'totalFounders', v_totals.total_founders,
    'totalReferralClicks', v_totals.total_referral_clicks,
    'totalConversions', v_totals.total_conversions,
    'topFounders', v_top_founder,
    'topStartups', v_top_startup,
    'trafficSources', v_traffic
  );
end;
$$;

revoke all on function public.founder_public_by_referral_code(text) from public;
revoke all on function public.founder_track_referral(text, text, text) from public;
revoke all on function public.founder_analytics_summary(text) from public;

grant execute on function public.founder_public_by_referral_code(text) to anon, authenticated, service_role;
grant execute on function public.founder_track_referral(text, text, text) to anon, authenticated, service_role;
grant execute on function public.founder_analytics_summary(text) to anon, authenticated, service_role;
