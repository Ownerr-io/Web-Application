-- Grant PostgREST access to all canonical tables and force schema reload.

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_products TO authenticated;
GRANT SELECT ON public.wallets TO authenticated;
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT SELECT ON public.referrals TO authenticated;
GRANT SELECT ON public.referral_events TO authenticated;
GRANT SELECT ON public.user_scores TO authenticated;
GRANT SELECT ON public.user_badges TO authenticated;
GRANT SELECT, INSERT ON public.user_events TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.user_onboarding_sessions TO authenticated;
GRANT SELECT, INSERT ON public.user_answers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.opportunities TO authenticated;
GRANT SELECT, INSERT ON public.opportunity_responses TO authenticated;
GRANT SELECT ON public.listings TO authenticated, anon;
GRANT SELECT, INSERT ON public.listing_interests TO authenticated;
GRANT SELECT ON public.submissions TO authenticated, anon;
GRANT SELECT, INSERT ON public.submission_referrals TO authenticated;

-- Views
GRANT SELECT ON public.ownerr_network_users TO authenticated, anon;
GRANT SELECT ON public.ownerr_network_profiles TO authenticated, anon;
GRANT SELECT ON public.ownerr_network_onboarding_sessions TO authenticated;
GRANT SELECT ON public.ownerr_network_analytics_events TO authenticated;

-- Full access for service_role (bypasses RLS anyway but needed for PostgREST exposure)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
