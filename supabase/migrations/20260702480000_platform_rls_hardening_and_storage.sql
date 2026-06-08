-- Platform-wide RLS hardening + private storage buckets.
-- Default-deny: every public table has RLS enabled (forced); sensitive tables revoke client GRANTs.
-- Run after 20260702470000_verification_async_optional_supabase_baas.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- Helpers (SECURITY DEFINER, stable)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM public.users u
  WHERE u.auth_user_id = auth.uid()
    AND u.deleted_at IS NULL
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.user_owns_onboarding_session(p_session_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_onboarding_sessions os
    WHERE os.id = p_session_id
      AND os.user_id = public.current_user_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.storage_path_owned_by_auth(p_object_name text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_startup_id uuid;
BEGIN
  v_prefix := split_part(p_object_name, '/', 1);
  IF v_prefix IS NULL OR length(v_prefix) < 8 THEN
    RETURN false;
  END IF;
  BEGIN
    v_startup_id := v_prefix::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN false;
  END;
  RETURN public.startup_owned_by_auth(v_startup_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_owns_onboarding_session(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_path_owned_by_auth(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Enable + force RLS on all public tables
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

-- Compatibility views must respect caller RLS (Postgres 15+)
DO $$
DECLARE
  v record;
BEGIN
  FOR v IN
    SELECT c.relname AS viewname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'v'
      AND c.relname IN (
        'ownerr_network_users',
        'ownerr_network_profiles',
        'ownerr_network_onboarding_sessions',
        'ownerr_network_analytics_events'
      )
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER VIEW public.%I SET (security_invoker = true)',
        v.viewname
      );
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Revoke client access to secrets / worker tables (skip if table/view missing)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'platform_internal_config',
    'integration_credentials',
    'identity_launch_tokens',
    'sync_worker_launch_tokens',
    'business_email_launch_tokens',
    'founder_admin_secrets'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', t);
    END IF;
  END LOOP;

  IF to_regclass('public.users') IS NOT NULL THEN
    REVOKE SELECT ON TABLE public.users FROM anon;
  END IF;
  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    REVOKE SELECT ON TABLE public.user_profiles FROM anon;
  END IF;
  IF to_regclass('public.user_events') IS NOT NULL THEN
    REVOKE INSERT, UPDATE, DELETE ON TABLE public.user_events FROM anon;
  END IF;

  FOREACH t IN ARRAY ARRAY[
    'ownerr_network_users',
    'ownerr_network_profiles',
    'ownerr_network_onboarding_sessions'
  ]
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE SELECT ON TABLE public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- submissions (public viral feed — active rows only)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS submissions_select_public ON public.submissions;

CREATE POLICY submissions_select_public ON public.submissions
  FOR SELECT
  USING (status = 'active');

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS users_select_all ON public.users;
DROP POLICY IF EXISTS users_select_own ON public.users;
DROP POLICY IF EXISTS users_select_public_directory ON public.users;

CREATE POLICY users_select_own ON public.users
  FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY users_select_network_directory ON public.users
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      auth_user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.user_profiles p
        WHERE p.user_id = users.id
          AND p.onboarding_completed = true
          AND p.visibility IN ('public', 'network')
      )
    )
  );

-- users_update_own + users_admin_manage remain from prior migrations

-- ---------------------------------------------------------------------------
-- user_profiles
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS user_profiles_select ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_select_own ON public.user_profiles;
DROP POLICY IF EXISTS user_profiles_select_discover ON public.user_profiles;

CREATE POLICY user_profiles_select_own ON public.user_profiles
  FOR SELECT TO authenticated
  USING (user_id = public.current_user_id());

CREATE POLICY user_profiles_select_discover ON public.user_profiles
  FOR SELECT TO authenticated
  USING (
    onboarding_completed = true
    AND visibility IN ('public', 'network')
  );

-- user_profiles_own + user_profiles_admin_manage from prior migrations

-- ---------------------------------------------------------------------------
-- user_products
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS user_products_insert_own ON public.user_products;
DROP POLICY IF EXISTS user_products_update_own ON public.user_products;

CREATE POLICY user_products_insert_own ON public.user_products
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY user_products_update_own ON public.user_products
  FOR UPDATE TO authenticated
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- ---------------------------------------------------------------------------
-- user_events
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS user_events_insert ON public.user_events;

CREATE POLICY user_events_insert ON public.user_events
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = public.current_user_id()
    AND auth.uid() IS NOT NULL
  );

-- ---------------------------------------------------------------------------
-- user_onboarding_sessions
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS user_onboarding_insert_own ON public.user_onboarding_sessions;
DROP POLICY IF EXISTS user_onboarding_update_own ON public.user_onboarding_sessions;

