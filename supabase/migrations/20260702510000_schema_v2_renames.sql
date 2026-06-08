-- Schema v2: physical rename + compat views (zero row loss; ALTER TABLE RENAME).
-- Generated from scripts/schema-v2/table-renames.json — re-run generator after edits.

BEGIN;


DO $r$ BEGIN
  IF to_regclass('public.startups') IS NOT NULL
     AND to_regclass('public.marketplace_companies') IS NULL THEN
    ALTER TABLE public.startups RENAME TO marketplace_companies;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.marketplace_profiles') IS NOT NULL
     AND to_regclass('public.marketplace_accounts') IS NULL THEN
    ALTER TABLE public.marketplace_profiles RENAME TO marketplace_accounts;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.startup_media') IS NOT NULL
     AND to_regclass('public.marketplace_company_media') IS NULL THEN
    ALTER TABLE public.startup_media RENAME TO marketplace_company_media;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.startup_metrics') IS NOT NULL
     AND to_regclass('public.marketplace_company_metrics') IS NULL THEN
    ALTER TABLE public.startup_metrics RENAME TO marketplace_company_metrics;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.startup_interests') IS NOT NULL
     AND to_regclass('public.marketplace_buyer_interests') IS NULL THEN
    ALTER TABLE public.startup_interests RENAME TO marketplace_buyer_interests;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.bids') IS NOT NULL
     AND to_regclass('public.marketplace_offers') IS NULL THEN
    ALTER TABLE public.bids RENAME TO marketplace_offers;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.bid_versions') IS NOT NULL
     AND to_regclass('public.marketplace_offer_revisions') IS NULL THEN
    ALTER TABLE public.bid_versions RENAME TO marketplace_offer_revisions;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.acquisition_deals') IS NOT NULL
     AND to_regclass('public.marketplace_acquisitions') IS NULL THEN
    ALTER TABLE public.acquisition_deals RENAME TO marketplace_acquisitions;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.marketplace_offer_events') IS NOT NULL
     AND to_regclass('public.marketplace_offer_notifications') IS NULL THEN
    ALTER TABLE public.marketplace_offer_events RENAME TO marketplace_offer_notifications;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.seller_listings') IS NOT NULL
     AND to_regclass('public.marketplace_seller_publications') IS NULL THEN
    ALTER TABLE public.seller_listings RENAME TO marketplace_seller_publications;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.conversations') IS NOT NULL
     AND to_regclass('public.marketplace_conversations') IS NULL THEN
    ALTER TABLE public.conversations RENAME TO marketplace_conversations;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.messages') IS NOT NULL
     AND to_regclass('public.marketplace_messages') IS NULL THEN
    ALTER TABLE public.messages RENAME TO marketplace_messages;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.startup_claims') IS NOT NULL
     AND to_regclass('public.marketplace_company_claims') IS NULL THEN
    ALTER TABLE public.startup_claims RENAME TO marketplace_company_claims;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.listing_seller_intake') IS NOT NULL
     AND to_regclass('public.marketplace_seller_intake') IS NULL THEN
    ALTER TABLE public.listing_seller_intake RENAME TO marketplace_seller_intake;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.listing_business_proofs') IS NOT NULL
     AND to_regclass('public.marketplace_business_proofs') IS NULL THEN
    ALTER TABLE public.listing_business_proofs RENAME TO marketplace_business_proofs;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.verification_requests') IS NOT NULL
     AND to_regclass('public.marketplace_verification_requests') IS NULL THEN
    ALTER TABLE public.verification_requests RENAME TO marketplace_verification_requests;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.listings') IS NOT NULL
     AND to_regclass('public.catalog_listings') IS NULL THEN
    ALTER TABLE public.listings RENAME TO catalog_listings;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.listing_interests') IS NOT NULL
     AND to_regclass('public.catalog_listing_interests') IS NULL THEN
    ALTER TABLE public.listing_interests RENAME TO catalog_listing_interests;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.founder_submissions') IS NOT NULL
     AND to_regclass('public.founder_campaign_submissions') IS NULL THEN
    ALTER TABLE public.founder_submissions RENAME TO founder_campaign_submissions;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.founder_referral_events') IS NOT NULL
     AND to_regclass('public.founder_campaign_referral_events') IS NULL THEN
    ALTER TABLE public.founder_referral_events RENAME TO founder_campaign_referral_events;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.platform_internal_config') IS NOT NULL
     AND to_regclass('public.sys_platform_config') IS NULL THEN
    ALTER TABLE public.platform_internal_config RENAME TO sys_platform_config;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.audit_logs') IS NOT NULL
     AND to_regclass('public.sys_audit_logs') IS NULL THEN
    ALTER TABLE public.audit_logs RENAME TO sys_audit_logs;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.identity_launch_tokens') IS NOT NULL
     AND to_regclass('public.sys_identity_launch_tokens') IS NULL THEN
    ALTER TABLE public.identity_launch_tokens RENAME TO sys_identity_launch_tokens;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.sync_worker_launch_tokens') IS NOT NULL
     AND to_regclass('public.sys_sync_worker_launch_tokens') IS NULL THEN
    ALTER TABLE public.sync_worker_launch_tokens RENAME TO sys_sync_worker_launch_tokens;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.business_email_launch_tokens') IS NOT NULL
     AND to_regclass('public.sys_business_email_launch_tokens') IS NULL THEN
    ALTER TABLE public.business_email_launch_tokens RENAME TO sys_business_email_launch_tokens;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.verification_providers') IS NOT NULL
     AND to_regclass('public.trust_providers') IS NULL THEN
    ALTER TABLE public.verification_providers RENAME TO trust_providers;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.integration_connections') IS NOT NULL
     AND to_regclass('public.trust_integrations') IS NULL THEN
    ALTER TABLE public.integration_connections RENAME TO trust_integrations;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.integration_credentials') IS NOT NULL
     AND to_regclass('public.trust_integration_secrets') IS NULL THEN
    ALTER TABLE public.integration_credentials RENAME TO trust_integration_secrets;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.integration_syncs') IS NOT NULL
     AND to_regclass('public.trust_integration_sync_runs') IS NULL THEN
    ALTER TABLE public.integration_syncs RENAME TO trust_integration_sync_runs;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.integration_sync_jobs') IS NOT NULL
     AND to_regclass('public.trust_integration_jobs') IS NULL THEN
    ALTER TABLE public.integration_sync_jobs RENAME TO trust_integration_jobs;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.verification_results') IS NOT NULL
     AND to_regclass('public.trust_verification_results') IS NULL THEN
    ALTER TABLE public.verification_results RENAME TO trust_verification_results;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.verification_events') IS NOT NULL
     AND to_regclass('public.trust_verification_events') IS NULL THEN
    ALTER TABLE public.verification_events RENAME TO trust_verification_events;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.domain_verification_challenges') IS NOT NULL
     AND to_regclass('public.trust_domain_challenges') IS NULL THEN
    ALTER TABLE public.domain_verification_challenges RENAME TO trust_domain_challenges;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.financial_metrics') IS NOT NULL
     AND to_regclass('public.trust_financial_metrics') IS NULL THEN
    ALTER TABLE public.financial_metrics RENAME TO trust_financial_metrics;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.traffic_metrics') IS NOT NULL
     AND to_regclass('public.trust_traffic_metrics') IS NULL THEN
    ALTER TABLE public.traffic_metrics RENAME TO trust_traffic_metrics;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.accounting_metrics') IS NOT NULL
     AND to_regclass('public.trust_accounting_metrics') IS NULL THEN
    ALTER TABLE public.accounting_metrics RENAME TO trust_accounting_metrics;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.bank_metrics') IS NOT NULL
     AND to_regclass('public.trust_bank_metrics') IS NULL THEN
    ALTER TABLE public.bank_metrics RENAME TO trust_bank_metrics;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.trust_scores') IS NOT NULL
     AND to_regclass('public.trust_company_scores') IS NULL THEN
    ALTER TABLE public.trust_scores RENAME TO trust_company_scores;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.trust_score_history') IS NOT NULL
     AND to_regclass('public.trust_company_score_history') IS NULL THEN
    ALTER TABLE public.trust_score_history RENAME TO trust_company_score_history;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.trust_signals') IS NOT NULL
     AND to_regclass('public.trust_company_signals') IS NULL THEN
    ALTER TABLE public.trust_signals RENAME TO trust_company_signals;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.valuation_reports') IS NOT NULL
     AND to_regclass('public.trust_valuation_reports') IS NULL THEN
    ALTER TABLE public.valuation_reports RENAME TO trust_valuation_reports;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.valuation_inputs') IS NOT NULL
     AND to_regclass('public.trust_valuation_inputs') IS NULL THEN
    ALTER TABLE public.valuation_inputs RENAME TO trust_valuation_inputs;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.valuation_adjustments') IS NOT NULL
     AND to_regclass('public.trust_valuation_adjustments') IS NULL THEN
    ALTER TABLE public.valuation_adjustments RENAME TO trust_valuation_adjustments;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.valuation_history') IS NOT NULL
     AND to_regclass('public.trust_valuation_history') IS NULL THEN
    ALTER TABLE public.valuation_history RENAME TO trust_valuation_history;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.ai_insight_runs') IS NOT NULL
     AND to_regclass('public.trust_ai_insight_runs') IS NULL THEN
    ALTER TABLE public.ai_insight_runs RENAME TO trust_ai_insight_runs;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.listing_verification_gates') IS NOT NULL
     AND to_regclass('public.trust_listing_gates') IS NULL THEN
    ALTER TABLE public.listing_verification_gates RENAME TO trust_listing_gates;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.founder_identity_verifications') IS NOT NULL
     AND to_regclass('public.trust_founder_identity_checks') IS NULL THEN
    ALTER TABLE public.founder_identity_verifications RENAME TO trust_founder_identity_checks;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.business_email_verifications') IS NOT NULL
     AND to_regclass('public.trust_business_email_verifications') IS NULL THEN
    ALTER TABLE public.business_email_verifications RENAME TO trust_business_email_verifications;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.business_registration_documents') IS NOT NULL
     AND to_regclass('public.trust_registration_documents') IS NULL THEN
    ALTER TABLE public.business_registration_documents RENAME TO trust_registration_documents;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.listing_fraud_signals') IS NOT NULL
     AND to_regclass('public.trust_fraud_signals') IS NULL THEN
    ALTER TABLE public.listing_fraud_signals RENAME TO trust_fraud_signals;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.admin_listing_reviews') IS NOT NULL
     AND to_regclass('public.trust_admin_reviews') IS NULL THEN
    ALTER TABLE public.admin_listing_reviews RENAME TO trust_admin_reviews;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.platform_disposable_email_domains') IS NOT NULL
     AND to_regclass('public.trust_disposable_email_domains') IS NULL THEN
    ALTER TABLE public.platform_disposable_email_domains RENAME TO trust_disposable_email_domains;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.identity_verification_sessions') IS NOT NULL
     AND to_regclass('public.trust_identity_sessions') IS NULL THEN
    ALTER TABLE public.identity_verification_sessions RENAME TO trust_identity_sessions;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.verification_webhook_events') IS NOT NULL
     AND to_regclass('public.trust_webhook_events') IS NULL THEN
    ALTER TABLE public.verification_webhook_events RENAME TO trust_webhook_events;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.person_verification_profiles') IS NOT NULL
     AND to_regclass('public.trust_person_profiles') IS NULL THEN
    ALTER TABLE public.person_verification_profiles RENAME TO trust_person_profiles;
  END IF;
