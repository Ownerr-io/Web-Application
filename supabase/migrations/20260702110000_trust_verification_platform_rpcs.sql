-- Trust, Verification, Financial Intelligence & Valuation platform (RPCs + engines)
-- Requires: pgcrypto, schema migration 20260702100000

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Audit helper
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.append_audit_log(
  p_subject_type text,
  p_subject_id uuid,
  p_action text,
  p_before jsonb DEFAULT NULL,
  p_after jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1;
  INSERT INTO public.audit_logs (
    id, subject_type, subject_id, action, actor_user_id, actor_role, before_state, after_state
  ) VALUES (
    v_id, p_subject_type, p_subject_id, p_action, auth.uid(), v_role, p_before, p_after
  );
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.append_verification_event(
  p_startup_id uuid,
  p_event_type text,
  p_actor_type text,
  p_payload jsonb DEFAULT '{}'::jsonb,
  p_request_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.verification_events (
    id, request_id, startup_id, event_type, actor_user_id, actor_type, payload
  ) VALUES (
    v_id, p_request_id, p_startup_id, p_event_type, auth.uid(), p_actor_type, p_payload
  );
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_integration_sync(
  p_connection_id uuid,
  p_job_type text DEFAULT 'sync',
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.integration_sync_jobs (id, connection_id, job_type, payload)
  VALUES (v_id, p_connection_id, p_job_type, p_payload);
  INSERT INTO public.integration_syncs (connection_id, sync_type, status)
  VALUES (p_connection_id, COALESCE(p_payload->>'sync_type', 'full'), 'queued');
  RETURN v_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Connect / disconnect (API key path)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.integration_connect_api_key(
  p_startup_id uuid,
  p_provider_slug text,
  p_api_key text,
  p_external_account_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_provider public.verification_providers%ROWTYPE;
  v_conn public.integration_connections%ROWTYPE;
  v_key text;
  v_cipher bytea;
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized for startup';
  END IF;
  IF p_api_key IS NULL OR length(trim(p_api_key)) < 8 THEN
    RAISE EXCEPTION 'Invalid API key';
  END IF;

  SELECT * INTO v_provider FROM public.verification_providers
  WHERE slug = p_provider_slug AND is_enabled = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown provider';
  END IF;
  IF v_provider.auth_type <> 'api_key' THEN
    RAISE EXCEPTION 'Provider does not accept API keys';
  END IF;

  v_key := public.platform_encryption_key();
  v_cipher := pgp_sym_encrypt(p_api_key, v_key);

  INSERT INTO public.integration_connections (
    startup_id, provider_id, status, external_account_id, created_by, health_status
  ) VALUES (
    p_startup_id, v_provider.id, 'pending', p_external_account_id, auth.uid(), 'unknown'
  )
  ON CONFLICT (startup_id, provider_id) DO UPDATE SET
    status = 'pending',
    external_account_id = COALESCE(EXCLUDED.external_account_id, integration_connections.external_account_id),
    updated_at = now()
  RETURNING * INTO v_conn;

  INSERT INTO public.integration_credentials (connection_id, credential_type, secret_ciphertext)
  VALUES (v_conn.id, 'api_key', v_cipher)
  ON CONFLICT (connection_id) DO UPDATE SET
    secret_ciphertext = EXCLUDED.secret_ciphertext,
    rotated_at = now();

  PERFORM public.append_audit_log(
    'integration_connection', v_conn.id, 'connect_api_key', NULL,
    jsonb_build_object('provider', p_provider_slug, 'startup_id', p_startup_id)
  );
  PERFORM public.enqueue_integration_sync(v_conn.id, 'sync', jsonb_build_object('sync_type', 'full'));

  RETURN jsonb_build_object('connection_id', v_conn.id, 'status', v_conn.status);
END;
$$;

CREATE OR REPLACE FUNCTION public.integration_disconnect(p_connection_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conn public.integration_connections%ROWTYPE;
BEGIN
  SELECT * INTO v_conn FROM public.integration_connections WHERE id = p_connection_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Connection not found'; END IF;
  IF NOT public.startup_owned_by_auth(v_conn.startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.integration_connections
  SET status = 'disconnected', updated_at = now()
  WHERE id = p_connection_id;

  DELETE FROM public.integration_credentials WHERE connection_id = p_connection_id;

  PERFORM public.append_audit_log(
    'integration_connection', p_connection_id, 'disconnect', NULL, '{}'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.integration_request_sync(p_connection_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conn public.integration_connections%ROWTYPE;
BEGIN
  SELECT * INTO v_conn FROM public.integration_connections WHERE id = p_connection_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Connection not found'; END IF;
  IF NOT public.startup_owned_by_auth(v_conn.startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN public.enqueue_integration_sync(p_connection_id, 'sync', jsonb_build_object('sync_type', 'incremental'));
END;
$$;

-- OAuth placeholder completion (stores refresh bundle encrypted) — worker validates
CREATE OR REPLACE FUNCTION public.integration_complete_oauth(
  p_startup_id uuid,
  p_provider_slug text,
  p_token_bundle jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_provider public.verification_providers%ROWTYPE;
  v_conn public.integration_connections%ROWTYPE;
  v_key text;
  v_cipher bytea;
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  SELECT * INTO v_provider FROM public.verification_providers
  WHERE slug = p_provider_slug AND is_enabled = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown provider'; END IF;

  v_key := public.platform_encryption_key();
  v_cipher := pgp_sym_encrypt(p_token_bundle::text, v_key);

  INSERT INTO public.integration_connections (startup_id, provider_id, status, created_by)
  VALUES (p_startup_id, v_provider.id, 'connected', auth.uid())
  ON CONFLICT (startup_id, provider_id) DO UPDATE SET status = 'connected', updated_at = now()
  RETURNING * INTO v_conn;

  INSERT INTO public.integration_credentials (connection_id, credential_type, secret_ciphertext, expires_at)
  VALUES (
    v_conn.id,
    'oauth_bundle',
    v_cipher,
    (p_token_bundle->>'expires_at')::timestamptz
  )
  ON CONFLICT (connection_id) DO UPDATE SET
    secret_ciphertext = EXCLUDED.secret_ciphertext,
    expires_at = EXCLUDED.expires_at,
    rotated_at = now();

  PERFORM public.enqueue_integration_sync(v_conn.id, 'sync', jsonb_build_object('sync_type', 'full'));
  RETURN jsonb_build_object('connection_id', v_conn.id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Domain verification
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.domain_verification_begin(
  p_startup_id uuid,
  p_domain text,
  p_method text DEFAULT 'txt'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug text;
  v_token text;
  v_host text;
  v_expected text;
  v_id uuid;
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_method NOT IN ('txt', 'cname') THEN
    RAISE EXCEPTION 'Invalid method';
  END IF;

  SELECT slug INTO v_slug FROM public.startups WHERE id = p_startup_id;
  v_token := 'ownerr-verification=' || v_slug;

  IF p_method = 'txt' THEN
    v_host := p_domain;
    v_expected := v_token;
  ELSE
    v_host := '_ownerr.' || p_domain;
    v_expected := 'verify.ownerr.live';
  END IF;

  INSERT INTO public.domain_verification_challenges (
    startup_id, domain, method, expected_record, host, expires_at
  ) VALUES (
    p_startup_id, lower(trim(p_domain)), p_method, v_expected, v_host, now() + interval '7 days'
  )
  ON CONFLICT (startup_id, method) DO UPDATE SET
    domain = EXCLUDED.domain,
    expected_record = EXCLUDED.expected_record,
    host = EXCLUDED.host,
    status = 'pending',
    verified_at = NULL,
    expires_at = EXCLUDED.expires_at
  RETURNING id INTO v_id;

  INSERT INTO public.integration_connections (startup_id, provider_id, status, created_by)
  SELECT p_startup_id, vp.id, 'connected', auth.uid()
  FROM public.verification_providers vp WHERE vp.slug = 'domain'
  ON CONFLICT (startup_id, provider_id) DO UPDATE SET updated_at = now();

  PERFORM public.enqueue_integration_sync(
    (SELECT ic.id FROM public.integration_connections ic
     JOIN public.verification_providers vp ON vp.id = ic.provider_id
     WHERE ic.startup_id = p_startup_id AND vp.slug = 'domain'
     LIMIT 1),
    'domain_check',
    jsonb_build_object(
      'challenge_id', v_id,
      'host', v_host,
      'expected_record', v_expected,
      'method', p_method,
      'sync_type', 'domain_check'
    )
  );

  PERFORM public.append_verification_event(
    p_startup_id, 'domain_challenge_created', 'user',
    jsonb_build_object('domain', p_domain, 'method', p_method)
  );

  RETURN jsonb_build_object(
    'challenge_id', v_id,
    'host', v_host,
    'expected_record', v_expected,
    'method', p_method
  );
END;
$$;

-- Worker calls with service role after DNS check
CREATE OR REPLACE FUNCTION public.domain_verification_apply_result(
  p_challenge_id uuid,
  p_pass boolean,
  p_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ch public.domain_verification_challenges%ROWTYPE;
  v_provider_id uuid;
BEGIN
  SELECT * INTO v_ch FROM public.domain_verification_challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Challenge not found'; END IF;

  UPDATE public.domain_verification_challenges
  SET status = CASE WHEN p_pass THEN 'verified' ELSE 'failed' END,
      verified_at = CASE WHEN p_pass THEN now() ELSE NULL END
  WHERE id = p_challenge_id;

  SELECT id INTO v_provider_id FROM public.verification_providers WHERE slug = 'domain';

  INSERT INTO public.verification_results (
    startup_id, provider_id, dimension, status, summary, evidence_ref, valid_from, valid_until
  ) VALUES (
    v_ch.startup_id,
    v_provider_id,
    'domain',
    CASE WHEN p_pass THEN 'pass' ELSE 'fail' END,
    jsonb_build_object('domain', v_ch.domain, 'method', v_ch.method),
    p_evidence,
    CASE WHEN p_pass THEN now() ELSE NULL END,
    CASE WHEN p_pass THEN now() + interval '365 days' ELSE NULL END
  );

  PERFORM public.recompute_startup_trust(v_ch.startup_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- Trust engine
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trust_level_from_score(p_score numeric, p_critical_pass boolean)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_score >= 85 AND p_critical_pass THEN RETURN 'elite'; END IF;
  IF p_score >= 65 THEN RETURN 'trusted'; END IF;
  IF p_score >= 45 THEN RETURN 'verified'; END IF;
  IF p_score >= 20 THEN RETURN 'basic'; END IF;
  RETURN 'unverified';
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_startup_trust(p_startup_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score numeric := 0;
  v_level text;
  v_breakdown jsonb := '{}'::jsonb;
  v_domain_pass boolean := false;
  v_rev_pass boolean := false;
  v_traffic_pass boolean := false;
  v_acct_pass boolean := false;
  v_bank_pass boolean := false;
  v_fraud numeric := 0;
  v_profile_pts numeric := 0;
  v_consistency_pts numeric := 0;
  v_age_pts numeric := 0;
  v_founded integer;
  v_rev numeric;
  v_acct numeric;
  v_old public.trust_scores%ROWTYPE;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.verification_results r
    WHERE r.startup_id = p_startup_id AND r.dimension = 'domain'
      AND r.status = 'pass' AND (r.valid_until IS NULL OR r.valid_until > now())
  ) INTO v_domain_pass;

  SELECT EXISTS (
    SELECT 1 FROM public.verification_results r
    WHERE r.startup_id = p_startup_id AND r.dimension = 'revenue'
      AND r.status = 'pass' AND (r.valid_until IS NULL OR r.valid_until > now())
  ) INTO v_rev_pass;

  SELECT EXISTS (
    SELECT 1 FROM public.verification_results r
    WHERE r.startup_id = p_startup_id AND r.dimension = 'traffic'
      AND r.status = 'pass' AND (r.valid_until IS NULL OR r.valid_until > now())
  ) INTO v_traffic_pass;

  SELECT EXISTS (
    SELECT 1 FROM public.verification_results r
    WHERE r.startup_id = p_startup_id AND r.dimension = 'accounting'
      AND r.status = 'pass' AND (r.valid_until IS NULL OR r.valid_until > now())
  ) INTO v_acct_pass;

  SELECT EXISTS (
    SELECT 1 FROM public.verification_results r
    WHERE r.startup_id = p_startup_id AND r.dimension = 'banking'
      AND r.status = 'pass' AND (r.valid_until IS NULL OR r.valid_until > now())
  ) INTO v_bank_pass;

  IF v_domain_pass THEN v_score := v_score + 10; END IF;
  IF v_rev_pass THEN v_score := v_score + 25; END IF;
  IF v_traffic_pass THEN v_score := v_score + 15; END IF;
  IF v_acct_pass THEN v_score := v_score + 15; END IF;
  IF v_bank_pass THEN v_score := v_score + 15; END IF;

  SELECT founded_year INTO v_founded FROM public.startups WHERE id = p_startup_id;
  IF v_founded IS NOT NULL AND v_founded <= extract(year from now())::int - 2 THEN
    v_age_pts := 5;
  ELSIF v_founded IS NOT NULL THEN
    v_age_pts := 2;
  END IF;
  v_score := v_score + v_age_pts;

  SELECT COALESCE(up.profile_completion_score, 0) INTO v_profile_pts
  FROM public.startups s
  LEFT JOIN public.users u ON u.auth_user_id = s.founder_user_id
  LEFT JOIN public.user_profiles up ON up.user_id = u.id
  WHERE s.id = p_startup_id;
  v_profile_pts := LEAST(10, v_profile_pts / 10.0);
  v_score := v_score + v_profile_pts;

  SELECT COALESCE(SUM(mrr), 0) INTO v_rev FROM public.financial_metrics
  WHERE startup_id = p_startup_id AND period_start >= (current_date - interval '90 days')::date;

  SELECT COALESCE(SUM(revenue), 0) INTO v_acct FROM public.accounting_metrics
  WHERE startup_id = p_startup_id AND period_start >= (current_date - interval '90 days')::date;

  IF v_rev > 0 AND v_acct > 0 THEN
    IF abs(v_rev - v_acct) / GREATEST(v_rev, v_acct) <= 0.25 THEN
      v_consistency_pts := 10;
    ELSE
      v_fraud := v_fraud + 15;
    END IF;
  END IF;
  v_score := v_score + v_consistency_pts - v_fraud;
  v_score := GREATEST(0, LEAST(100, v_score));

  v_level := public.trust_level_from_score(v_score, v_domain_pass AND v_rev_pass);

  v_breakdown := jsonb_build_object(
    'domain', CASE WHEN v_domain_pass THEN 10 ELSE 0 END,
    'revenue', CASE WHEN v_rev_pass THEN 25 ELSE 0 END,
    'traffic', CASE WHEN v_traffic_pass THEN 15 ELSE 0 END,
    'accounting', CASE WHEN v_acct_pass THEN 15 ELSE 0 END,
    'banking', CASE WHEN v_bank_pass THEN 15 ELSE 0 END,
    'profile', v_profile_pts,
    'business_age', v_age_pts,
    'consistency', v_consistency_pts,
    'fraud_penalty', v_fraud
  );

  UPDATE public.trust_signals SET active = false WHERE startup_id = p_startup_id;

  INSERT INTO public.trust_signals (startup_id, signal_key, weight, value, source, detail)
  SELECT p_startup_id, key, (value::numeric), (value::numeric), 'rule', jsonb_build_object('bucket', key)
  FROM jsonb_each_text(v_breakdown) AS t(key, value);

  SELECT * INTO v_old FROM public.trust_scores WHERE startup_id = p_startup_id;

  INSERT INTO public.trust_scores (startup_id, score, level, breakdown, computed_at, version)
  VALUES (p_startup_id, v_score, v_level, v_breakdown, now(), 1)
  ON CONFLICT (startup_id) DO UPDATE SET
    score = EXCLUDED.score,
    level = EXCLUDED.level,
    breakdown = EXCLUDED.breakdown,
    computed_at = EXCLUDED.computed_at,
    version = public.trust_scores.version + 1;

  IF v_old.startup_id IS NULL OR v_old.score <> v_score OR v_old.level <> v_level THEN
    INSERT INTO public.trust_score_history (startup_id, score, level, breakdown, trigger)
    VALUES (p_startup_id, v_score, v_level, v_breakdown, 'recompute');
  END IF;

  UPDATE public.startups SET verified = v_rev_pass WHERE id = p_startup_id;

  RETURN jsonb_build_object('score', v_score, 'level', v_level, 'breakdown', v_breakdown);
END;
$$;

-- ---------------------------------------------------------------------------
-- Valuation engine
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_valuation_report(p_startup_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_report_id uuid := gen_random_uuid();
  v_trust numeric;
  v_mrr numeric := 0;
  v_arr numeric := 0;
  v_growth numeric := 0;
  v_traffic bigint := 0;
  v_margin numeric := 0;
  v_industry text;
  v_age_years numeric := 1;
  v_base_mult numeric := 4;
  v_low numeric;
  v_mid numeric;
  v_high numeric;
  v_conf text := 'low';
  v_points integer := 0;
  v_founded integer;
BEGIN
  IF NOT public.startup_owned_by_auth(p_startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT score INTO v_trust FROM public.trust_scores WHERE startup_id = p_startup_id;
  v_trust := COALESCE(v_trust, 0);

  SELECT COALESCE(mrr, 0), COALESCE(arr, mrr * 12, 0)
  INTO v_mrr, v_arr
  FROM public.financial_metrics
  WHERE startup_id = p_startup_id
  ORDER BY period_start DESC
  LIMIT 1;

  IF NOT FOUND THEN
    v_mrr := 0;
    v_arr := 0;
  END IF;

  IF COALESCE(v_mrr, 0) = 0 THEN
    SELECT COALESCE(annual_revenue / 12.0, 0), COALESCE(annual_revenue, 0), COALESCE(growth_rate, 0), industry, founded_year
    INTO v_mrr, v_arr, v_growth, v_industry, v_founded
    FROM public.startups WHERE id = p_startup_id;

    IF NOT FOUND THEN
      v_mrr := 0;
      v_arr := 0;
      v_growth := 0;
    END IF;
  ELSE
    SELECT COALESCE(growth_rate, 0), industry, founded_year
    INTO v_growth, v_industry, v_founded FROM public.startups WHERE id = p_startup_id;

    IF NOT FOUND THEN
      v_growth := 0;
    END IF;
  END IF;

  v_mrr := COALESCE(v_mrr, 0);
  v_arr := COALESCE(v_arr, 0);
  v_growth := COALESCE(v_growth, 0);

  IF v_founded IS NOT NULL THEN
    v_age_years := GREATEST(0.5, extract(year from now()) - v_founded);
  END IF;

  SELECT COALESCE(SUM(sessions), 0) INTO v_traffic FROM public.traffic_metrics
  WHERE startup_id = p_startup_id AND period_start >= (current_date - interval '30 days')::date;

  SELECT CASE WHEN COALESCE(SUM(revenue), 0) > 0
    THEN COALESCE(SUM(net_income), 0) / NULLIF(SUM(revenue), 0) ELSE 0 END
  INTO v_margin
  FROM public.accounting_metrics
  WHERE startup_id = p_startup_id AND period_start >= (current_date - interval '365 days')::date;

  v_margin := COALESCE(v_margin, 0);

  v_base_mult := CASE
    WHEN v_industry ILIKE '%SaaS%' THEN 5.5
    WHEN v_industry ILIKE '%AI%' THEN 6
    WHEN v_industry ILIKE '%Mobile%' THEN 4
    ELSE 4
  END;

  v_base_mult := v_base_mult + LEAST(2, GREATEST(-1, v_growth / 20.0));
  v_base_mult := v_base_mult + LEAST(1.5, v_margin * 2);
  v_base_mult := v_base_mult + LEAST(1, ln(GREATEST(v_traffic, 1) + 1) / 10.0);
  v_base_mult := v_base_mult * (0.85 + v_trust / 200.0);

  v_mid := GREATEST(0, COALESCE(v_arr, v_mrr * 12)) * v_base_mult;
  v_low := v_mid * 0.75;
  v_high := v_mid * 1.35;

  IF v_mrr > 0 THEN v_points := v_points + 1; END IF;
  IF v_traffic > 0 THEN v_points := v_points + 1; END IF;
  IF v_margin <> 0 THEN v_points := v_points + 1; END IF;
  IF v_trust >= 45 THEN v_points := v_points + 1; END IF;
  IF EXISTS (SELECT 1 FROM public.verification_results WHERE startup_id = p_startup_id AND status = 'pass') THEN
    v_points := v_points + 1;
  END IF;

  v_conf := CASE
    WHEN v_points >= 4 AND v_trust >= 65 THEN 'high'
    WHEN v_points >= 2 THEN 'medium'
    ELSE 'low'
  END;

  UPDATE public.valuation_reports SET status = 'superseded'
  WHERE startup_id = p_startup_id AND status = 'published';

  INSERT INTO public.valuation_reports (
    id, startup_id, status, low_amount, expected_amount, high_amount,
    confidence, trust_score_at_compute, explanation, model_version
  ) VALUES (
    v_report_id, p_startup_id, 'draft', round(v_low, 2), round(v_mid, 2), round(v_high, 2),
    v_conf, v_trust,
    jsonb_build_object(
      'multiples', jsonb_build_object('applied', v_base_mult),
      'inputs', jsonb_build_object(
        'mrr', v_mrr, 'arr', v_arr, 'growth_rate', v_growth,
        'traffic_sessions_30d', v_traffic, 'profit_margin_proxy', v_margin,
        'business_age_years', v_age_years
      ),
      'factors', jsonb_build_array(
        'ARR/MRR from financial_metrics or startup record',
        'Growth and margin adjustments',
        'Traffic and trust weighting'
      )
    ),
    'ownerr-v1'
  );

  INSERT INTO public.valuation_inputs (report_id, input_key, input_value, source)
  VALUES
    (v_report_id, 'mrr', to_jsonb(v_mrr), 'metric'),
    (v_report_id, 'arr', to_jsonb(v_arr), 'metric'),
    (v_report_id, 'trust_score', to_jsonb(v_trust), 'computed');

  INSERT INTO public.valuation_adjustments (report_id, adjustment_key, delta_pct, reason, rule_id)
  VALUES
    (v_report_id, 'growth', v_growth, 'Growth rate adjustment', 'growth-v1'),
    (v_report_id, 'trust', v_trust, 'Trust score multiplier', 'trust-v1');

  INSERT INTO public.valuation_history (startup_id, report_id, snapshot)
  VALUES (
    p_startup_id, v_report_id,
    jsonb_build_object('low', v_low, 'expected', v_mid, 'high', v_high, 'confidence', v_conf)
  );

  RETURN v_report_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_valuation_report(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_r public.valuation_reports%ROWTYPE;
BEGIN
  SELECT * INTO v_r FROM public.valuation_reports WHERE id = p_report_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Report not found'; END IF;
  IF NOT public.startup_owned_by_auth(v_r.startup_id) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.valuation_reports SET status = 'published', published_at = now() WHERE id = p_report_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Public read helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.startup_trust_public(p_startup_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'score', ts.score,
    'level', ts.level,
    'computed_at', ts.computed_at,
    'breakdown', ts.breakdown
  )
  FROM public.startups s
  LEFT JOIN public.trust_scores ts ON ts.startup_id = s.id
  WHERE s.slug = p_startup_slug
    AND s.visibility = 'public' AND s.status = 'published';
$$;

CREATE OR REPLACE FUNCTION public.startup_verification_summary(p_startup_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'dimensions', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'dimension', r.dimension,
          'status', r.status,
          'computed_at', r.computed_at,
          'summary', r.summary
        ) ORDER BY r.computed_at DESC)
        FROM (
          SELECT DISTINCT ON (vr.dimension) vr.id, vr.startup_id, vr.provider_id,
            vr.connection_id, vr.dimension, vr.status, vr.summary, vr.evidence_ref,
            vr.valid_from, vr.valid_until, vr.computed_at, vr.superseded_by
          FROM public.verification_results vr
          JOIN public.startups st ON st.id = vr.startup_id
          WHERE st.slug = p_startup_slug
          ORDER BY vr.dimension, vr.computed_at DESC
        ) r
      ),
      '[]'::jsonb
    ),
    'connections', COALESCE(
      (
        SELECT jsonb_agg(jsonb_build_object(
          'provider', vp.slug,
          'status', ic.status,
          'health_status', ic.health_status,
          'last_sync_at', ic.last_sync_at,
          'last_error', ic.last_error
        ))
        FROM public.integration_connections ic
        JOIN public.verification_providers vp ON vp.id = ic.provider_id
        JOIN public.startups st ON st.id = ic.startup_id
        WHERE st.slug = p_startup_slug AND vp.slug <> 'domain'
      ),
      '[]'::jsonb
    )
  );
$$;

-- Admin overrides
CREATE OR REPLACE FUNCTION public.admin_override_trust(
  p_startup_id uuid,
  p_score numeric,
  p_level text,
  p_reason text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  INSERT INTO public.trust_scores (startup_id, score, level, breakdown, computed_at)
  VALUES (
    p_startup_id, p_score, p_level,
    jsonb_build_object('override', true, 'reason', p_reason), now()
  )
  ON CONFLICT (startup_id) DO UPDATE SET
    score = EXCLUDED.score, level = EXCLUDED.level, breakdown = EXCLUDED.breakdown, computed_at = now();
  INSERT INTO public.trust_score_history (startup_id, score, level, breakdown, trigger)
  VALUES (p_startup_id, p_score, p_level, jsonb_build_object('reason', p_reason), 'admin_override');
  PERFORM public.append_audit_log('startup', p_startup_id, 'admin_override_trust', NULL,
    jsonb_build_object('score', p_score, 'level', p_level, 'reason', p_reason));
END;
$$;

-- Admin intelligence extension
CREATE OR REPLACE FUNCTION public.admin_verification_ops_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN RAISE EXCEPTION 'Admin only'; END IF;
  RETURN jsonb_build_object(
    'pending_requests', (SELECT count(*) FROM public.verification_requests WHERE status = 'pending'),
    'failed_syncs_24h', (
      SELECT count(*) FROM public.integration_syncs
      WHERE status = 'failed' AND created_at > now() - interval '24 hours'
    ),
    'connections_error', (SELECT count(*) FROM public.integration_connections WHERE status = 'error'),
    'avg_trust_score', (SELECT round(avg(score), 2) FROM public.trust_scores)
  );
END;
$$;

-- Worker: claim sync job (service role expected)
CREATE OR REPLACE FUNCTION public.claim_integration_sync_job(p_worker_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.integration_sync_jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_job
  FROM public.integration_sync_jobs
  WHERE status = 'pending' AND run_after <= now()
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  UPDATE public.integration_sync_jobs
  SET status = 'claimed', updated_at = now(), payload = payload || jsonb_build_object('worker', p_worker_id)
  WHERE id = v_job.id;

  RETURN jsonb_build_object(
    'job_id', v_job.id,
    'connection_id', v_job.connection_id,
    'job_type', v_job.job_type,
    'payload', v_job.payload
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_integration_sync_job(
  p_job_id uuid,
  p_success boolean,
  p_records_written integer DEFAULT 0,
  p_error text DEFAULT NULL,
  p_sync_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.integration_sync_jobs%ROWTYPE;
BEGIN
  SELECT * INTO v_job FROM public.integration_sync_jobs WHERE id = p_job_id;
  IF NOT FOUND THEN RETURN; END IF;

  UPDATE public.integration_sync_jobs
  SET status = CASE WHEN p_success THEN 'completed' ELSE 'failed' END,
      attempts = attempts + 1,
      last_error = p_error,
      updated_at = now()
  WHERE id = p_job_id;

  UPDATE public.integration_syncs isync
  SET status = CASE WHEN p_success THEN 'succeeded' ELSE 'failed' END,
      finished_at = now(),
      records_written = p_records_written,
      error_message = p_error,
      payload = p_sync_payload
  FROM (
    SELECT isync_inner.id FROM public.integration_syncs isync_inner
    WHERE isync_inner.connection_id = v_job.connection_id
      AND isync_inner.status IN ('queued', 'running')
    ORDER BY isync_inner.created_at DESC
    LIMIT 1
  ) latest
  WHERE isync.id = latest.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.worker_get_connection_secrets(p_connection_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_cipher bytea;
  v_key text;
  v_plain text;
  v_slug text;
BEGIN
  SELECT ic.secret_ciphertext, vp.slug INTO v_cipher, v_slug
  FROM public.integration_credentials ic
  JOIN public.integration_connections c ON c.id = ic.connection_id
  JOIN public.verification_providers vp ON vp.id = c.provider_id
  WHERE ic.connection_id = p_connection_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'no_credentials');
  END IF;

  v_key := public.platform_encryption_key();
  v_plain := pgp_sym_decrypt(v_cipher, v_key);

  RETURN jsonb_build_object('provider_slug', v_slug, 'secret', v_plain);
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.integration_connect_api_key(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.integration_disconnect(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.integration_request_sync(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.integration_complete_oauth(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.domain_verification_begin(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_valuation_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_valuation_report(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.startup_trust_public(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.startup_verification_summary(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.recompute_startup_trust(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_override_trust(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_verification_ops_summary() TO authenticated;

GRANT EXECUTE ON FUNCTION public.claim_integration_sync_job(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_integration_sync_job(uuid, boolean, integer, text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.worker_get_connection_secrets(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.domain_verification_apply_result(uuid, boolean, jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