CREATE POLICY user_onboarding_insert_own ON public.user_onboarding_sessions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY user_onboarding_update_own ON public.user_onboarding_sessions
  FOR UPDATE TO authenticated
  USING (user_id = public.current_user_id())
  WITH CHECK (user_id = public.current_user_id());

-- ---------------------------------------------------------------------------
-- user_answers
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS user_answers_select_own ON public.user_answers;
DROP POLICY IF EXISTS user_answers_insert_own ON public.user_answers;
DROP POLICY IF EXISTS user_answers_admin ON public.user_answers;

CREATE POLICY user_answers_select_own ON public.user_answers
  FOR SELECT TO authenticated
  USING (public.user_owns_onboarding_session(session_id));

CREATE POLICY user_answers_insert_own ON public.user_answers
  FOR INSERT TO authenticated
  WITH CHECK (public.user_owns_onboarding_session(session_id));

CREATE POLICY user_answers_admin ON public.user_answers
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- opportunities + responses
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS opportunities_select_published ON public.opportunities;
DROP POLICY IF EXISTS opportunities_manage_own ON public.opportunities;
DROP POLICY IF EXISTS opportunities_admin ON public.opportunities;

CREATE POLICY opportunities_select_published ON public.opportunities
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND visibility IN ('public', 'network')
  );

CREATE POLICY opportunities_manage_own ON public.opportunities
  FOR ALL TO authenticated
  USING (creator_user_id = public.current_user_id())
  WITH CHECK (creator_user_id = public.current_user_id());

CREATE POLICY opportunities_admin ON public.opportunities
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS opportunity_responses_select ON public.opportunity_responses;
DROP POLICY IF EXISTS opportunity_responses_insert_own ON public.opportunity_responses;
DROP POLICY IF EXISTS opportunity_responses_admin ON public.opportunity_responses;

CREATE POLICY opportunity_responses_select ON public.opportunity_responses
  FOR SELECT TO authenticated
  USING (
    responder_user_id = public.current_user_id()
    OR EXISTS (
      SELECT 1 FROM public.opportunities o
      WHERE o.id = opportunity_responses.opportunity_id
        AND o.creator_user_id = public.current_user_id()
    )
    OR public.is_platform_admin()
  );

CREATE POLICY opportunity_responses_insert_own ON public.opportunity_responses
  FOR INSERT TO authenticated
  WITH CHECK (responder_user_id = public.current_user_id());

CREATE POLICY opportunity_responses_admin ON public.opportunity_responses
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- listings + listing_interests (Ownerr OS listings, not marketplace startups)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS listings_select_public ON public.listings;
DROP POLICY IF EXISTS listings_select_anon ON public.listings;

CREATE POLICY listings_select_public ON public.listings
  FOR SELECT
  USING (visibility = 'public' AND status = 'published');

DROP POLICY IF EXISTS listing_interests_select ON public.listing_interests;
DROP POLICY IF EXISTS listing_interests_insert_own ON public.listing_interests;
DROP POLICY IF EXISTS listing_interests_admin ON public.listing_interests;

CREATE POLICY listing_interests_select ON public.listing_interests
  FOR SELECT TO authenticated
  USING (
    interested_user_id = public.current_user_id()
    OR EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.id = listing_interests.listing_id
        AND l.owner_user_id = public.current_user_id()
    )
    OR public.is_platform_admin()
  );

CREATE POLICY listing_interests_insert_own ON public.listing_interests
  FOR INSERT TO authenticated
  WITH CHECK (interested_user_id = public.current_user_id());

CREATE POLICY listing_interests_admin ON public.listing_interests
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- submission_referrals
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS submission_referrals_select ON public.submission_referrals;
DROP POLICY IF EXISTS submission_referrals_insert_own ON public.submission_referrals;
DROP POLICY IF EXISTS submission_referrals_admin ON public.submission_referrals;

CREATE POLICY submission_referrals_select ON public.submission_referrals
  FOR SELECT TO authenticated
  USING (
    user_id = public.current_user_id()
    OR public.is_platform_admin()
  );

CREATE POLICY submission_referrals_insert_own ON public.submission_referrals
  FOR INSERT TO authenticated
  WITH CHECK (user_id = public.current_user_id());

CREATE POLICY submission_referrals_admin ON public.submission_referrals
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- referral_events
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS referral_events_select_involved ON public.referral_events;
DROP POLICY IF EXISTS referral_events_admin ON public.referral_events;

CREATE POLICY referral_events_select_involved ON public.referral_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.referrals r
      WHERE r.id = referral_events.referral_id
        AND (
          r.referrer_user_id = public.current_user_id()
          OR r.referred_user_id = public.current_user_id()
        )
    )
    OR public.is_platform_admin()
  );

