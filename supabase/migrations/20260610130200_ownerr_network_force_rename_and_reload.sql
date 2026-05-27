-- Force Unemployed → Ownerr Network renames (idempotent) and refresh PostgREST.

DO $$
BEGIN
  IF to_regclass('public.unemployed_users') IS NOT NULL
     AND to_regclass('public.ownerr_network_users') IS NULL THEN
    ALTER TABLE public.unemployed_users RENAME TO ownerr_network_users;
  END IF;
  IF to_regclass('public.unemployed_points_ledger') IS NOT NULL
     AND to_regclass('public.ownerr_network_points_ledger') IS NULL THEN
    ALTER TABLE public.unemployed_points_ledger RENAME TO ownerr_network_points_ledger;
  END IF;
  IF to_regclass('public.unemployed_referrals') IS NOT NULL
     AND to_regclass('public.ownerr_network_referrals') IS NULL THEN
    ALTER TABLE public.unemployed_referrals RENAME TO ownerr_network_referrals;
  END IF;
  IF to_regclass('public.unemployed_mcq_sessions') IS NOT NULL
     AND to_regclass('public.ownerr_network_onboarding_sessions') IS NULL THEN
    ALTER TABLE public.unemployed_mcq_sessions RENAME TO ownerr_network_onboarding_sessions;
  END IF;
  IF to_regclass('public.unemployed_badges') IS NOT NULL
     AND to_regclass('public.ownerr_network_badges') IS NULL THEN
    ALTER TABLE public.unemployed_badges RENAME TO ownerr_network_badges;
  END IF;
  IF to_regclass('public.unemployed_user_badges') IS NOT NULL
     AND to_regclass('public.ownerr_network_user_badges') IS NULL THEN
    ALTER TABLE public.unemployed_user_badges RENAME TO ownerr_network_user_badges;
  END IF;
  IF to_regclass('public.unemployed_analytics_events') IS NOT NULL
     AND to_regclass('public.ownerr_network_analytics_events') IS NULL THEN
    ALTER TABLE public.unemployed_analytics_events RENAME TO ownerr_network_analytics_events;
  END IF;
  IF to_regclass('public.unemployed_profiles') IS NOT NULL
     AND to_regclass('public.ownerr_network_profiles') IS NULL THEN
    ALTER TABLE public.unemployed_profiles RENAME TO ownerr_network_profiles;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