END $r$;

DO $r$ BEGIN
  IF to_regclass('public.verified_revenue_metrics') IS NOT NULL
     AND to_regclass('public.trust_verified_revenue_metrics') IS NULL THEN
    ALTER TABLE public.verified_revenue_metrics RENAME TO trust_verified_revenue_metrics;
  END IF;
END $r$;

INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('marketplace_companies', 'startups', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('marketplace_accounts', 'marketplace_profiles', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('marketplace_company_media', 'startup_media', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('marketplace_company_metrics', 'startup_metrics', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('marketplace_buyer_interests', 'startup_interests', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('marketplace_offers', 'bids', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('marketplace_offer_revisions', 'bid_versions', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('marketplace_acquisitions', 'acquisition_deals', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('marketplace_offer_notifications', 'marketplace_offer_events', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('marketplace_seller_publications', 'seller_listings', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('marketplace_conversations', 'conversations', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('marketplace_messages', 'messages', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('marketplace_company_claims', 'startup_claims', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('marketplace_seller_intake', 'listing_seller_intake', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('marketplace_business_proofs', 'listing_business_proofs', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('marketplace_verification_requests', 'verification_requests', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('catalog_listings', 'listings', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('catalog_listing_interests', 'listing_interests', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('founder_campaign_submissions', 'founder_submissions', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('founder_campaign_referral_events', 'founder_referral_events', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('sys_platform_config', 'platform_internal_config', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('sys_audit_logs', 'audit_logs', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('sys_identity_launch_tokens', 'identity_launch_tokens', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('sys_sync_worker_launch_tokens', 'sync_worker_launch_tokens', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('sys_business_email_launch_tokens', 'business_email_launch_tokens', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_providers', 'verification_providers', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_integrations', 'integration_connections', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_integration_secrets', 'integration_credentials', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_integration_sync_runs', 'integration_syncs', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_integration_jobs', 'integration_sync_jobs', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_verification_results', 'verification_results', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_verification_events', 'verification_events', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_domain_challenges', 'domain_verification_challenges', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_financial_metrics', 'financial_metrics', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_traffic_metrics', 'traffic_metrics', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_accounting_metrics', 'accounting_metrics', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_bank_metrics', 'bank_metrics', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_company_scores', 'trust_scores', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_company_score_history', 'trust_score_history', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_company_signals', 'trust_signals', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_valuation_reports', 'valuation_reports', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_valuation_inputs', 'valuation_inputs', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_valuation_adjustments', 'valuation_adjustments', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_valuation_history', 'valuation_history', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_ai_insight_runs', 'ai_insight_runs', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_listing_gates', 'listing_verification_gates', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_founder_identity_checks', 'founder_identity_verifications', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_business_email_verifications', 'business_email_verifications', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_registration_documents', 'business_registration_documents', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_fraud_signals', 'listing_fraud_signals', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_admin_reviews', 'admin_listing_reviews', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_disposable_email_domains', 'platform_disposable_email_domains', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_identity_sessions', 'identity_verification_sessions', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_webhook_events', 'verification_webhook_events', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_person_profiles', 'person_verification_profiles', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;
INSERT INTO public.schema_v2_rename_registry (physical_name, legacy_name, domain)
     VALUES ('trust_verified_revenue_metrics', 'verified_revenue_metrics', 'auto')
     ON CONFLICT (physical_name) DO UPDATE SET legacy_name = EXCLUDED.legacy_name;

-- Compatibility views (old names for RPCs / gradual client migration)
DROP VIEW IF EXISTS public.startups CASCADE;
CREATE VIEW public.startups WITH (security_invoker = true) AS SELECT * FROM public.marketplace_companies;
COMMENT ON VIEW public.startups IS 'Schema v2 compat; prefer public.marketplace_companies.';
DROP VIEW IF EXISTS public.marketplace_profiles CASCADE;
CREATE VIEW public.marketplace_profiles WITH (security_invoker = true) AS SELECT * FROM public.marketplace_accounts;
COMMENT ON VIEW public.marketplace_profiles IS 'Schema v2 compat; prefer public.marketplace_accounts.';
DROP VIEW IF EXISTS public.startup_media CASCADE;
CREATE VIEW public.startup_media WITH (security_invoker = true) AS SELECT * FROM public.marketplace_company_media;
COMMENT ON VIEW public.startup_media IS 'Schema v2 compat; prefer public.marketplace_company_media.';
DROP VIEW IF EXISTS public.startup_metrics CASCADE;
CREATE VIEW public.startup_metrics WITH (security_invoker = true) AS SELECT * FROM public.marketplace_company_metrics;
COMMENT ON VIEW public.startup_metrics IS 'Schema v2 compat; prefer public.marketplace_company_metrics.';
DROP VIEW IF EXISTS public.startup_interests CASCADE;
CREATE VIEW public.startup_interests WITH (security_invoker = true) AS SELECT * FROM public.marketplace_buyer_interests;
COMMENT ON VIEW public.startup_interests IS 'Schema v2 compat; prefer public.marketplace_buyer_interests.';
DROP VIEW IF EXISTS public.bids CASCADE;
CREATE VIEW public.bids WITH (security_invoker = true) AS SELECT * FROM public.marketplace_offers;
COMMENT ON VIEW public.bids IS 'Schema v2 compat; prefer public.marketplace_offers.';
DROP VIEW IF EXISTS public.bid_versions CASCADE;
CREATE VIEW public.bid_versions WITH (security_invoker = true) AS SELECT * FROM public.marketplace_offer_revisions;
COMMENT ON VIEW public.bid_versions IS 'Schema v2 compat; prefer public.marketplace_offer_revisions.';
DROP VIEW IF EXISTS public.acquisition_deals CASCADE;
CREATE VIEW public.acquisition_deals WITH (security_invoker = true) AS SELECT * FROM public.marketplace_acquisitions;
COMMENT ON VIEW public.acquisition_deals IS 'Schema v2 compat; prefer public.marketplace_acquisitions.';
DROP VIEW IF EXISTS public.marketplace_offer_events CASCADE;
CREATE VIEW public.marketplace_offer_events WITH (security_invoker = true) AS SELECT * FROM public.marketplace_offer_notifications;
COMMENT ON VIEW public.marketplace_offer_events IS 'Schema v2 compat; prefer public.marketplace_offer_notifications.';
DROP VIEW IF EXISTS public.seller_listings CASCADE;
CREATE VIEW public.seller_listings WITH (security_invoker = true) AS SELECT * FROM public.marketplace_seller_publications;
COMMENT ON VIEW public.seller_listings IS 'Schema v2 compat; prefer public.marketplace_seller_publications.';
DROP VIEW IF EXISTS public.conversations CASCADE;
CREATE VIEW public.conversations WITH (security_invoker = true) AS SELECT * FROM public.marketplace_conversations;
COMMENT ON VIEW public.conversations IS 'Schema v2 compat; prefer public.marketplace_conversations.';
DROP VIEW IF EXISTS public.messages CASCADE;
CREATE VIEW public.messages WITH (security_invoker = true) AS SELECT * FROM public.marketplace_messages;
COMMENT ON VIEW public.messages IS 'Schema v2 compat; prefer public.marketplace_messages.';
DROP VIEW IF EXISTS public.startup_claims CASCADE;
CREATE VIEW public.startup_claims WITH (security_invoker = true) AS SELECT * FROM public.marketplace_company_claims;
COMMENT ON VIEW public.startup_claims IS 'Schema v2 compat; prefer public.marketplace_company_claims.';
DROP VIEW IF EXISTS public.listing_seller_intake CASCADE;
CREATE VIEW public.listing_seller_intake WITH (security_invoker = true) AS SELECT * FROM public.marketplace_seller_intake;
COMMENT ON VIEW public.listing_seller_intake IS 'Schema v2 compat; prefer public.marketplace_seller_intake.';
DROP VIEW IF EXISTS public.listing_business_proofs CASCADE;
CREATE VIEW public.listing_business_proofs WITH (security_invoker = true) AS SELECT * FROM public.marketplace_business_proofs;
COMMENT ON VIEW public.listing_business_proofs IS 'Schema v2 compat; prefer public.marketplace_business_proofs.';
DROP VIEW IF EXISTS public.verification_requests CASCADE;
CREATE VIEW public.verification_requests WITH (security_invoker = true) AS SELECT * FROM public.marketplace_verification_requests;
COMMENT ON VIEW public.verification_requests IS 'Schema v2 compat; prefer public.marketplace_verification_requests.';
DROP VIEW IF EXISTS public.listings CASCADE;
CREATE VIEW public.listings WITH (security_invoker = true) AS SELECT * FROM public.catalog_listings;
COMMENT ON VIEW public.listings IS 'Schema v2 compat; prefer public.catalog_listings.';
DROP VIEW IF EXISTS public.listing_interests CASCADE;
CREATE VIEW public.listing_interests WITH (security_invoker = true) AS SELECT * FROM public.catalog_listing_interests;
COMMENT ON VIEW public.listing_interests IS 'Schema v2 compat; prefer public.catalog_listing_interests.';
DROP VIEW IF EXISTS public.founder_submissions CASCADE;
CREATE VIEW public.founder_submissions WITH (security_invoker = true) AS SELECT * FROM public.founder_campaign_submissions;
COMMENT ON VIEW public.founder_submissions IS 'Schema v2 compat; prefer public.founder_campaign_submissions.';
DROP VIEW IF EXISTS public.founder_referral_events CASCADE;
CREATE VIEW public.founder_referral_events WITH (security_invoker = true) AS SELECT * FROM public.founder_campaign_referral_events;
COMMENT ON VIEW public.founder_referral_events IS 'Schema v2 compat; prefer public.founder_campaign_referral_events.';
DROP VIEW IF EXISTS public.platform_internal_config CASCADE;
CREATE VIEW public.platform_internal_config WITH (security_invoker = true) AS SELECT * FROM public.sys_platform_config;
COMMENT ON VIEW public.platform_internal_config IS 'Schema v2 compat; prefer public.sys_platform_config.';
DROP VIEW IF EXISTS public.audit_logs CASCADE;
CREATE VIEW public.audit_logs WITH (security_invoker = true) AS SELECT * FROM public.sys_audit_logs;
COMMENT ON VIEW public.audit_logs IS 'Schema v2 compat; prefer public.sys_audit_logs.';
DROP VIEW IF EXISTS public.identity_launch_tokens CASCADE;
CREATE VIEW public.identity_launch_tokens WITH (security_invoker = true) AS SELECT * FROM public.sys_identity_launch_tokens;
COMMENT ON VIEW public.identity_launch_tokens IS 'Schema v2 compat; prefer public.sys_identity_launch_tokens.';
DROP VIEW IF EXISTS public.sync_worker_launch_tokens CASCADE;
CREATE VIEW public.sync_worker_launch_tokens WITH (security_invoker = true) AS SELECT * FROM public.sys_sync_worker_launch_tokens;
COMMENT ON VIEW public.sync_worker_launch_tokens IS 'Schema v2 compat; prefer public.sys_sync_worker_launch_tokens.';
DROP VIEW IF EXISTS public.business_email_launch_tokens CASCADE;
CREATE VIEW public.business_email_launch_tokens WITH (security_invoker = true) AS SELECT * FROM public.sys_business_email_launch_tokens;
COMMENT ON VIEW public.business_email_launch_tokens IS 'Schema v2 compat; prefer public.sys_business_email_launch_tokens.';
DROP VIEW IF EXISTS public.verification_providers CASCADE;
CREATE VIEW public.verification_providers WITH (security_invoker = true) AS SELECT * FROM public.trust_providers;
COMMENT ON VIEW public.verification_providers IS 'Schema v2 compat; prefer public.trust_providers.';
DROP VIEW IF EXISTS public.integration_connections CASCADE;
CREATE VIEW public.integration_connections WITH (security_invoker = true) AS SELECT * FROM public.trust_integrations;
COMMENT ON VIEW public.integration_connections IS 'Schema v2 compat; prefer public.trust_integrations.';
DROP VIEW IF EXISTS public.integration_credentials CASCADE;
CREATE VIEW public.integration_credentials WITH (security_invoker = true) AS SELECT * FROM public.trust_integration_secrets;
COMMENT ON VIEW public.integration_credentials IS 'Schema v2 compat; prefer public.trust_integration_secrets.';
DROP VIEW IF EXISTS public.integration_syncs CASCADE;
CREATE VIEW public.integration_syncs WITH (security_invoker = true) AS SELECT * FROM public.trust_integration_sync_runs;
COMMENT ON VIEW public.integration_syncs IS 'Schema v2 compat; prefer public.trust_integration_sync_runs.';
DROP VIEW IF EXISTS public.integration_sync_jobs CASCADE;
CREATE VIEW public.integration_sync_jobs WITH (security_invoker = true) AS SELECT * FROM public.trust_integration_jobs;
COMMENT ON VIEW public.integration_sync_jobs IS 'Schema v2 compat; prefer public.trust_integration_jobs.';
DROP VIEW IF EXISTS public.verification_results CASCADE;
CREATE VIEW public.verification_results WITH (security_invoker = true) AS SELECT * FROM public.trust_verification_results;
COMMENT ON VIEW public.verification_results IS 'Schema v2 compat; prefer public.trust_verification_results.';
DROP VIEW IF EXISTS public.verification_events CASCADE;
CREATE VIEW public.verification_events WITH (security_invoker = true) AS SELECT * FROM public.trust_verification_events;
COMMENT ON VIEW public.verification_events IS 'Schema v2 compat; prefer public.trust_verification_events.';
DROP VIEW IF EXISTS public.domain_verification_challenges CASCADE;
CREATE VIEW public.domain_verification_challenges WITH (security_invoker = true) AS SELECT * FROM public.trust_domain_challenges;
COMMENT ON VIEW public.domain_verification_challenges IS 'Schema v2 compat; prefer public.trust_domain_challenges.';
DROP VIEW IF EXISTS public.financial_metrics CASCADE;
CREATE VIEW public.financial_metrics WITH (security_invoker = true) AS SELECT * FROM public.trust_financial_metrics;
COMMENT ON VIEW public.financial_metrics IS 'Schema v2 compat; prefer public.trust_financial_metrics.';
DROP VIEW IF EXISTS public.traffic_metrics CASCADE;
CREATE VIEW public.traffic_metrics WITH (security_invoker = true) AS SELECT * FROM public.trust_traffic_metrics;
COMMENT ON VIEW public.traffic_metrics IS 'Schema v2 compat; prefer public.trust_traffic_metrics.';
DROP VIEW IF EXISTS public.accounting_metrics CASCADE;
CREATE VIEW public.accounting_metrics WITH (security_invoker = true) AS SELECT * FROM public.trust_accounting_metrics;
COMMENT ON VIEW public.accounting_metrics IS 'Schema v2 compat; prefer public.trust_accounting_metrics.';
DROP VIEW IF EXISTS public.bank_metrics CASCADE;
CREATE VIEW public.bank_metrics WITH (security_invoker = true) AS SELECT * FROM public.trust_bank_metrics;
COMMENT ON VIEW public.bank_metrics IS 'Schema v2 compat; prefer public.trust_bank_metrics.';
DROP VIEW IF EXISTS public.trust_scores CASCADE;
CREATE VIEW public.trust_scores WITH (security_invoker = true) AS SELECT * FROM public.trust_company_scores;
COMMENT ON VIEW public.trust_scores IS 'Schema v2 compat; prefer public.trust_company_scores.';
DROP VIEW IF EXISTS public.trust_score_history CASCADE;
CREATE VIEW public.trust_score_history WITH (security_invoker = true) AS SELECT * FROM public.trust_company_score_history;
COMMENT ON VIEW public.trust_score_history IS 'Schema v2 compat; prefer public.trust_company_score_history.';
DROP VIEW IF EXISTS public.trust_signals CASCADE;
CREATE VIEW public.trust_signals WITH (security_invoker = true) AS SELECT * FROM public.trust_company_signals;
COMMENT ON VIEW public.trust_signals IS 'Schema v2 compat; prefer public.trust_company_signals.';
DROP VIEW IF EXISTS public.valuation_reports CASCADE;
CREATE VIEW public.valuation_reports WITH (security_invoker = true) AS SELECT * FROM public.trust_valuation_reports;
COMMENT ON VIEW public.valuation_reports IS 'Schema v2 compat; prefer public.trust_valuation_reports.';
DROP VIEW IF EXISTS public.valuation_inputs CASCADE;
CREATE VIEW public.valuation_inputs WITH (security_invoker = true) AS SELECT * FROM public.trust_valuation_inputs;
COMMENT ON VIEW public.valuation_inputs IS 'Schema v2 compat; prefer public.trust_valuation_inputs.';
DROP VIEW IF EXISTS public.valuation_adjustments CASCADE;
CREATE VIEW public.valuation_adjustments WITH (security_invoker = true) AS SELECT * FROM public.trust_valuation_adjustments;
COMMENT ON VIEW public.valuation_adjustments IS 'Schema v2 compat; prefer public.trust_valuation_adjustments.';
DROP VIEW IF EXISTS public.valuation_history CASCADE;
CREATE VIEW public.valuation_history WITH (security_invoker = true) AS SELECT * FROM public.trust_valuation_history;
COMMENT ON VIEW public.valuation_history IS 'Schema v2 compat; prefer public.trust_valuation_history.';
DROP VIEW IF EXISTS public.ai_insight_runs CASCADE;
CREATE VIEW public.ai_insight_runs WITH (security_invoker = true) AS SELECT * FROM public.trust_ai_insight_runs;
COMMENT ON VIEW public.ai_insight_runs IS 'Schema v2 compat; prefer public.trust_ai_insight_runs.';
DROP VIEW IF EXISTS public.listing_verification_gates CASCADE;
CREATE VIEW public.listing_verification_gates WITH (security_invoker = true) AS SELECT * FROM public.trust_listing_gates;
COMMENT ON VIEW public.listing_verification_gates IS 'Schema v2 compat; prefer public.trust_listing_gates.';
DROP VIEW IF EXISTS public.founder_identity_verifications CASCADE;
CREATE VIEW public.founder_identity_verifications WITH (security_invoker = true) AS SELECT * FROM public.trust_founder_identity_checks;
COMMENT ON VIEW public.founder_identity_verifications IS 'Schema v2 compat; prefer public.trust_founder_identity_checks.';
DROP VIEW IF EXISTS public.business_email_verifications CASCADE;
CREATE VIEW public.business_email_verifications WITH (security_invoker = true) AS SELECT * FROM public.trust_business_email_verifications;
COMMENT ON VIEW public.business_email_verifications IS 'Schema v2 compat; prefer public.trust_business_email_verifications.';
DROP VIEW IF EXISTS public.business_registration_documents CASCADE;
CREATE VIEW public.business_registration_documents WITH (security_invoker = true) AS SELECT * FROM public.trust_registration_documents;
COMMENT ON VIEW public.business_registration_documents IS 'Schema v2 compat; prefer public.trust_registration_documents.';
DROP VIEW IF EXISTS public.listing_fraud_signals CASCADE;
CREATE VIEW public.listing_fraud_signals WITH (security_invoker = true) AS SELECT * FROM public.trust_fraud_signals;
COMMENT ON VIEW public.listing_fraud_signals IS 'Schema v2 compat; prefer public.trust_fraud_signals.';
DROP VIEW IF EXISTS public.admin_listing_reviews CASCADE;
CREATE VIEW public.admin_listing_reviews WITH (security_invoker = true) AS SELECT * FROM public.trust_admin_reviews;
COMMENT ON VIEW public.admin_listing_reviews IS 'Schema v2 compat; prefer public.trust_admin_reviews.';
DROP VIEW IF EXISTS public.platform_disposable_email_domains CASCADE;
CREATE VIEW public.platform_disposable_email_domains WITH (security_invoker = true) AS SELECT * FROM public.trust_disposable_email_domains;
COMMENT ON VIEW public.platform_disposable_email_domains IS 'Schema v2 compat; prefer public.trust_disposable_email_domains.';
DROP VIEW IF EXISTS public.identity_verification_sessions CASCADE;
CREATE VIEW public.identity_verification_sessions WITH (security_invoker = true) AS SELECT * FROM public.trust_identity_sessions;
COMMENT ON VIEW public.identity_verification_sessions IS 'Schema v2 compat; prefer public.trust_identity_sessions.';
DROP VIEW IF EXISTS public.verification_webhook_events CASCADE;
CREATE VIEW public.verification_webhook_events WITH (security_invoker = true) AS SELECT * FROM public.trust_webhook_events;
COMMENT ON VIEW public.verification_webhook_events IS 'Schema v2 compat; prefer public.trust_webhook_events.';
DROP VIEW IF EXISTS public.person_verification_profiles CASCADE;
CREATE VIEW public.person_verification_profiles WITH (security_invoker = true) AS SELECT * FROM public.trust_person_profiles;
COMMENT ON VIEW public.person_verification_profiles IS 'Schema v2 compat; prefer public.trust_person_profiles.';
DROP VIEW IF EXISTS public.verified_revenue_metrics CASCADE;
CREATE VIEW public.verified_revenue_metrics WITH (security_invoker = true) AS SELECT * FROM public.trust_verified_revenue_metrics;
COMMENT ON VIEW public.verified_revenue_metrics IS 'Schema v2 compat; prefer public.trust_verified_revenue_metrics.';

-- Core helpers point at physical marketplace table
CREATE OR REPLACE FUNCTION public.startup_owned_by_auth(p_startup_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_companies s
    WHERE s.id = p_startup_id AND s.founder_user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.startup_owned_by_auth_slug(p_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.marketplace_companies s
    WHERE s.slug = p_slug AND s.founder_user_id = auth.uid()
  );
$$;

-- Indexes (idempotent) on high-traffic marketplace tables
CREATE INDEX IF NOT EXISTS marketplace_companies_founder_user_id_idx
  ON public.marketplace_companies (founder_user_id);
CREATE INDEX IF NOT EXISTS marketplace_companies_listing_lifecycle_idx
  ON public.marketplace_companies (listing_lifecycle, visibility, status);
CREATE INDEX IF NOT EXISTS marketplace_accounts_auth_user_id_idx
  ON public.marketplace_accounts (auth_user_id);
CREATE INDEX IF NOT EXISTS marketplace_accounts_desk_role_idx
  ON public.marketplace_accounts (auth_user_id, desk_role);
CREATE INDEX IF NOT EXISTS marketplace_offers_startup_id_idx
  ON public.marketplace_offers (startup_id, status);
CREATE INDEX IF NOT EXISTS marketplace_offers_buyer_profile_id_idx
  ON public.marketplace_offers (buyer_profile_id);
CREATE INDEX IF NOT EXISTS marketplace_conversations_startup_id_idx
  ON public.marketplace_conversations (startup_id);
CREATE INDEX IF NOT EXISTS marketplace_messages_conversation_id_idx
  ON public.marketplace_messages (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS trust_integrations_startup_id_idx
  ON public.trust_integrations (startup_id);
CREATE INDEX IF NOT EXISTS trust_listing_gates_fraud_risk_idx
  ON public.trust_listing_gates (fraud_risk);

-- Table privileges follow renamed relations; do not widen anon grants here.

NOTIFY pgrst, 'reload schema';

COMMIT;