CREATE POLICY referral_events_admin ON public.referral_events
  FOR ALL TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Service-role-only token tables (explicit deny for JWT roles)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.identity_launch_tokens') IS NOT NULL THEN
    DROP POLICY IF EXISTS identity_launch_tokens_service ON public.identity_launch_tokens;
    CREATE POLICY identity_launch_tokens_service ON public.identity_launch_tokens
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF to_regclass('public.sync_worker_launch_tokens') IS NOT NULL THEN
    DROP POLICY IF EXISTS sync_worker_launch_tokens_service ON public.sync_worker_launch_tokens;
    CREATE POLICY sync_worker_launch_tokens_service ON public.sync_worker_launch_tokens
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;

  IF to_regclass('public.business_email_launch_tokens') IS NOT NULL THEN
    DROP POLICY IF EXISTS business_email_launch_tokens_service ON public.business_email_launch_tokens;
    CREATE POLICY business_email_launch_tokens_service ON public.business_email_launch_tokens
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- platform_internal_config + integration_credentials: no JWT policies (default deny)

-- ---------------------------------------------------------------------------
-- Storage buckets (private) + object policies
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'verification-documents',
  'verification-documents',
  false,
  26214400,
  ARRAY[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp',
    'image/tiff'
  ]::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

UPDATE storage.buckets
SET public = false
WHERE id IN ('listing-business-proofs', 'verification-documents');

-- listing-business-proofs
DROP POLICY IF EXISTS listing_proofs_storage_select ON storage.objects;
DROP POLICY IF EXISTS listing_proofs_storage_insert ON storage.objects;
DROP POLICY IF EXISTS listing_proofs_storage_update ON storage.objects;
DROP POLICY IF EXISTS listing_proofs_storage_delete ON storage.objects;
DROP POLICY IF EXISTS listing_proofs_storage_admin ON storage.objects;

CREATE POLICY listing_proofs_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'listing-business-proofs'
    AND (
      public.storage_path_owned_by_auth(name)
      OR public.is_platform_admin()
    )
  );

CREATE POLICY listing_proofs_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'listing-business-proofs'
    AND public.storage_path_owned_by_auth(name)
  );

CREATE POLICY listing_proofs_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'listing-business-proofs'
    AND public.storage_path_owned_by_auth(name)
  )
  WITH CHECK (
    bucket_id = 'listing-business-proofs'
    AND public.storage_path_owned_by_auth(name)
  );

CREATE POLICY listing_proofs_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'listing-business-proofs'
    AND (
      public.storage_path_owned_by_auth(name)
      OR public.is_platform_admin()
    )
  );

CREATE POLICY listing_proofs_storage_admin ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'listing-business-proofs' AND public.is_platform_admin())
  WITH CHECK (bucket_id = 'listing-business-proofs' AND public.is_platform_admin());

-- verification-documents (registration OCR paths: {startup_id}/...)
DROP POLICY IF EXISTS verification_docs_storage_select ON storage.objects;
DROP POLICY IF EXISTS verification_docs_storage_insert ON storage.objects;
DROP POLICY IF EXISTS verification_docs_storage_update ON storage.objects;
DROP POLICY IF EXISTS verification_docs_storage_delete ON storage.objects;
DROP POLICY IF EXISTS verification_docs_storage_admin ON storage.objects;
DROP POLICY IF EXISTS verification_docs_storage_service ON storage.objects;

CREATE POLICY verification_docs_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND (
      public.storage_path_owned_by_auth(name)
      OR public.is_platform_admin()
    )
  );

CREATE POLICY verification_docs_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND public.storage_path_owned_by_auth(name)
  );

CREATE POLICY verification_docs_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND public.storage_path_owned_by_auth(name)
  )
  WITH CHECK (
    bucket_id = 'verification-documents'
    AND public.storage_path_owned_by_auth(name)
  );

CREATE POLICY verification_docs_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'verification-documents'
    AND (
      public.storage_path_owned_by_auth(name)
      OR public.is_platform_admin()
    )
  );

CREATE POLICY verification_docs_storage_admin ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'verification-documents' AND public.is_platform_admin())
  WITH CHECK (bucket_id = 'verification-documents' AND public.is_platform_admin());

CREATE POLICY verification_docs_storage_service ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'verification-documents')
  WITH CHECK (bucket_id = 'verification-documents');

CREATE POLICY listing_proofs_storage_service ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'listing-business-proofs')
  WITH CHECK (bucket_id = 'listing-business-proofs');

NOTIFY pgrst, 'reload schema';

COMMIT;
