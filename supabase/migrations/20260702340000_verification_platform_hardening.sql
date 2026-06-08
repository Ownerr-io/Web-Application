-- Snapshot publish eligibility matches auto-publish (includes fraud).
-- Admin fraud queue matches post-hardening fraud_risk values.
-- Worker invoke helpers fail loudly when misconfigured.

BEGIN;

CREATE OR REPLACE FUNCTION public.listing_verification_snapshot(p_startup_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.startups%ROWTYPE;
  g public.listing_verification_gates%ROWTYPE;
  v_gates_pass boolean;
  v_fraud_blocks boolean;
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO s FROM public.startups WHERE id = p_startup_id;
  SELECT * INTO g FROM public.listing_verification_gates WHERE startup_id = p_startup_id;

  v_gates_pass := public.listing_mandatory_gates_pass(p_startup_id);
  v_fraud_blocks := public.listing_fraud_blocks_publish(g.fraud_risk);

  RETURN jsonb_build_object(
    'startup_id', s.id,
    'slug', s.slug,
    'listing_lifecycle', s.listing_lifecycle,
    'visibility', s.visibility,
    'gates', to_jsonb(g),
    'can_publish', v_gates_pass
      AND NOT v_fraud_blocks
      AND s.listing_lifecycle = 'verified',
    'publish_blocked_by_fraud', v_fraud_blocks
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_fraud_investigation_queue()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN jsonb_build_object(
    'high_risk_listings', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'startup_id', g.startup_id,
        'slug', s.slug,
        'title', s.title,
        'fraud_risk', g.fraud_risk,
        'listing_lifecycle', s.listing_lifecycle
      ) ORDER BY g.updated_at DESC), '[]'::jsonb)
      FROM public.listing_verification_gates g
      JOIN public.startups s ON s.id = g.startup_id
      WHERE g.fraud_risk IN ('high', 'high_risk', 'medium', 'warning')
    ),
    'open_fraud_reviews', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'startup_id', r.startup_id,
        'slug', s.slug,
        'status', r.status,
        'notes', r.notes,
        'created_at', r.created_at
      ) ORDER BY r.created_at DESC), '[]'::jsonb)
      FROM public.admin_listing_reviews r
      JOIN public.startups s ON s.id = r.startup_id
      WHERE r.review_type = 'fraud' AND r.status IN ('open', 'in_progress')
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.try_invoke_business_email_send(
  p_verification_id uuid,
  p_plain_token text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT value INTO v_url FROM public.platform_internal_config WHERE key = 'sync_worker_invoke_url';
  SELECT value INTO v_secret FROM public.platform_internal_config WHERE key = 'sync_worker_invoke_secret';
  IF v_url IS NULL OR v_secret IS NULL OR length(trim(v_url)) < 8 OR length(trim(v_secret)) < 8 THEN
    RAISE EXCEPTION
      'Verification worker not configured for business email. Set SYNC_WORKER_INVOKE_URL and SYNC_WORKER_CRON_SECRET, then npm run platform:set-integration-secrets.';
  END IF;
  PERFORM net.http_post(
    url := regexp_replace(v_url, '/v1/process-jobs$', '/v1/verification/send-business-email'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := jsonb_build_object(
      'verification_id', p_verification_id,
      'token', p_plain_token
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Business email dispatch failed: %', SQLERRM;
END;
$$;

CREATE OR REPLACE FUNCTION public.try_invoke_registration_ocr(p_document_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_url text;
  v_secret text;
BEGIN
  SELECT value INTO v_url FROM public.platform_internal_config WHERE key = 'sync_worker_invoke_url';
  SELECT value INTO v_secret FROM public.platform_internal_config WHERE key = 'sync_worker_invoke_secret';
  IF v_url IS NULL OR v_secret IS NULL OR length(trim(v_url)) < 8 OR length(trim(v_secret)) < 8 THEN
    RAISE EXCEPTION
      'Verification worker not configured for registration OCR. Set SYNC_WORKER_INVOKE_URL and SYNC_WORKER_CRON_SECRET, then npm run platform:set-integration-secrets.';
  END IF;
  PERFORM net.http_post(
    url := regexp_replace(v_url, '/v1/process-jobs$', '/v1/verification/process-registration'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body := jsonb_build_object('document_id', p_document_id)
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Registration OCR dispatch failed: %', SQLERRM;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
